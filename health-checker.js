const http = require('http')
const fs = require('fs').promises
const { exec } = require('child_process')
const { promisify } = require('util')

const execAsync = promisify(exec)

const HEALTH_CHECK_INTERVAL = 30000 // 30 seconds
const MAX_UNHEALTHY_CHECKS = 3
const MAIN_APP_PORT = 3001 // Health endpoint port
const LOG_FILE = './health-check.log'

let unhealthyCount = 0

const log = async (message) => {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] ${message}\n`
  console.log(message)

  try {
    await fs.appendFile(LOG_FILE, logMessage)
  } catch (error) {
    console.error('Failed to write log:', error)
  }
}

const checkMainAppHealth = async () => {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${MAIN_APP_PORT}/health`, { timeout: 5000 }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const healthData = JSON.parse(data)
          resolve({ healthy: res.statusCode === 200, data: healthData })
        } catch (error) {
          resolve({ healthy: false, error: 'Invalid JSON response' })
        }
      })
    })

    req.on('error', (error) => {
      resolve({ healthy: false, error: error.message })
    })

    req.on('timeout', () => {
      req.destroy()
      resolve({ healthy: false, error: 'Health check timeout' })
    })
  })
}

const checkPM2Process = async () => {
  try {
    const { stdout } = await execAsync('pm2 jlist')
    const processes = JSON.parse(stdout)
    const quoteBot = processes.find(p => p.name === 'QuoteBot')

    if (!quoteBot) {
      return { healthy: false, error: 'QuoteBot process not found in PM2' }
    }

    if (quoteBot.pm2_env.status !== 'online') {
      return { healthy: false, error: `Process status: ${quoteBot.pm2_env.status}` }
    }

    // Check if process is stuck (no CPU activity for too long)
    const cpuUsage = quoteBot.monit.cpu
    if (cpuUsage === 0) {
      return { healthy: false, error: 'Process appears to be stuck (0% CPU for extended period)' }
    }

    return {
      healthy: true,
      data: {
        status: quoteBot.pm2_env.status,
        uptime: quoteBot.pm2_env.pm_uptime,
        restarts: quoteBot.pm2_env.restart_time,
        memory: quoteBot.monit.memory,
        cpu: quoteBot.monit.cpu
      }
    }
  } catch (error) {
    return { healthy: false, error: `PM2 check failed: ${error.message}` }
  }
}

const restartApplication = async () => {
  try {
    await log('🔄 Attempting to restart QuoteBot via PM2...')
    await execAsync('pm2 restart QuoteBot --wait-ready')
    await log('✅ QuoteBot restart completed')
    unhealthyCount = 0 // Reset counter after restart
  } catch (error) {
    await log(`❌ Failed to restart QuoteBot: ${error.message}`)
  }
}

const performHealthCheck = async () => {
  try {
    // Check PM2 process status
    const pm2Status = await checkPM2Process()
    if (!pm2Status.healthy) {
      await log(`❌ PM2 Health Check Failed: ${pm2Status.error}`)
      unhealthyCount++
    } else {
      // Check application health endpoint
      const appHealth = await checkMainAppHealth()
      if (!appHealth.healthy) {
        await log(`❌ App Health Check Failed: ${appHealth.error}`)
        unhealthyCount++
      } else {
        const timeSinceActivity = appHealth.data.timeSinceLastActivity
        if (timeSinceActivity > 120000) { // 2 minutes
          await log(`⚠️  App appears inactive: ${Math.round(timeSinceActivity / 1000)}s since last activity`)
          unhealthyCount++
        } else {
          // All checks passed
          if (unhealthyCount > 0) {
            await log('✅ Health restored')
          }
          unhealthyCount = 0
        }
      }
    }

    // Restart if too many failed checks
    if (unhealthyCount >= MAX_UNHEALTHY_CHECKS) {
      await log(`🚨 Application unhealthy for ${unhealthyCount} consecutive checks - restarting`)
      await restartApplication()
    }

  } catch (error) {
    await log(`❌ Health check error: ${error.message}`)
    unhealthyCount++
  }
}

// Start health checker
const startHealthChecker = async () => {
  await log('🏥 Health Checker started')

  // Perform initial check
  await performHealthCheck()

  // Schedule regular checks
  setInterval(performHealthCheck, HEALTH_CHECK_INTERVAL)

  // Handle process termination
  process.on('SIGINT', async () => {
    await log('🛑 Health Checker stopping...')
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    await log('🛑 Health Checker terminated')
    process.exit(0)
  })
}

// Handle uncaught errors
process.on('uncaughtException', async (error) => {
  await log(`💥 Health Checker crashed: ${error.message}`)
  process.exit(1)
})

startHealthChecker()

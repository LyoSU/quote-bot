const http = require('http')

let lastActivity = Date.now()
let isHealthy = true
let healthCheckReasons = []

// Update activity tracker
const updateActivity = () => {
  lastActivity = Date.now()
}

// Health monitoring
const checkHealth = () => {
  const now = Date.now()
  const timeSinceActivity = now - lastActivity
  const maxInactiveTime = 60000 // 1 minute

  healthCheckReasons = []

  // Check if bot is responsive
  if (timeSinceActivity > maxInactiveTime) {
    isHealthy = false
    healthCheckReasons.push(`No activity for ${Math.round(timeSinceActivity / 1000)}s`)
  } else {
    isHealthy = true
  }

  // Check memory usage
  const memUsage = process.memoryUsage()
  const memUsageMB = memUsage.heapUsed / 1024 / 1024
  if (memUsageMB > 4000) { // 4GB
    isHealthy = false
    healthCheckReasons.push(`High memory usage: ${Math.round(memUsageMB)}MB`)
  }
}

// Health check endpoint
const createHealthServer = () => {
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      const healthStatus = {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        lastActivity: new Date(lastActivity).toISOString(),
        timeSinceLastActivity: Date.now() - lastActivity,
        memory: process.memoryUsage(),
        reasons: healthCheckReasons
      }

      res.writeHead(isHealthy ? 200 : 503, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(healthStatus, null, 2))
    } else {
      res.writeHead(404)
      res.end()
    }
  })

  const PORT = process.env.HEALTH_CHECK_PORT || 3001
  server.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] Health check server running on port ${PORT}`)
  })

  // Check health every 10 seconds
  const healthInterval = setInterval(checkHealth, 10000)

  // Cleanup on process termination
  const cleanup = () => {
    clearInterval(healthInterval)
    server.close()
  }

  process.on('SIGTERM', cleanup)
  process.on('SIGINT', cleanup)

  return server
}

module.exports = {
  updateActivity,
  createHealthServer,
  getHealthStatus: () => ({ isHealthy, reasons: healthCheckReasons })
}

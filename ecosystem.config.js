module.exports = {
  apps: [
    {
      name: 'QuoteBot',
      script: './index.js',
      max_memory_restart: '3000M',
      watch: false, // Disable for production
      max_restarts: 5,
      min_uptime: '30s',
      restart_delay: 2000,
      kill_timeout: 3000,
      node_args: '--max-old-space-size=2048',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'QuoteBot-HealthChecker',
      script: './health-checker.js',
      instances: 1,
      exec_mode: 'fork',
      restart_delay: 5000,
      max_restarts: 5,
      min_uptime: '5s',
      watch: false,
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
}

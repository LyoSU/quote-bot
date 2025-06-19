module.exports = {
  apps: [
    {
      name: 'QuoteBot',
      script: './index.js',
      max_memory_restart: '5000M',
      watch: true,
      ignore_watch: ['node_modules', 'assets', 'helpers/tdlib/data/db', 'health-check.log'],
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      kill_timeout: 5000,
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

module.exports = {
  apps: [
    {
      name: 'updates-collector',
      script: './updates-collector.js',
      instances: 1, // Only one collector needed
      exec_mode: 'fork',
      max_memory_restart: '1000M',
      watch: false,
      max_restarts: 10,
      min_uptime: '30s',
      restart_delay: 2000,
      kill_timeout: 5000,
      node_args: '--max-old-space-size=1024',
      env: {
        NODE_ENV: 'development',
        REDIS_HOST: 'localhost',
        REDIS_PORT: '6379'
      },
      env_production: {
        NODE_ENV: 'production',
        REDIS_HOST: 'localhost',
        REDIS_PORT: '6379'
      }
    },
    {
      name: 'updates-workers',
      script: './updates-worker.js',
      instances: 4, // Optimize for 1000 RPS average load
      exec_mode: 'cluster', // Can use cluster for CPU intensive tasks
      max_memory_restart: '2000M',
      watch: false,
      max_restarts: 5,
      min_uptime: '30s',
      restart_delay: 3000,
      kill_timeout: 10000,
      node_args: '--max-old-space-size=1536',
      env: {
        NODE_ENV: 'development',
        REDIS_HOST: 'localhost',
        REDIS_PORT: '6379'
      },
      env_production: {
        NODE_ENV: 'production',
        REDIS_HOST: 'localhost',
        REDIS_PORT: '6379'
      }
    }
  ]
}

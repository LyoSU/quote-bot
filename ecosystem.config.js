// IMPORTANT: WORKER_QUEUES must equal the number of worker instances. The
// collector shards updates across Redis queues by (chatId % WORKER_QUEUES);
// each worker drains exactly one queue determined by pm_id % WORKER_QUEUES.
// If counts diverge (e.g. WORKER_QUEUES=3 but instances=4), some queues end
// up unread and updates wedge there indefinitely.
const WORKER_QUEUES = '4'

module.exports = {
  apps: [
    {
      name: 'quotly-poller',
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
        REDIS_PORT: '6379',
        WORKER_QUEUES
      },
      env_production: {
        NODE_ENV: 'production',
        REDIS_HOST: 'localhost',
        REDIS_PORT: '6379',
        WORKER_QUEUES,
        // TDLib uses the SAME bot token as Telegraf polling — running both
        // splits updates between them and breaks guest_message delivery.
        // Disabled until TDLib is migrated to a user-account session in a
        // separate process. handleQuote degrades to single-message mode.
        DISABLE_TDLIB: '1'
      }
    },
    {
      name: 'quotly-worker',
      script: './updates-worker.js',
      instances: 4, // Must match WORKER_QUEUES above.
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
        REDIS_PORT: '6379',
        WORKER_QUEUES
      },
      env_production: {
        NODE_ENV: 'production',
        REDIS_HOST: 'localhost',
        REDIS_PORT: '6379',
        WORKER_QUEUES,
        // TDLib uses the SAME bot token as Telegraf polling — running both
        // splits updates between them and breaks guest_message delivery.
        // Disabled until TDLib is migrated to a user-account session in a
        // separate process. handleQuote degrades to single-message mode.
        DISABLE_TDLIB: '1'
      }
    }
  ]
}

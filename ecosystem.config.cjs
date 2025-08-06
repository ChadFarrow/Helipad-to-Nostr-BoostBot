module.exports = {
  apps: [{
    name: 'boostbot',
    script: 'helipad-webhook.js',
    cwd: '/home/server/bots/BoostBot',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    env_file: '.env',
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true,
    // Auto-restart configuration
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
    // Process management
    kill_timeout: 5000,
    listen_timeout: 3000,
    // Monitoring
    pmx: true,
    // Health check
    health_check_grace_period: 3000,
    health_check_fatal_exceptions: true
  }]
}; 
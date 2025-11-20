module.exports = {
  apps: [{
    name: 'samokat-game-backend',
    cwd: '/var/www/samokat-game/backend',
    script: 'server.js',
    instances: 2,
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 5001
    },
    error_file: '/var/www/samokat-game/logs/backend-error.log',
    out_file: '/var/www/samokat-game/logs/backend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};



// PM2 process config: server chạy bundled từ /var/www/hoccloud/server.bundle.js.
// node_modules/better-sqlite3 (native) resolved qua cwd = /var/www/hoccloud/.
const VPS_BASE = '/var/www/hoccloud';
module.exports = {
  apps: [
    {
      name: 'hoccloud-server',
      script: './server.bundle.js',
      cwd: VPS_BASE,
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 8387,
      },
      // Load runtime config (SQLITE_DB_PATH, PUBLIC_BASE_URL...) từ $BASE/.env
      // (symlink tới /var/www/hoccloud/shared/.env do CI tạo).
      env_file: '.env',
      error_file: '/var/www/hoccloud/logs/err.log',
      out_file: '/var/www/hoccloud/logs/out.log',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};

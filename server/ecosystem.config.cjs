// PM2 process config cho stack Vite+React. Server chạy từ /var/www/hoccloud/server/
// (rsync thẳng, không release symlink) — đơn giản hoá so với pattern cũ.
const VPS_SERVER = '/var/www/hoccloud/server';
module.exports = {
  apps: [
    {
      name: 'hoccloud-server',
      script: './server.js',
      cwd: VPS_SERVER,
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 8387,
      },
      // Load runtime config (SQLITE_DB_PATH, PUBLIC_BASE_URL...) từ server/.env
      // (symlink tới /var/www/hoccloud/shared/.env do CI tạo).
      env_file: '.env',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};

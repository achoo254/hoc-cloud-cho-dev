// PM2 process config. On VPS, PM2 starts from /var/www/hoc-cloud-cho-dev/current/
// (symlink to latest release), so relative paths resolve correctly after atomic swap.
module.exports = {
  apps: [
    {
      name: 'hoc-cloud-labs',
      script: './server/server.js',
      cwd: __dirname + '/..',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
        PORT: 8387,
      },
      // Restart policy
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};

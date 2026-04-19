// PM2 process config. On VPS, PM2 starts from /var/www/hoc-cloud-cho-dev/current/
// (symlink to latest release), so relative paths resolve correctly after atomic swap.
//
// IMPORTANT: cwd MUST be the symlink path string, not __dirname. Node resolves __dirname
// to the realpath of the actual release dir at process start, pinning PM2 to that release
// forever — every later symlink swap is invisible. Hardcoding the symlink path makes
// pm2 reload spawn the new worker pointing at the freshly-swapped release.
const VPS_CURRENT = '/var/www/hoc-cloud-cho-dev/current';
module.exports = {
  apps: [
    {
      name: 'hoc-cloud-labs',
      script: './server/server.js',
      cwd: VPS_CURRENT,
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

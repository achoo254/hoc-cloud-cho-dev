# Phase 7: Backup + Deploy Scripts

**Priority:** P2 | **Status:** pending | **Effort:** 0.5d

## Goal
Production-ready: backup DB, deploy workflow cho VPS có PM2.

## Requirements
- Daily DB backup, giữ 7 bản
- Deploy: pull → npm ci → run migrations → restart PM2 (zero-downtime)
- Rollback procedure rõ ràng

## Implementation Steps

### 1. Backup script (`deploy/backup-sqlite.sh`)
```bash
#!/bin/bash
set -e
DB="/var/www/hoccloud/data/hoccloud.db"
BACKUP_DIR="/var/backups/hoccloud"
mkdir -p "$BACKUP_DIR"
TS=$(date +%Y%m%d-%H%M%S)
sqlite3 "$DB" ".backup $BACKUP_DIR/hoccloud-$TS.db"
gzip "$BACKUP_DIR/hoccloud-$TS.db"
# Keep 7 most recent
ls -t "$BACKUP_DIR"/hoccloud-*.db.gz | tail -n +8 | xargs -r rm
```

Cron: `0 2 * * * /var/www/hoccloud/deploy/backup-sqlite.sh`

### 2. Deploy script (`deploy/deploy.sh`)
```bash
#!/bin/bash
set -e
cd /var/www/hoccloud
git fetch origin master
git reset --hard origin/master
npm ci --omit=dev
node server/db/migrate.js   # idempotent migrations
pm2 reload hoccloud --update-env
echo "✓ Deployed $(git rev-parse --short HEAD)"
```

### 3. Ecosystem config (`ecosystem.config.cjs` — update existing)
```js
module.exports = {
  apps: [{
    name: 'hoccloud',
    script: 'server/server.js',
    instances: 1,
    exec_mode: 'fork',
    env: { NODE_ENV: 'production' },
    env_file: '.env',
    max_memory_restart: '300M',
    error_file: './logs/err.log',
    out_file: './logs/out.log'
  }]
};
```

### 4. Rollback
```bash
# deploy/rollback.sh
cd /var/www/hoccloud
git reset --hard HEAD~1
npm ci --omit=dev
# DB rollback phải MANUAL: restore latest backup
# cp /var/backups/hoccloud/hoccloud-<TS>.db.gz ./data/ && gunzip ...
pm2 reload hoccloud
```

### 5. Health check endpoint
`GET /healthz` → JSON `{ status: 'ok', db: 'connected', uptime: ... }`. PM2 monitor + future LB.

### 6. Uploads backup (Phase 6 main — nếu có image upload)
```bash
# deploy/backup-uploads.sh (weekly)
rsync -a /var/www/hoccloud/data/uploads/ /var/backups/hoccloud-uploads/
```

### 7. Directory layout trên VPS
```
/var/www/hoccloud/        # git checkout
  ├─ data/hoccloud.db     # SQLite (gitignore)
  ├─ data/uploads/        # media (gitignore)
  ├─ logs/
  └─ .env                 # (gitignore)
/var/backups/hoccloud/    # DB backups
```

## Tasks
- [ ] backup-sqlite.sh + cron entry
- [ ] deploy.sh
- [ ] rollback.sh + document manual DB restore
- [ ] Update ecosystem.config.cjs cho env_file
- [ ] `/healthz` endpoint
- [ ] Test deploy flow trên staging (nếu có) hoặc low-traffic time
- [ ] Document runbook trong `docs/deployment-guide.md`

## Acceptance
- Cron backup chạy OK, test restore vào DB tạm → query thành công
- Deploy script zero-downtime (PM2 reload ~200ms)
- Rollback script revert commit + restore DB từ backup
- `/healthz` trả 200 + info cơ bản

## Open Questions
- Có cần monitoring (UptimeRobot, Healthchecks.io ping cron)?
- Log rotation: pm2-logrotate module hay logrotate system?

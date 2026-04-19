#!/usr/bin/env bash
# Rollback: revert 1 commit + reinstall + PM2 reload.
# DB rollback is MANUAL — see docs/deployment-guide.md.
#
# Usage:
#   ./deploy/rollback.sh                # revert HEAD~1
#   ./deploy/rollback.sh <sha>          # revert to specific commit
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/hoc-cloud-cho-dev/current}"
PM2_APP="${PM2_APP:-hoc-cloud-labs}"
TARGET="${1:-HEAD~1}"

cd "$APP_DIR"

echo "[rollback] reset to $TARGET"
git reset --hard "$TARGET"

echo "[rollback] install"
npm ci --omit=dev

echo "[rollback] reload PM2"
pm2 reload "$PM2_APP" --update-env

cat <<'MSG'
⚠️  DB rollback not automated. If the reverted code expects an older schema:
   1. Stop PM2:            pm2 stop hoc-cloud-labs
   2. Restore latest backup:
        cp /var/backups/hoccloud/hoccloud-<TS>.db.gz /tmp/
        gunzip /tmp/hoccloud-<TS>.db.gz
        cp /tmp/hoccloud-<TS>.db /var/www/hoc-cloud-cho-dev/current/data/hoccloud.db
   3. pm2 start hoc-cloud-labs
MSG

echo "[rollback] done — running $(git rev-parse --short HEAD)"

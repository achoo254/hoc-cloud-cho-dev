#!/usr/bin/env bash
# Rollback procedure for Vite+React SPA cutover.
#
# Two rollback modes:
#   MODE A — nginx root revert (fast, no re-deploy needed)
#             Point nginx root back to legacy/labs/ for 1-day triage window.
#   MODE B — full code revert (git reset + reinstall + PM2 reload)
#
# Usage:
#   ./deploy/rollback.sh nginx           # MODE A: revert nginx root only
#   ./deploy/rollback.sh                 # MODE B: revert HEAD~1
#   ./deploy/rollback.sh <sha>           # MODE B: revert to specific commit
#
# Environment overrides:
#   APP_DIR      — server root on VPS  (default: /var/www/hoccloud)
#   PM2_APP      — pm2 process name    (default: hoccloud-server)
#   NGINX_CONF   — nginx config file   (default: /etc/nginx/conf.d/hoc-cloud.conf)
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/hoccloud}"
PM2_APP="${PM2_APP:-hoccloud-server}"
NGINX_CONF="${NGINX_CONF:-/etc/nginx/conf.d/hoc-cloud.conf}"
MODE="${1:-}"

# ── MODE A: nginx root revert ────────────────────────────────────────────────
if [ "$MODE" = "nginx" ]; then
  echo "[rollback] MODE A — reverting nginx root to legacy/labs/"

  # Swap root directive from app/dist to legacy labs directory.
  # Assumes legacy labs were archived to /var/www/hoccloud/legacy/labs/ before cutover.
  if [ ! -d "${APP_DIR}/legacy/labs" ]; then
    echo "[rollback] ERROR: ${APP_DIR}/legacy/labs not found."
    echo "           Run 'git mv labs/ legacy/labs/' and deploy legacy dir first."
    exit 1
  fi

  # Patch root in nginx config (sed in-place backup)
  sudo sed -i.bak \
    "s|root ${APP_DIR}/app/dist;|root ${APP_DIR}/legacy/labs;|g" \
    "$NGINX_CONF"

  sudo nginx -t && sudo systemctl reload nginx
  echo "[rollback] nginx reverted — serving legacy labs from ${APP_DIR}/legacy/labs"
  echo "[rollback] Restore SPA: re-run deploy/remote-deploy.sh and re-patch nginx conf."
  exit 0
fi

# ── MODE B: full git revert ──────────────────────────────────────────────────
TARGET="${1:-HEAD~1}"

echo "[rollback] MODE B — git reset to $TARGET"
cd "$APP_DIR"

git reset --hard "$TARGET"

echo "[rollback] install server deps"
cd "$APP_DIR/server"
npm ci --omit=dev

echo "[rollback] reload PM2"
pm2 reload "$PM2_APP" --update-env
pm2 save

cat <<'MSG'

WARNING: DB rollback not automated. If the reverted code expects an older schema:
   1. Stop PM2:  pm2 stop hoccloud-server
   2. Restore backup:
        cp /var/backups/hoccloud/hoccloud-<TS>.db.gz /tmp/
        gunzip /tmp/hoccloud-<TS>.db.gz
        cp /tmp/hoccloud-<TS>.db /var/www/hoccloud/data/hoccloud.db
   3. pm2 start hoccloud-server

NOTE: The labs/labs_fts tables are NOT dropped until 2 weeks post-cutover.
      Rollback to legacy labs HTML is safe without any DB changes.
MSG

echo "[rollback] done — running $(git rev-parse --short HEAD)"

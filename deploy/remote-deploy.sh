#!/bin/bash
# Remote deploy: build SPA locally, rsync dist/ + server/ to VPS, reload services.
#
# Prerequisites (local machine):
#   - ssh key access to VPS (ssh-agent or ~/.ssh/config)
#   - rsync installed
#   - Node >=20 + npm installed locally
#
# Usage:
#   bash deploy/remote-deploy.sh [user@host]
#
# Environment overrides:
#   REMOTE_HOST   — VPS ssh target (default: hoc-cloud.inetdev.io.vn)
#   REMOTE_USER   — ssh user (default: ubuntu)
#   REMOTE_BASE   — deploy root on VPS (default: /var/www/hoccloud)
#   PM2_APP       — pm2 process name (default: hoccloud-server)
set -euo pipefail

REMOTE_HOST="${REMOTE_HOST:-hoc-cloud.inetdev.io.vn}"
REMOTE_USER="${REMOTE_USER:-ubuntu}"
REMOTE_BASE="${REMOTE_BASE:-/var/www/hoccloud}"
PM2_APP="${PM2_APP:-hoccloud-server}"
REMOTE="${1:-${REMOTE_USER}@${REMOTE_HOST}}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "[deploy] repo=$REPO_ROOT remote=$REMOTE base=$REMOTE_BASE"

# ── Step 1: Build SPA locally ────────────────────────────────────────────────
echo "[deploy] building SPA (app/)..."
cd "$REPO_ROOT/app"
npm run build
echo "[deploy] build complete — dist/ ready"
cd "$REPO_ROOT"

# ── Step 2: Ensure remote directories exist ──────────────────────────────────
echo "[deploy] preparing remote directories..."
ssh "$REMOTE" "mkdir -p ${REMOTE_BASE}/app/dist ${REMOTE_BASE}/server"

# ── Step 3: Rsync app/dist/ → remote ────────────────────────────────────────
# --delete removes stale hashed assets from previous builds.
echo "[deploy] syncing app/dist/..."
rsync -az --delete \
  "$REPO_ROOT/app/dist/" \
  "${REMOTE}:${REMOTE_BASE}/app/dist/"

# ── Step 4: Rsync server/ → remote ──────────────────────────────────────────
# Excludes node_modules — VPS installs its own deps via npm ci.
echo "[deploy] syncing server/..."
rsync -az --delete \
  --exclude='node_modules' \
  --exclude='.env' \
  "$REPO_ROOT/server/" \
  "${REMOTE}:${REMOTE_BASE}/server/"

# ── Step 5: Install server deps on remote ───────────────────────────────────
echo "[deploy] installing server dependencies on remote..."
ssh "$REMOTE" "cd ${REMOTE_BASE}/server && npm ci --omit=dev"

# ── Step 6: Test nginx config + reload ──────────────────────────────────────
echo "[deploy] reloading nginx..."
ssh "$REMOTE" "sudo nginx -t && sudo systemctl reload nginx"

# ── Step 7: Restart Hono server via pm2 ─────────────────────────────────────
echo "[deploy] restarting pm2 process '${PM2_APP}'..."
ssh "$REMOTE" "
  if pm2 describe '${PM2_APP}' >/dev/null 2>&1; then
    pm2 restart '${PM2_APP}' --update-env
  else
    echo '[deploy] WARNING: pm2 process ${PM2_APP} not found. Start it manually:'
    echo '  pm2 start ${REMOTE_BASE}/server/ecosystem.config.cjs --name ${PM2_APP}'
    exit 1
  fi
  pm2 save
"

echo "[deploy] done — $(date -Iseconds)"
echo "[deploy] verify: curl -s https://${REMOTE_HOST}/healthz"

#!/usr/bin/env bash
# Server-side deploy: pull latest → install → migrate → PM2 reload.
# Assumes the existing atomic-swap layout under /var/www/hoc-cloud-cho-dev/{releases,current,shared}.
#
# Simpler alt: if running out of a plain clone, override APP_DIR=/path/to/clone.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/hoc-cloud-cho-dev/current}"
PM2_APP="${PM2_APP:-hoc-cloud-labs}"

cd "$APP_DIR"

echo "[$(date -Iseconds)] pull"
git fetch --all --prune
git reset --hard origin/master

echo "[$(date -Iseconds)] install"
npm ci --omit=dev

echo "[$(date -Iseconds)] migrate"
node server/db/migrate.js

echo "[$(date -Iseconds)] reload PM2"
pm2 reload "$PM2_APP" --update-env

echo "[$(date -Iseconds)] deployed $(git rev-parse --short HEAD)"

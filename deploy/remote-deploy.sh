#!/bin/bash
# Runs ON the VPS after CI scp's bundle.tar.gz into releases/<timestamp>.tar.gz
# Usage: bash remote-deploy.sh <release-timestamp>
set -euo pipefail

RELEASE="${1:?release timestamp required}"
BASE="/var/www/hoc-cloud-cho-dev"
RELEASES_DIR="$BASE/releases"
RELEASE_DIR="$RELEASES_DIR/$RELEASE"
TARBALL="$RELEASES_DIR/$RELEASE.tar.gz"

echo "[deploy] release=$RELEASE"

# 1. Extract bundle into dedicated release directory
mkdir -p "$RELEASE_DIR"
tar -xzf "$TARBALL" -C "$RELEASE_DIR"
rm -f "$TARBALL"

# 2. Atomic symlink swap: current -> new release
ln -sfn "$RELEASE_DIR" "$BASE/current"

# 3. Reload PM2 (graceful, zero-downtime). Start if not already registered.
cd "$BASE/current"
if pm2 describe hoc-cloud-labs >/dev/null 2>&1; then
  pm2 reload server/ecosystem.config.cjs --update-env
else
  pm2 start server/ecosystem.config.cjs
fi
pm2 save

# 4. Cleanup: keep the 3 most recent releases
cd "$RELEASES_DIR"
ls -1t | grep -v '\.tar\.gz$' | tail -n +4 | xargs -r rm -rf

echo "[deploy] done. current -> $RELEASE_DIR"

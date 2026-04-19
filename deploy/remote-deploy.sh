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

# 1b. Link persisted config + data into the release dir.
#     .env lives in shared/ (rewritten each deploy from CI secrets).
#     data/ also persists so SQLite DB survives releases.
if [ -f "$BASE/shared/.env" ]; then
  ln -sfn "$BASE/shared/.env" "$RELEASE_DIR/.env"
fi
mkdir -p "$BASE/shared/data"
rm -rf "$RELEASE_DIR/data"
ln -sfn "$BASE/shared/data" "$RELEASE_DIR/data"

# 2. Atomic symlink swap: current -> new release
ln -sfn "$RELEASE_DIR" "$BASE/current"

# 3. Reload PM2. Force full restart if existing process has wrong cwd
#    (e.g. an old release pinned via realpath) — otherwise the symlink swap is invisible
#    to the running worker and stale files keep being served.
cd "$BASE/current"
EXPECTED_CWD="$BASE/current"
if pm2 describe hoc-cloud-labs >/dev/null 2>&1; then
  CURRENT_CWD=$(pm2 jlist | node -e "
    let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
      const a=JSON.parse(d).find(x=>x.name==='hoc-cloud-labs');
      console.log(a?.pm2_env?.pm_cwd||'');
    });")
  if [ "$CURRENT_CWD" != "$EXPECTED_CWD" ]; then
    echo "[deploy] cwd mismatch (was=$CURRENT_CWD expected=$EXPECTED_CWD) → full restart"
    pm2 delete hoc-cloud-labs || true
    pm2 start server/ecosystem.config.cjs
  else
    pm2 reload server/ecosystem.config.cjs --update-env
  fi
else
  pm2 start server/ecosystem.config.cjs
fi
pm2 save

# 4. Cleanup: keep the 3 most recent releases
cd "$RELEASES_DIR"
ls -1t | grep -v '\.tar\.gz$' | tail -n +4 | xargs -r rm -rf

echo "[deploy] done. current -> $RELEASE_DIR"

#!/usr/bin/env bash
# Daily SQLite online backup. Keeps 7 most recent gzipped snapshots.
# Add to crontab (VPS):
#   0 2 * * * /var/www/hoc-cloud-cho-dev/current/deploy/backup-sqlite.sh >> /var/log/hoccloud-backup.log 2>&1
set -euo pipefail

DB="${SQLITE_DB_PATH:-/var/www/hoc-cloud-cho-dev/current/data/hoccloud.db}"
BACKUP_DIR="${HOCCLOUD_BACKUP_DIR:-/var/backups/hoccloud}"
RETENTION="${HOCCLOUD_BACKUP_KEEP:-7}"

mkdir -p "$BACKUP_DIR"
TS=$(date +%Y%m%d-%H%M%S)
TMP="$BACKUP_DIR/hoccloud-$TS.db"

# Online backup (safe even while app is writing).
sqlite3 "$DB" ".backup '$TMP'"
gzip "$TMP"
echo "[$(date -Iseconds)] backup ok: $TMP.gz ($(du -h "$TMP.gz" | cut -f1))"

# Retention: keep N newest.
ls -1t "$BACKUP_DIR"/hoccloud-*.db.gz 2>/dev/null | tail -n "+$((RETENTION + 1))" | xargs -r rm -f

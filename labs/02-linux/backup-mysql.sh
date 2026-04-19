#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/mysql}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
MYSQL_USER="${MYSQL_USER:-backup}"
MYSQL_PASS="${MYSQL_PASS:?MYSQL_PASS is required}"

mkdir -p "$BACKUP_DIR"
TS="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/all-databases-$TS.sql.gz"

mysqldump -u "$MYSQL_USER" -p"$MYSQL_PASS" --all-databases --single-transaction --quick \
  | gzip > "$OUT"

find "$BACKUP_DIR" -name '*.sql.gz' -mtime +"$RETENTION_DAYS" -delete

echo "Backup done: $OUT"

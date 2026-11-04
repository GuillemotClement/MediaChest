#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
backup_dir=${BACKUP_DIR:-./backups}
umask 077
mkdir -p "$backup_dir"
backup_file="$backup_dir/mediachest-$(date -u +%Y%m%dT%H%M%SZ)-$$.dump"
trap 'rm -f "$backup_file.partial"' EXIT HUP INT TERM
sh scripts/prod-compose.sh exec -T db pg_dump -U mediachest -d mediachest --format=custom > "$backup_file.partial"
# Verify the archive before considering the backup successful.
sh scripts/prod-compose.sh exec -T db pg_restore --list < "$backup_file.partial" >/dev/null
mv "$backup_file.partial" "$backup_file"
printf 'Sauvegarde créée : %s\n' "$backup_file"

#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ "$#" -ne 2 ] || [ "$1" != "--replace" ] || [ ! -f "$2" ]; then
  echo 'Usage : sh scripts/prod-restore.sh --replace chemin/backup.dump' >&2
  echo 'Remplace la base de production. Sauvegarder avant cette opération.' >&2
  exit 1
fi
# Refuse invalid archives before stopping the application.
sh scripts/prod-compose.sh up -d --wait db
sh scripts/prod-compose.sh exec -T db pg_restore --list < "$2" >/dev/null
sh scripts/prod-compose.sh stop front api
sh scripts/prod-compose.sh exec -T db dropdb -U mediachest --force --if-exists mediachest
sh scripts/prod-compose.sh exec -T db createdb -U mediachest mediachest
# On failure keep the app stopped; never serve a partially restored database.
sh scripts/prod-compose.sh exec -T db pg_restore -U mediachest -d mediachest --no-owner --no-acl --exit-on-error < "$2"
sh scripts/prod-compose.sh up -d --wait
printf '%s\n' 'Base restaurée et application redémarrée.'

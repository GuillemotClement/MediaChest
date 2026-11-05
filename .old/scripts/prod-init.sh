#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ -e .env.prod ]; then
  echo '.env.prod existe déjà : aucune valeur modifiée.' >&2
  exit 1
fi
command -v openssl >/dev/null 2>&1 || { echo 'openssl est requis.' >&2; exit 1; }
app_url=${1:-http://raspberrypi.local:8081}
case "$app_url" in
  http://*|https://*) ;;
  *) echo 'Fournir une URL http:// ou https:// complète.' >&2; exit 1 ;;
esac
case "$app_url" in
  *[!a-zA-Z0-9.:/_-]*|*/) echo 'URL invalide : utiliser une adresse locale sans slash final.' >&2; exit 1 ;;
esac
# Exclusive creation prevents overwriting existing secrets, even on concurrent runs.
umask 077
set -C
{
  printf 'APP_URL=%s\nAPP_PORT=8081\nBIND_ADDRESS=0.0.0.0\n' "$app_url"
  printf 'POSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 32)"
  printf 'BETTER_AUTH_SECRET=%s\n' "$(openssl rand -hex 48)"
  printf 'ADMIN_INITIAL_PASSWORD=%s\n' "$(openssl rand -hex 16)"
  printf 'TMDB_READ_ACCESS_TOKEN=\n'
} > .env.prod
printf '%s\n' '.env.prod créé avec des secrets aléatoires. Ajouter TMDB_READ_ACCESS_TOKEN avant le démarrage.'

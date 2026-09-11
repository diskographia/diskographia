#!/usr/bin/env bash
# первый запуск на чистом сервере
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env.production ]; then
  echo "нет .env.production, возьмите образец из .env.production.example"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env.production
set +a

UPLOADS="${UPLOADS_HOST_DIR:-./uploads}"
mkdir -p "$UPLOADS"

docker compose --env-file .env.production build
docker compose --env-file .env.production up -d postgres
docker compose --env-file .env.production run --rm server pnpm db:migrate
docker compose --env-file .env.production run --rm server pnpm seed:admin
docker compose --env-file .env.production up -d

echo "готово. учётка платформы заведена по PLATFORM_EMAIL и PLATFORM_PASSWORD из .env.production"
echo "первый запуск сервера создаёт три пустых контейнера: подборка, витрина, манифест"
echo
echo "снаружи ничего не открыто: клиент слушает 127.0.0.1:${CLIENT_PORT:-3000}, сервер 127.0.0.1:${SERVER_PORT:-4000}"
echo "остаётся настроить caddy: образец в deploy/Caddyfile, файлы он раздаёт из $UPLOADS"

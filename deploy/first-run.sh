#!/usr/bin/env bash
# первый запуск на чистом сервере: в папке стенда лежат docker-compose.yml, .env.production и deploy/
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

# пакеты в ghcr закрытые: нужен токен github с read:packages в GHCR_USER и GHCR_TOKEN
if [ -n "${GHCR_TOKEN:-}" ]; then
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "${GHCR_USER:-github}" --password-stdin
fi

docker compose --env-file .env.production pull
docker compose --env-file .env.production up -d postgres
docker compose --env-file .env.production run --rm server pnpm db:migrate
docker compose --env-file .env.production run --rm server pnpm seed:admin
docker compose --env-file .env.production up -d

echo "готово. учётка платформы заведена по PLATFORM_EMAIL и PLATFORM_PASSWORD из .env.production"
echo "первый запуск сервера создаёт три пустых контейнера: подборка, витрина, манифест"
echo
echo "снаружи ничего не открыто: клиент слушает 127.0.0.1:${CLIENT_PORT:-3000}, сервер 127.0.0.1:${SERVER_PORT:-4000}"
echo "остаётся настроить caddy: образец в deploy/Caddyfile, файлы он раздаёт из $UPLOADS"

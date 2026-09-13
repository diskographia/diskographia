#!/usr/bin/env bash
# ручная кнопка выкатки: запускается на сервере из папки стенда, репозиторий на сервере не нужен.
# образы собирает github actions на каждый коммит в main и кладёт в ghcr.io, здесь они только тянутся
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env.production ]; then
  echo "нет .env.production, возьмите образец из .env.production.example"
  exit 1
fi

# тег аргументом: sha-<коммит> возвращает прошлую версию, без аргумента берётся свежий latest
TAG="${1:-latest}"

if grep -qE '^IMAGE_TAG=' .env.production; then
  sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$TAG/" .env.production
else
  echo "IMAGE_TAG=$TAG" >> .env.production
fi

SERVER_PORT=$(grep -E '^SERVER_PORT=' .env.production | cut -d= -f2 || true)
SERVER_PORT="${SERVER_PORT:-4000}"

WAS=$(docker compose --env-file .env.production images server --format '{{.Tag}}' 2>/dev/null | head -1 || true)

# пакеты в ghcr закрытые: actions передаёт временный токен, руками нужен токен github с read:packages
if [ -n "${GHCR_TOKEN:-}" ]; then
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "${GHCR_USER:-github}" --password-stdin
fi

echo "== тянем образы $TAG =="
docker compose --env-file .env.production pull

if [ -n "${GHCR_TOKEN:-}" ]; then
  docker logout ghcr.io >/dev/null
fi

echo "== копия базы и файлов перед миграциями =="
./deploy/backup.sh || echo "копия не снялась, продолжаем"

echo "== база и миграции =="
docker compose --env-file .env.production up -d postgres
docker compose --env-file .env.production run --rm server pnpm db:migrate

echo "== поднимаем новые версии =="
docker compose --env-file .env.production up -d --remove-orphans

echo "== ждём ответа =="
for _ in $(seq 1 45); do
  if curl -fsS -o /dev/null "http://127.0.0.1:$SERVER_PORT/api/health"; then
    docker image prune -f >/dev/null
    echo "выкатили $TAG, прошлая была ${WAS:-неизвестна}"
    echo "caddy трогать не нужно: адреса и порты не менялись"
    exit 0
  fi
  sleep 2
done

echo "новая версия не отвечает"
echo "логи: docker compose --env-file .env.production logs --tail 100 server client"
echo "откат: ./deploy/deploy.sh ${WAS:-sha-<прошлый коммит>}"
exit 1

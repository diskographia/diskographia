#!/usr/bin/env bash
# ручная кнопка выкатки: запускается на сервере из корня репозитория
set -euo pipefail

BRANCH="${1:-main}"

cd "$(dirname "$0")/.."

if [ ! -f .env.production ]; then
  echo "нет .env.production, возьмите образец из .env.production.example"
  exit 1
fi

SERVER_PORT=$(grep -E '^SERVER_PORT=' .env.production | cut -d= -f2 || true)
SERVER_PORT="${SERVER_PORT:-4000}"

WAS=$(git rev-parse --short HEAD)

echo "== забираем $BRANCH =="
git fetch --prune origin
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "== копия базы и файлов перед миграциями =="
./deploy/backup.sh || echo "копия не снялась, продолжаем"

echo "== собираем образы =="
docker compose --env-file .env.production build

echo "== база и миграции =="
docker compose --env-file .env.production up -d postgres
docker compose --env-file .env.production run --rm server pnpm db:migrate

echo "== поднимаем новые версии =="
docker compose --env-file .env.production up -d --remove-orphans

echo "== ждём ответа =="
for _ in $(seq 1 45); do
  if curl -fsS -o /dev/null "http://127.0.0.1:$SERVER_PORT/api/health"; then
    docker image prune -f >/dev/null
    echo "выкатили $(git rev-parse --short HEAD), прошлая была $WAS"
    echo "caddy трогать не нужно: адреса и порты не менялись"
    exit 0
  fi
  sleep 2
done

echo "новая версия не отвечает"
echo "логи: docker compose --env-file .env.production logs --tail 100 server client"
echo "откат: git reset --hard $WAS && ./deploy/deploy.sh"
exit 1

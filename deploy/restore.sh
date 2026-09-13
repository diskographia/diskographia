#!/usr/bin/env bash
# возврат из копии: стирает текущую базу и файлы, поэтому спрашивает подтверждение
set -euo pipefail

cd "$(dirname "$0")/.."

DUMP="${1:?укажите файл дампа, например backups/db-2026-09-09_21-00.sql.gz}"
FILES="${2:-}"

set -a
# shellcheck disable=SC1091
source .env.production
set +a

UPLOADS="${UPLOADS_HOST_DIR:-./uploads}"

read -r -p "это сотрёт текущую базу. напишите да, чтобы продолжить: " ANSWER
[ "$ANSWER" = "да" ] || exit 1

docker compose --env-file .env.production stop server client

# база пересоздаётся пустой: дамп ложится в чистую схему, а не поверх старой
docker compose --env-file .env.production exec -T postgres \
  psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS \"$POSTGRES_DB\" WITH (FORCE);" \
  -c "CREATE DATABASE \"$POSTGRES_DB\" OWNER \"$POSTGRES_USER\";"

gunzip -c "$DUMP" | docker compose --env-file .env.production exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 --quiet

if [ -n "$FILES" ]; then
  rm -rf "${UPLOADS:?}"/*
  tar xzf "$FILES" -C "$(dirname "$UPLOADS")"
fi

docker compose --env-file .env.production up -d
echo "вернули из $DUMP"

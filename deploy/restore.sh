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

gunzip -c "$DUMP" | docker compose --env-file .env.production exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

if [ -n "$FILES" ]; then
  rm -rf "${UPLOADS:?}"/*
  tar xzf "$FILES" -C "$(dirname "$UPLOADS")"
fi

docker compose --env-file .env.production up -d
echo "вернули из $DUMP"

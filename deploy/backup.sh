#!/usr/bin/env bash
# копия базы и файлов: запускается на сервере из корня репозитория
set -euo pipefail

cd "$(dirname "$0")/.."

KEEP="${1:-14}"
STAMP=$(date +%Y-%m-%d_%H-%M)
OUT="$PWD/backups"

set -a
# shellcheck disable=SC1091
source .env.production
set +a

UPLOADS="${UPLOADS_HOST_DIR:-./uploads}"

mkdir -p "$OUT"

docker compose --env-file .env.production exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$OUT/db-$STAMP.sql.gz"

tar czf "$OUT/uploads-$STAMP.tar.gz" -C "$(dirname "$UPLOADS")" "$(basename "$UPLOADS")"

# старые копии удаляются, иначе диск кончится незаметно
find "$OUT" -name 'db-*.sql.gz' -mtime "+$KEEP" -delete
find "$OUT" -name 'uploads-*.tar.gz' -mtime "+$KEEP" -delete

echo "копия готова: $OUT/db-$STAMP.sql.gz и $OUT/uploads-$STAMP.tar.gz"
du -sh "$OUT"

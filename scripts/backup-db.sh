#!/usr/bin/env bash
# Резервное копирование PostgreSQL с ротацией старых файлов.
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/taskflow}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TS="$(date +%Y-%m-%d_%H-%M-%S)"
OUT="${BACKUP_DIR}/taskflow_${TS}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[${TS}] Старт резервного копирования → ${OUT}"

pg_dump \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  "${DATABASE_URL}" | gzip -9 > "${OUT}"

echo "[${TS}] Готово, размер: $(du -h "${OUT}" | cut -f1)"

# Ротация: удаляем файлы старше RETENTION_DAYS дней.
find "${BACKUP_DIR}" -name "taskflow_*.sql.gz" -type f -mtime +"${RETENTION_DAYS}" -delete
echo "[${TS}] Удалены копии старше ${RETENTION_DAYS} дней"

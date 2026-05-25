#!/usr/bin/env bash
# Полный автодеплой TaskFlow на чистый Ubuntu-сервер в РФ (Timeweb и т.п.).
# Учитывает реалии РФ: Docker Hub и npm недоступны напрямую -> зеркала;
# на сети провайдера MTU < 1500 при заблокированном ICMP -> MTU/MSS-фиксы.
# Домен берётся автоматически как <публичный-ip>.nip.io (бесплатный HTTPS).
#
# Запуск (из корня склонированного репозитория):
#   bash deploy/rf-setup.sh
set -euo pipefail
trap 'echo "[rf-setup] FAILED на строке $LINENO"; exit 1' ERR

# Блокировка от параллельных запусков (PID-замок, не залипает: дочерние
# процессы не наследуют, killed -9 не оставляет вечный lock).
LOCKFILE=/tmp/tf-deploy.lock
if [ -f "$LOCKFILE" ] && kill -0 "$(cat "$LOCKFILE" 2>/dev/null)" 2>/dev/null; then
  echo "[rf-setup] уже запущен (pid $(cat "$LOCKFILE")) — выхожу"
  exit 0
fi
echo $$ > "$LOCKFILE"
trap 'rm -f "$LOCKFILE"' EXIT

# перейти в корень репозитория (скрипт лежит в deploy/)
cd "$(cd "$(dirname "$0")" && pwd)/.."
ROOT=$(pwd)
echo "[rf-setup] START $(date -u)  dir=$ROOT"
export DEBIAN_FRONTEND=noninteractive

NPM_MIRROR="https://registry.npmmirror.com"
PRISMA_MIRROR="https://registry.npmmirror.com/-/binary/prisma"

# Идемпотентно добавить строку в crontab root. Устойчиво к отсутствию crontab
# и к set -e/pipefail (на свежем сервере `crontab -l` возвращает ошибку).
add_cron() {  # $1 = маркер для дедупликации, $2 = строка cron
  { crontab -l 2>/dev/null | grep -v "$1" || true; echo "$2"; } | crontab - || true
}

# --- 1. базовые пакеты ---
apt-get update -y -q
apt-get install -y -q curl ca-certificates ufw openssl iptables cron

# --- 2. публичный IP -> домен nip.io ---
IP=$(curl -s --max-time 10 https://api.ipify.org || true)
[ -z "$IP" ] && IP=$(curl -s --max-time 10 https://ifconfig.me || true)
[ -z "$IP" ] && { echo "[rf-setup] не определил публичный IP"; exit 1; }
NIP="${IP}.nip.io"
echo "[rf-setup] публичный IP=$IP, домен=$NIP"

# --- 3. MTU 1280 на интерфейсе (MSS-клэмп — позже, после установки Docker,
#         т.к. модуль netfilter TCPMSS поднимает Docker) ---
IFACE=$(ip route show default | awk '/default/{print $5; exit}')
IFACE=${IFACE:-eth0}
ip link set "$IFACE" mtu 1280 || true
add_cron 'taskflow-mtu' "@reboot /sbin/ip link set $IFACE mtu 1280  # taskflow-mtu"
echo "[rf-setup] MTU 1280 на $IFACE (закреплено)"

# --- 4. swap, если RAM < 4 ГБ ---
mem_mb=$(free -m | awk '/^Mem:/{print $2}')
if [ "$mem_mb" -lt 4000 ] && [ ! -f /swapfile ]; then
  fallocate -l 4G /swapfile; chmod 600 /swapfile; mkswap /swapfile >/dev/null; swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "[rf-setup] swap 4G создан"
fi

# --- 5. файрвол ---
ufw allow 22/tcp >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null
echo "[rf-setup] ufw включён (22/80/443)"

# --- 6. Docker + зеркала Docker Hub ---
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh >/dev/null 2>&1
fi
mkdir -p /etc/docker
# mtu 1280: путь провайдера режет 1500 при заблокированном ICMP. Задаём MTU
# самому демону, чтобы и сборочная сеть buildkit, и сети контейнеров (Caddy и
# т.д.) использовали пакеты, проходящие сквозь канал, иначе загрузки в сборке
# (apk/npm) и TLS-рукопожатия зависают.
cat > /etc/docker/daemon.json <<'EOF'
{
  "registry-mirrors": ["https://dockerhub.timeweb.cloud", "https://huecker.io", "https://mirror.gcr.io"],
  "mtu": 1280
}
EOF
systemctl restart docker; sleep 3
echo "[rf-setup] docker: $(docker --version)"

# MSS-клэмп для трафика контейнеров (теперь модули netfilter подняты Docker'ом)
modprobe xt_TCPMSS 2>/dev/null || true
iptables -t mangle -C FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1240 2>/dev/null \
  || iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1240 || true
add_cron 'taskflow-mss' '@reboot /sbin/iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1240  # taskflow-mss'
echo "[rf-setup] MSS-клэмп 1240 (закреплено)"

# --- 7. .env (генерим один раз) ---
if [ ! -f .env ]; then
  PG_PASS=$(openssl rand -hex 16); AUTH_SECRET=$(openssl rand -base64 32)
  cat > .env <<EOF
DATABASE_URL=postgresql://taskflow:${PG_PASS}@db:5432/taskflow
APP_DOMAIN=${NIP}
BETTER_AUTH_SECRET=${AUTH_SECRET}
BETTER_AUTH_URL=https://${NIP}
NEXT_PUBLIC_BETTER_AUTH_URL=https://${NIP}
YANDEX_CLIENT_ID=
YANDEX_CLIENT_SECRET=
SMTP_HOST=
SMTP_PORT=465
SMTP_USER=
SMTP_PASSWORD=
YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=
YOOKASSA_WEBHOOK_SECRET=
POSTGRES_USER=taskflow
POSTGRES_PASSWORD=${PG_PASS}
POSTGRES_DB=taskflow
DEMO_MODE=true
EOF
  chmod 600 .env
  echo "[rf-setup] .env создан (домен ${NIP})"
fi

# --- 8. сборка (с npm/prisma-зеркалами через build-arg) и запуск ---
echo "[rf-setup] сборка образа (зеркала npm/prisma)..."
docker compose build \
  --build-arg NPM_REGISTRY="$NPM_MIRROR" \
  --build-arg PRISMA_ENGINES_MIRROR="$PRISMA_MIRROR" app
echo "[rf-setup] docker compose up -d"
docker compose up -d

# --- 9. ждём БД и применяем миграции ---
echo "[rf-setup] жду healthy у db"
for i in $(seq 1 40); do docker compose ps db | grep -q healthy && { echo "db healthy"; break; }; sleep 3; done
echo "[rf-setup] жду пока app перестанет рестартиться"
for i in $(seq 1 20); do docker compose ps app --format '{{.Status}}' | grep -q '^Up' && break; sleep 3; done

echo "[rf-setup] prisma migrate deploy"
if ! docker compose exec -T app npx prisma migrate deploy; then
  echo "[rf-setup] deploy не прошёл — reset (БД свежая)"
  docker compose exec -T app npx prisma migrate reset --force --skip-seed
fi
echo "[rf-setup] seed демо-данных"
docker compose exec -T app npm run db:seed || echo "[rf-setup] seed не прошёл (не критично)"

echo "[rf-setup] статус:"
docker compose ps
echo ""
echo "[rf-setup] ГОТОВО. Сайт: https://${NIP}"
echo "[rf-setup] DONE $(date -u)"

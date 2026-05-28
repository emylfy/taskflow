#!/usr/bin/env bash
# TaskFlow: диагностика состояния развёрнутого сайта.
# Что делает: проверяет DNS, HTTPS, TLS-сертификат и (если запущен на сервере)
# состояние контейнеров Docker Compose, БД, приложение и хвосты логов.
# Не делает деструктивных операций.
#
# Использование:
#   bash health-check.sh                 # на сервере: домен возьмёт из ./env
#   bash health-check.sh мойдомен.ru     # домен вручную
#   curl -fsSL <raw-url> | bash -s -- мойдомен.ru

# Если запущен из произвольного каталога, а на сервере репо лежит в /opt/taskflow
# (см. DEPLOY.md) — перейдём туда, чтобы прочесть .env и docker-compose.yml.
if [ ! -f docker-compose.yml ] && [ -d /opt/taskflow ]; then
  cd /opt/taskflow || exit 1
fi

DOMAIN="${1:-}"
if [ -z "$DOMAIN" ] && [ -f .env ]; then
  DOMAIN=$(awk -F= '/^APP_DOMAIN=/{gsub(/["\r]/,"",$2); print $2; exit}' .env)
fi

if [ -z "$DOMAIN" ]; then
  echo "Не указан домен и не нашли APP_DOMAIN в .env."
  echo "Запуск: bash health-check.sh мойдомен.ru"
  exit 1
fi

H() { printf '\n========== %s ==========\n' "$*"; }

H "Окружение"
echo "  Дата:    $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
echo "  Хост:    $(hostname 2>/dev/null || echo n/a)"
echo "  CWD:     $(pwd)"
echo "  Домен:   $DOMAIN"
echo "  Docker:  $(docker --version 2>/dev/null || echo не установлен)"
echo "  Compose: $(docker compose version 2>/dev/null | head -1 || echo не установлен)"

H "DNS"
if command -v dig >/dev/null 2>&1; then
  R=$(dig +short A "$DOMAIN" | tr '\n' ' ')
  W=$(dig +short A "www.$DOMAIN" | tr '\n' ' ')
  echo "  A $DOMAIN     → ${R:-(не резолвится)}"
  echo "  A www.$DOMAIN → ${W:-(не резолвится)}"
elif command -v getent >/dev/null 2>&1; then
  echo "  $DOMAIN     → $(getent hosts "$DOMAIN" | awk '{print $1}' | head -1)"
  echo "  www.$DOMAIN → $(getent hosts "www.$DOMAIN" | awk '{print $1}' | head -1)"
else
  echo "  (нет dig/getent — пропускаю)"
fi

H "HTTPS снаружи"
for h in "$DOMAIN" "www.$DOMAIN"; do
  printf '  %-30s ' "$h"
  curl -sIL --max-time 10 -o /dev/null \
    -w 'code=%{http_code} time=%{time_total}s → %{url_effective}\n' \
    "https://$h" 2>/dev/null || echo "(ошибка/таймаут)"
done

H "TLS-сертификат"
if command -v openssl >/dev/null 2>&1; then
  echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null </dev/null \
    | openssl x509 -noout -issuer -subject -dates 2>/dev/null | sed 's/^/  /' \
    || echo "  (не удалось получить сертификат)"
else
  echo "  openssl не установлен"
fi

# Дальше — серверные проверки. Запускаются только если рядом docker-compose.yml
# и установлен Docker Compose v2.
if [ -f docker-compose.yml ] && docker compose version >/dev/null 2>&1; then
  H "Контейнеры (docker compose ps)"
  docker compose ps --format 'table {{.Service}}\t{{.State}}\t{{.Status}}' 2>&1 | sed 's/^/  /'

  H "Docker stats (снимок)"
  docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}' 2>&1 | sed 's/^/  /'

  H "PostgreSQL"
  if docker compose exec -T db pg_isready -U taskflow -d taskflow >/dev/null 2>&1; then
    echo "  pg_isready: OK"
    USERS=$(docker compose exec -T db psql -U taskflow -d taskflow -tAc 'select count(*) from "User";' 2>/dev/null | tr -d '\r')
    PROJ=$(docker compose exec -T db psql -U taskflow -d taskflow -tAc 'select count(*) from "Project";' 2>/dev/null | tr -d '\r')
    echo "  users=${USERS:-?}  projects=${PROJ:-?}"
  else
    echo "  pg_isready: НЕ отвечает"
  fi

  H "App изнутри (http://localhost:3000)"
  curl -sI --max-time 5 -o /dev/null \
    -w '  code=%{http_code} time=%{time_total}s\n' \
    http://localhost:3000/ 2>/dev/null || echo "  (не отвечает)"

  H "Логи app — последние 25 строк"
  docker compose logs --tail=25 --no-color app 2>&1 | sed 's/^/  /'

  H "Логи caddy — последние 25 строк (фильтр: error/cert)"
  docker compose logs --tail=300 --no-color caddy 2>&1 \
    | grep -iE 'error|certificate|obtained|failed|tls' \
    | tail -25 | sed 's/^/  /' \
    || echo "  (без ошибок/событий сертификата)"
fi

H "Ресурсы хоста"
if command -v free >/dev/null 2>&1; then
  free -h | sed 's/^/  /'
else
  echo "  free недоступен (вероятно, не Linux)"
fi
df -h / 2>/dev/null | sed 's/^/  /'

H "Готово"

#!/usr/bin/env bash
# TaskFlow: глубокая диагностика сайта + безопасные авто-починки.
# Что делает:
#   1) Полный набор проб: контейнеры, домен снаружи (5 эндпоинтов),
#      app:3000 изнутри (3 эндпоинта), реальный HTML главной (размер,
#      количество JS-чанков, проверка отдачи одного из них), заголовки,
#      .env-ключи (без секретов), логи app/caddy, сетевые параметры (MTU/MSS).
#   2) Авто-починка по сценарию:
#        - app не отвечает изнутри :3000  -> docker compose restart app
#        - снаружи не ок, но изнутри ок   -> docker compose restart caddy
#        - всё ок снаружи и изнутри       -> диагноз «не сервер, а клиент»
#   3) Без деструктивных операций. Volumes (БД) не трогаются.
#
# Запуск: curl -fsSL https://raw.githubusercontent.com/emylfy/taskflow-diploma/main/scripts/diagnose.sh | bash

set -u
[ -d /opt/taskflow ] && cd /opt/taskflow
[ ! -f docker-compose.yml ] && { echo "Не в каталоге проекта (нет docker-compose.yml)"; exit 1; }

DOMAIN=$(awk -F= '/^APP_DOMAIN=/{gsub(/["\r]/,"",$2); print $2; exit}' .env 2>/dev/null)
[ -z "$DOMAIN" ] && { echo "Не нашёл APP_DOMAIN в .env"; exit 1; }

H() { printf '\n========== %s ==========\n' "$*"; }
DID_FIX=0

H "Контекст"
echo "  Дата:    $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
echo "  Домен:   $DOMAIN"
echo "  Каталог: $(pwd)"
echo "  Docker:  $(docker --version 2>/dev/null)"

H "Контейнеры"
docker compose ps --format 'table {{.Service}}\t{{.State}}\t{{.Status}}' 2>&1 | sed 's/^/  /'

# --- внешние пробы (через Caddy + TLS, как видит реальный пользователь) ---
H "Probe внешний (https://$DOMAIN)"
EXT_USER_OK=1
for p in / /login /pricing; do
  result=$(curl -sI --max-time 10 -o /dev/null \
    -w 'code=%{http_code} ct=%{content_type} size=%{size_download} time=%{time_total}s' \
    "https://$DOMAIN$p" 2>&1)
  printf '  %-30s %s\n' "$p" "$result"
  echo "$result" | grep -qE 'code=(2|3)[0-9]{2}' || EXT_USER_OK=0
done
# Не критичны для пасс/фейл, просто инфо:
for p in /api/auth/get-session /favicon.ico; do
  result=$(curl -sI --max-time 10 -o /dev/null \
    -w 'code=%{http_code} ct=%{content_type} size=%{size_download}' \
    "https://$DOMAIN$p" 2>&1)
  printf '  %-30s %s\n' "$p" "$result"
done

# --- внутренний пробинг (минуя Caddy) ---
H "Probe внутренний (http://localhost:3000)"
INT_OK=1
for p in / /login /pricing; do
  code=$(curl -sI --max-time 5 -o /dev/null -w '%{http_code}' "http://localhost:3000$p" 2>/dev/null)
  printf '  %-30s code=%s\n' "$p" "${code:-(timeout)}"
  [ "$code" = "200" ] || INT_OK=0
done

# --- содержимое главной ---
H "HTML главной"
HTML=$(curl -s --max-time 10 "https://$DOMAIN/" 2>/dev/null)
SIZE=${#HTML}
echo "  размер: $SIZE байт"
if [ "$SIZE" -lt 500 ]; then
  echo "  !!! Подозрительно мало — содержимое:"
  echo "${HTML:-(пусто)}" | sed 's/^/    /'
else
  title=$(printf '%s' "$HTML" | grep -oE '<title>[^<]+' | sed 's/<title>//' | head -1)
  echo "  <title>: ${title:-(не найден)}"
  CHUNKS=$(printf '%s' "$HTML" | grep -oE '_next/static/chunks/[a-zA-Z0-9_./-]+\.js' | sort -u)
  CSS=$(printf '%s' "$HTML" | grep -oE '_next/static/css/[a-zA-Z0-9_./-]+\.css' | sort -u)
  chunk_n=$(printf '%s' "$CHUNKS" | grep -c . || true)
  css_n=$(printf '%s' "$CSS" | grep -c . || true)
  echo "  JS-чанков:  $chunk_n уник."
  echo "  CSS-файлов: $css_n уник."
  FIRST_CHUNK=$(printf '%s' "$CHUNKS" | head -1)
  if [ -n "$FIRST_CHUNK" ]; then
    asset_code=$(curl -sI --max-time 5 -o /dev/null -w '%{http_code} size=%{size_download}' "https://$DOMAIN/$FIRST_CHUNK")
    echo "  один JS-чанк ($FIRST_CHUNK): $asset_code"
  else
    echo "  !!! HTML не содержит ссылок на _next/static/chunks — билд сломан"
  fi
fi

H "Заголовки HTML главной"
curl -sI --max-time 5 "https://$DOMAIN/" \
  | grep -iE '^(HTTP|cache-control|content-type|server|strict-transport|x-content)' \
  | sed 's/^/  /'

H ".env (значения секретов скрыты)"
awk -F= '
/^[A-Z][A-Z_]*=/ {
  k = $1
  if (k ~ /SECRET|PASSWORD|KEY|DATABASE_URL/) printf "  %s=<скрыт>\n", k
  else print "  " $0
}
' .env

H "Логи app — 50 строк (без фильтра)"
docker compose logs --tail=50 --no-color app 2>&1 | sed 's/^/  /'

H "Логи caddy — error/warn/listening (макс. 30 из последних 300)"
out=$(docker compose logs --tail=300 --no-color caddy 2>&1 \
  | grep -iE 'error|warn|listening|enabling|obtain|fail' | tail -30)
if [ -n "$out" ]; then
  printf '%s\n' "$out" | sed 's/^/  /'
else
  echo "  (чисто)"
fi

H "Сетевое (MTU интерфейса и MSS-клэмп)"
IFACE=$(ip route show default | awk '/default/{print $5; exit}')
echo "  интерфейс: ${IFACE:-?}"
[ -n "${IFACE:-}" ] && ip link show "$IFACE" 2>/dev/null | head -1 | sed 's/^/  /'
echo "  MSS-клэмп в iptables:"
iptables -t mangle -L FORWARD -n 2>/dev/null | grep -iE 'tcpmss|mss' | sed 's/^/    /' \
  || echo "    (правило отсутствует — на канале с урезанным MTU это даст таймауты)"

# ============ РЕШЕНИЕ + АВТО-ПОЧИНКА ============
H "Анализ и действие"

if [ "$INT_OK" -eq 0 ]; then
  echo "  ДИАГНОЗ: приложение не отвечает изнутри сети compose."
  echo "  ДЕЙСТВИЕ: docker compose restart app"
  docker compose restart app
  DID_FIX=1
  echo "  Жду 8 секунд и проверяю снова..."
  sleep 8
  for p in / /login; do
    code=$(curl -sI --max-time 5 -o /dev/null -w '%{http_code}' "http://localhost:3000$p" 2>/dev/null)
    printf '    после restart: %-15s code=%s\n' "$p" "${code:-(timeout)}"
  done
elif [ "$EXT_USER_OK" -eq 0 ]; then
  echo "  ДИАГНОЗ: изнутри всё ок, а снаружи нет — проблема в Caddy/TLS/маршрутизации."
  echo "  ДЕЙСТВИЕ: docker compose restart caddy"
  docker compose restart caddy
  DID_FIX=1
  echo "  Жду 6 секунд и проверяю снова..."
  sleep 6
  for p in / /login; do
    code=$(curl -sI --max-time 10 -o /dev/null -w '%{http_code}' "https://$DOMAIN$p" 2>/dev/null)
    printf '    после restart: %-15s code=%s\n' "$p" "${code:-(timeout)}"
  done
else
  echo "  ДИАГНОЗ: сервер отдаёт сайт корректно (все 2xx/3xx и снаружи, и изнутри)."
  echo "  Проблема НЕ на сервере. Что делать на стороне клиента:"
  echo "    1) Откройте сайт в приватном окне браузера (Ctrl+Shift+N в Chrome)."
  echo "    2) Если не помогло — Ctrl+Shift+Delete -> очистить кэш и cookies."
  echo "    3) F12 -> Network/Console: какие запросы красные? Скопируйте."
  echo "    4) Попробуйте с мобильного интернета (телефон точкой доступа)."
  echo "       Иногда провайдеры в РФ режут *.nip.io DPI-фильтром."
fi

H "Готово"
if [ "$DID_FIX" -eq 1 ]; then
  echo "  Авто-действие выполнено. Снова откройте сайт в incognito-окне."
else
  echo "  Авто-действий не потребовалось — сервер здоров."
fi

#!/bin/bash
# Start all GeoWatch services and optionally open the browser
# Usage: ./scripts/start-geowatch.sh [--no-browser] [service1 service2 ...]
#   Services: martin backend admin-web user-web superadmin-web
#   Default (no args): starts all services

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MBTILES_FILE="$PROJECT_ROOT/assets/tiles/tiles.mbtiles"
MARTIN_BIN="$PROJECT_ROOT/tools/martin"
LOGS_DIR="$PROJECT_ROOT/logs"
mkdir -p "$LOGS_DIR"

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Args
OPEN_BROWSER=true
REQUESTED_SERVICES=()

for arg in "$@"; do
  case "$arg" in
    --no-browser) OPEN_BROWSER=false ;;
    *) REQUESTED_SERVICES+=("$arg") ;;
  esac
done

# If no services specified, start all
if [ ${#REQUESTED_SERVICES[@]} -eq 0 ]; then
  REQUESTED_SERVICES=(martin backend admin-web user-web superadmin-web)
fi

should_start() {
  local svc="$1"
  for s in "${REQUESTED_SERVICES[@]}"; do
    [ "$s" = "$svc" ] && return 0
  done
  return 1
}

# PID helpers
pid_file() { echo "$LOGS_DIR/$1.pid"; }

is_running() {
  local pidfile=$(pid_file "$1")
  [ -f "$pidfile" ] || return 1
  local pid=$(cat "$pidfile" 2>/dev/null)
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

save_pid() {
  local svc="$1"
  local pid="$2"
  echo "$pid" > "$(pid_file "$svc")"
}

start_service() {
  local svc="$1"
  local cmd="$2"
  local log="$LOGS_DIR/$svc.log"
  local pidfile=$(pid_file "$svc")

  if is_running "$svc"; then
    echo -e "${YELLOW}⚠  $svc is already running (PID $(cat "$pidfile"))${NC}"
    return 0
  fi

  # Clear old log and PID
  > "$log" 2>/dev/null || true
  rm -f "$pidfile"

  # Write a launcher script that cd's properly and records the PID
  local launcher="$LOGS_DIR/.launch-$svc-$$.sh"
  cat > "$launcher" <<EOF
#!/bin/bash
cd "$PROJECT_ROOT"
$cmd &
MAINPID=\$!
echo \$MAINPID > "$pidfile"
wait \$MAINPID
rm -f "$pidfile"
EOF
  chmod +x "$launcher"
  nohup bash "$launcher" >> "$log" 2>&1 &
  local launcher_pid=$!

  # Wait briefly for PID file to appear
  sleep 0.5
  local attempts=0
  while [ ! -f "$pidfile" ] && [ $attempts -lt 20 ]; do
    sleep 0.2
    attempts=$((attempts + 1))
  done

  rm -f "$launcher"

  if [ -f "$pidfile" ]; then
    local pid=$(cat "$pidfile")
    if kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
  fi
  return 1
}

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}     GeoWatch Launcher${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# ─── Martin ───
if should_start martin; then
  if [ ! -f "$MARTIN_BIN" ]; then
    echo -e "${RED}❌ Martin binary not found at $MARTIN_BIN${NC}"
    echo "   Run: npm run setup:martin"
    exit 1
  fi
  if [ ! -f "$MBTILES_FILE" ]; then
    echo -e "${RED}❌ MBTiles file not found at $MBTILES_FILE${NC}"
    exit 1
  fi
  echo -e "${CYAN}🗺️  Starting Martin tile server...${NC}"
  if start_service martin "$MARTIN_BIN -l 0.0.0.0:8080 $MBTILES_FILE"; then
    sleep 2
    echo -e "${GREEN}   ✓ Martin running on http://localhost:8080${NC}"
  else
    echo -e "${RED}   ✗ Martin failed to start${NC}"
  fi
fi

# ─── Backend ───
if should_start backend; then
  echo -e "${CYAN}🔌 Starting backend API...${NC}"
  if start_service backend "cd src/backend && npx nodemon server.js"; then
    sleep 3
    echo -e "${GREEN}   ✓ Backend running on http://localhost:3000${NC}"
  else
    echo -e "${RED}   ✗ Backend failed to start${NC}"
  fi
fi

# ─── Admin Web ───
if should_start admin-web; then
  echo -e "${CYAN}🖥️  Starting admin dashboard...${NC}"
  if start_service admin-web "cd src/admin-web && npx vite --port 5174"; then
    sleep 4
    echo -e "${GREEN}   ✓ Admin dashboard running on http://localhost:5174${NC}"
  else
    echo -e "${RED}   ✗ Admin dashboard failed to start${NC}"
  fi
fi

# ─── User Web ───
if should_start user-web; then
  echo -e "${CYAN}🌐 Starting user website...${NC}"
  if start_service user-web "cd src/user-web && npx vite --port 5173"; then
    sleep 4
    echo -e "${GREEN}   ✓ User website running on http://localhost:5173${NC}"
  else
    echo -e "${RED}   ✗ User website failed to start${NC}"
  fi
fi

# ─── Superadmin Web ───
if should_start superadmin-web; then
  echo -e "${CYAN}🛡️  Starting superadmin console...${NC}"
  if start_service superadmin-web "cd src/superadmin-web && npx vite --port 5175"; then
    sleep 4
    echo -e "${GREEN}   ✓ Superadmin console running on http://localhost:5175${NC}"
  else
    echo -e "${RED}   ✗ Superadmin console failed to start${NC}"
  fi
fi

# ─── Browser ───
if [ "$OPEN_BROWSER" = true ] && should_start admin-web; then
  echo ""
  echo -e "${CYAN}🚀 Opening browser...${NC}"
  sleep 2
  xdg-open http://localhost:5174 2>/dev/null || open http://localhost:5174 2>/dev/null || echo -e "${YELLOW}   Could not auto-open browser.${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  GeoWatch is live!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "  ${CYAN}User Website:${NC}       http://localhost:5173"
echo -e "  ${CYAN}Admin Dashboard:${NC}    http://localhost:5174"
echo -e "  ${CYAN}Superadmin Console:${NC} http://localhost:5175"
echo -e "  ${CYAN}Backend API:${NC}        http://localhost:3000"
echo -e "  ${CYAN}Martin Tiles:${NC}       http://localhost:8080"
echo ""
echo -e "  ${YELLOW}Logs:${NC}    ./logs/"
echo -e "  ${YELLOW}Status:${NC}  ./scripts/status-geowatch.sh"
echo -e "  ${YELLOW}Stop:${NC}    ./scripts/stop-geowatch.sh"
echo -e "  ${YELLOW}Tail:${NC}    ./scripts/logs-geowatch.sh"
echo ""
echo -e "  ${YELLOW}Start individual:${NC}"
echo -e "    ./scripts/start-geowatch.sh martin"
echo -e "    ./scripts/start-geowatch.sh backend"
echo -e "    ./scripts/start-geowatch.sh admin-web"
echo -e "    ./scripts/start-geowatch.sh user-web"
echo -e "    ./scripts/start-geowatch.sh superadmin-web"
echo ""
echo -e "${GREEN}========================================${NC}"

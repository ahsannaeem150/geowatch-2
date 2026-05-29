#!/bin/bash
# Stop GeoWatch services
# Usage: ./scripts/stop-geowatch.sh [service1 service2 ...]
#   Services: martin backend admin-web user-web superadmin-web
#   Default (no args): stops all services

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOGS_DIR="$PROJECT_ROOT/logs"
mkdir -p "$LOGS_DIR"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

REQUESTED_SERVICES=("$@")
if [ ${#REQUESTED_SERVICES[@]} -eq 0 ]; then
  REQUESTED_SERVICES=(martin backend admin-web user-web superadmin-web)
fi

should_stop() {
  local svc="$1"
  for s in "${REQUESTED_SERVICES[@]}"; do
    [ "$s" = "$svc" ] && return 0
  done
  return 1
}

pid_file() { echo "$LOGS_DIR/$1.pid"; }

stop_service() {
  local name="$1"
  local pidfile=$(pid_file "$name")

  if [ -f "$pidfile" ]; then
    local pid=$(cat "$pidfile" 2>/dev/null)
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill -TERM "$pid" 2>/dev/null || true
      sleep 1
      if kill -0 "$pid" 2>/dev/null; then
        kill -KILL "$pid" 2>/dev/null || true
        sleep 0.5
      fi
      if kill -0 "$pid" 2>/dev/null; then
        echo -e "${RED}  ✗ $name could not be stopped (PID $pid)${NC}"
      else
        echo -e "${GREEN}  ✓ $name stopped${NC}"
      fi
    else
      echo -e "${YELLOW}  ⚠ $name was not running (stale PID file)${NC}"
    fi
    rm -f "$pidfile"
  else
    # Fallback: try pgrep pattern matching
    local pattern=""
    case "$name" in
      martin) pattern="tools/martin" ;;
      backend) pattern="nodemon server.js" ;;
      admin-web) pattern="vite --port 5174" ;;
      user-web) pattern="vite --port 5173" ;;
      superadmin-web) pattern="vite --port 5175" ;;
    esac
    local pids=$(pgrep -f "$pattern" 2>/dev/null || true)
    if [ -n "$pids" ]; then
      echo "$pids" | xargs kill -TERM 2>/dev/null || true
      sleep 1
      local still=$(pgrep -f "$pattern" 2>/dev/null || true)
      if [ -n "$still" ]; then
        echo "$still" | xargs kill -KILL 2>/dev/null || true
      fi
      echo -e "${GREEN}  ✓ $name stopped (fallback pgrep)${NC}"
    else
      echo -e "${YELLOW}  ⚠ $name was not running${NC}"
    fi
  fi
}

echo -e "${CYAN}Stopping GeoWatch services...${NC}"

for svc in martin backend admin-web user-web superadmin-web; do
  if should_stop "$svc"; then
    stop_service "$svc"
  fi
done

echo ""
echo -e "${GREEN}Done.${NC}"

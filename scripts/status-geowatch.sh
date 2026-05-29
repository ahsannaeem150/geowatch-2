#!/bin/bash
# Check which GeoWatch services are running
# Usage: ./scripts/status-geowatch.sh

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOGS_DIR="$PROJECT_ROOT/logs"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pid_file() { echo "$LOGS_DIR/$1.pid"; }

is_running() {
  local pidfile=$(pid_file "$1")
  [ -f "$pidfile" ] || return 1
  local pid=$(cat "$pidfile" 2>/dev/null)
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

service_url() {
  case "$1" in
    martin) echo "http://localhost:8080" ;;
    backend) echo "http://localhost:3000/api/v1/system/health" ;;
    admin-web) echo "http://localhost:5174" ;;
    user-web) echo "http://localhost:5173" ;;
    superadmin-web) echo "http://localhost:5175" ;;
  esac
}

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  GeoWatch Service Status${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

for svc in martin backend admin-web user-web superadmin-web; do
  if is_running "$svc"; then
    svc_pid=$(cat "$(pid_file "$svc")" 2>/dev/null)
    svc_url=$(service_url "$svc")
    svc_status=$(curl -s -o /dev/null -w "%{http_code}" "$svc_url" 2>/dev/null || echo "???")
    if [ "$svc_status" = "200" ] || [ "$svc_status" = "401" ] || [ "$svc_status" = "000" ]; then
      echo -e "  ${GREEN}●${NC} $svc  ${GREEN}running${NC}  (PID $svc_pid, HTTP $svc_status)"
    else
      echo -e "  ${YELLOW}●${NC} $svc  ${YELLOW}starting${NC} (PID $svc_pid, HTTP $svc_status)"
    fi
  else
    echo -e "  ${RED}○${NC} $svc  ${RED}stopped${NC}"
  fi
done

echo ""
echo -e "${CYAN}========================================${NC}"

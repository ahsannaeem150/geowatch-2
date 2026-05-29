#!/bin/bash
# Tail all GeoWatch logs
# Usage: ./scripts/logs-geowatch.sh [service]
#   With no arg: shows last 20 lines of all services
#   With arg: shows last 50 lines of that service + follows

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOGS_DIR="$PROJECT_ROOT/logs"

CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

SERVICE="$1"

if [ -n "$SERVICE" ]; then
  logfile="$LOGS_DIR/$SERVICE.log"
  if [ -f "$logfile" ]; then
    echo -e "${CYAN}--- $SERVICE (tail -f) ---${NC}"
    tail -n 50 -f "$logfile"
  else
    echo -e "${YELLOW}No log file for $SERVICE${NC}"
    exit 1
  fi
  exit 0
fi

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  GeoWatch Logs${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

for service in martin backend admin-web user-web superadmin-web; do
    logfile="$LOGS_DIR/$service.log"
    if [ -f "$logfile" ]; then
        echo -e "${YELLOW}--- $service ---${NC}"
        tail -n 20 "$logfile"
        echo ""
    else
        echo -e "${YELLOW}--- $service --- (no log file yet)${NC}"
        echo ""
    fi
done

echo -e "${CYAN}========================================${NC}"
echo ""
echo "To watch a specific service live:"
echo "  ./scripts/logs-geowatch.sh martin"
echo "  ./scripts/logs-geowatch.sh backend"
echo "  ./scripts/logs-geowatch.sh admin-web"
echo "  ./scripts/logs-geowatch.sh user-web"
echo "  ./scripts/logs-geowatch.sh superadmin-web"

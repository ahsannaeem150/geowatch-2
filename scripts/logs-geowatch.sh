#!/bin/bash
# Tail all GeoWatch logs
# Usage: ./scripts/logs-geowatch.sh

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  GeoWatch Logs${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

for service in martin backend admin-web user-web; do
    logfile="$PROJECT_ROOT/logs/$service.log"
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
echo "To watch logs live, run:"
echo "  tail -f logs/martin.log"
echo "  tail -f logs/backend.log"
echo "  tail -f logs/admin-web.log"
echo "  tail -f logs/user-web.log"

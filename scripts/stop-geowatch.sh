#!/bin/bash
# Stop all GeoWatch services
# Usage: ./scripts/stop-geowatch.sh

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}Stopping GeoWatch services...${NC}"

kill_process() {
    local name="$1"
    local pattern="$2"
    local pids=$(pgrep -f "$pattern" 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo "$pids" | xargs kill -TERM 2>/dev/null || true
        sleep 1
        # Force kill if still running
        local still_running=$(pgrep -f "$pattern" 2>/dev/null || true)
        if [ -n "$still_running" ]; then
            echo "$still_running" | xargs kill -KILL 2>/dev/null || true
        fi
        echo -e "${GREEN}  ✓ $name stopped${NC}"
    else
        echo -e "${YELLOW}  ⚠ $name was not running${NC}"
    fi
}

kill_process "Martin tile server" "tools/martin"
kill_process "Backend API" "nodemon server.js"
kill_process "Admin dashboard" "vite --port 5174"

echo ""
echo -e "${GREEN}All GeoWatch services stopped.${NC}"

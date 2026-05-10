#!/bin/bash
# Start all GeoWatch services and open the browser
# Usage: ./scripts/start-geowatch.sh

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MBTILES_FILE="$PROJECT_ROOT/assets/tiles/tiles.mbtiles"
MARTIN_BIN="$PROJECT_ROOT/tools/martin"

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

mkdir -p "$PROJECT_ROOT/logs"

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}     GeoWatch Launcher${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Check prerequisites
if [ ! -f "$MARTIN_BIN" ]; then
    echo -e "${RED}❌ Martin binary not found at $MARTIN_BIN${NC}"
    echo "   Run: npm run setup:martin"
    exit 1
fi

if [ ! -f "$MBTILES_FILE" ]; then
    echo -e "${RED}❌ MBTiles file not found at $MBTILES_FILE${NC}"
    exit 1
fi

# Check if services are already running
check_running() {
    pgrep -f "$1" > /dev/null 2>&1
}

if check_running "tools/martin"; then
    echo -e "${YELLOW}⚠️  Martin is already running${NC}"
else
    echo -e "${CYAN}🗺️  Starting Martin tile server...${NC}"
    nohup "$MARTIN_BIN" -l "0.0.0.0:8080" "$MBTILES_FILE" > "$PROJECT_ROOT/logs/martin.log" 2>&1 &
    sleep 2
    echo -e "${GREEN}   ✓ Martin running on http://localhost:8080${NC}"
fi

if check_running "nodemon server.js"; then
    echo -e "${YELLOW}⚠️  Backend is already running${NC}"
else
    echo -e "${CYAN}🔌 Starting backend API...${NC}"
    cd "$PROJECT_ROOT/src/backend"
    nohup npx nodemon server.js > "$PROJECT_ROOT/logs/backend.log" 2>&1 &
    sleep 3
    echo -e "${GREEN}   ✓ Backend running on http://localhost:3000${NC}"
fi

if check_running "vite --port 5174"; then
    echo -e "${YELLOW}⚠️  Admin dashboard is already running${NC}"
else
    echo -e "${CYAN}🖥️  Starting admin dashboard...${NC}"
    cd "$PROJECT_ROOT/src/admin-web"
    nohup npx vite --port 5174 > "$PROJECT_ROOT/logs/admin-web.log" 2>&1 &
    sleep 4
    echo -e "${GREEN}   ✓ Admin dashboard running on http://localhost:5174${NC}"
fi

if check_running "vite --port 5173"; then
    echo -e "${YELLOW}⚠️  User website is already running${NC}"
else
    echo -e "${CYAN}🌐 Starting user website...${NC}"
    cd "$PROJECT_ROOT/src/user-web"
    nohup npx vite --port 5173 > "$PROJECT_ROOT/logs/user-web.log" 2>&1 &
    sleep 4
    echo -e "${GREEN}   ✓ User website running on http://localhost:5173${NC}"
fi

echo ""
echo -e "${CYAN}🚀 Opening browser...${NC}"
sleep 2
xdg-open http://localhost:5174 2>/dev/null || open http://localhost:5174 2>/dev/null || echo -e "${YELLOW}   Could not auto-open browser. Visit http://localhost:5174 manually.${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  GeoWatch is live!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "  ${CYAN}User Website:${NC}    http://localhost:5173"
echo -e "  ${CYAN}Admin Dashboard:${NC} http://localhost:5174"
echo -e "  ${CYAN}Backend API:${NC}     http://localhost:3000"
echo -e "  ${CYAN}Martin Tiles:${NC}    http://localhost:8080"
echo ""
echo -e "  ${YELLOW}Logs:${NC} ./logs/"
echo -e "  ${YELLOW}Stop:${NC} ./scripts/stop-geowatch.sh"
echo -e "  ${YELLOW}Tail logs:${NC} ./scripts/logs-geowatch.sh"
echo ""
echo -e "${GREEN}========================================${NC}"

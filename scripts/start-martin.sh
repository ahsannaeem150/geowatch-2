#!/bin/bash
# Start Martin tile server for GeoWatch
# Usage: ./scripts/start-martin.sh

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MARTIN_BIN="$PROJECT_ROOT/tools/martin"
MBTILES_FILE="$PROJECT_ROOT/assets/tiles/tiles.mbtiles"
PORT="${MARTIN_PORT:-8080}"

if [ ! -f "$MARTIN_BIN" ]; then
    echo "❌ Martin binary not found at $MARTIN_BIN"
    echo "   Download it from: https://github.com/maplibre/martin/releases"
    exit 1
fi

if [ ! -f "$MBTILES_FILE" ]; then
    echo "❌ MBTiles file not found at $MBTILES_FILE"
    exit 1
fi

echo "🗺️  Starting Martin tile server..."
echo "   Tiles: $MBTILES_FILE"
echo "   Port:  $PORT"
echo "   URL:   http://localhost:$PORT"
echo ""

exec "$MARTIN_BIN" -l "0.0.0.0:$PORT" "$MBTILES_FILE"

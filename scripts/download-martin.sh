#!/bin/bash
# Download Martin tile server binary for GeoWatch
# Usage: ./scripts/download-martin.sh

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MARTIN_DIR="$PROJECT_ROOT/tools"
MARTIN_BIN="$MARTIN_DIR/martin"

# Latest stable Martin release
MARTIN_VERSION="v1.8.2"
MARTIN_URL="https://github.com/maplibre/martin/releases/download/martin-${MARTIN_VERSION}/martin-x86_64-unknown-linux-gnu.tar.gz"

if [ -f "$MARTIN_BIN" ]; then
    echo "✅ Martin already exists at $MARTIN_BIN"
    "$MARTIN_BIN" --version
    exit 0
fi

echo "⬇️  Downloading Martin ${MARTIN_VERSION}..."
mkdir -p "$MARTIN_DIR"
cd "$MARTIN_DIR"

curl -L -o martin.tar.gz "$MARTIN_URL"
tar -xzf martin.tar.gz
rm martin.tar.gz
chmod +x martin

echo "✅ Martin installed successfully"
"$MARTIN_BIN" --version

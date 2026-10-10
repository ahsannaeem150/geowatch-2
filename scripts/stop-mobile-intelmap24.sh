#!/usr/bin/env bash
# =============================================================================
# IntelMap24 — Mobile App: STOP helper
# =============================================================================
# Usage: ./scripts/stop-mobile-intelmap24.sh <target>
#
#   metro      stop the Metro bundler (port 8081)
#   services   stop backend + martin (the mobile-only services)
#   connect    remove all adb reverse port forwards
#   all        metro + services + connect
#
# Web frontends are NOT touched here — use ./scripts/stop-intelmap24.sh for
# them, or ./scripts/stop-all-intelmap24.sh to stop absolutely everything.
# =============================================================================
set -uo pipefail
export PATH="$PATH:$HOME/Android/Sdk/platform-tools"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Force-free a port whose listener survived the PID-file based stop
# (orphaned node/vite children keep the port and cause EADDRINUSE next start).
free_port() {
  local port="$1"
  local pids
  pids=$(ss -tlnp 2>/dev/null | grep ":${port} " | grep -oP 'pid=\K[0-9]+' | sort -u)
  if [[ -n "$pids" ]]; then
    echo "$pids" | xargs -r kill 2>/dev/null
    sleep 1
    pids=$(ss -tlnp 2>/dev/null | grep ":${port} " | grep -oP 'pid=\K[0-9]+' | sort -u)
    [[ -n "$pids" ]] && echo "$pids" | xargs -r kill -9 2>/dev/null
    echo "✓ port $port freed (orphaned process killed)"
  fi
}

cmd_metro() {
  if pkill -f "react-native start --port 8081"; then
    echo "✓ Metro stopped"
  else
    echo "○ Metro was not running"
  fi
  free_port 8081
}

cmd_services() {
  "$ROOT_DIR/scripts/stop-intelmap24.sh" backend martin
  # Orphan sweep: nodemon wrappers survive PID-file stops and would respawn
  # server.js on the next file change — kill the whole watcher chain.
  pkill -f "nodemon server.js" 2>/dev/null && echo "✓ backend watcher (nodemon) stopped" || true
  free_port 3100
  free_port 8080
}

cmd_connect() {
  if adb devices | grep -qw device; then
    adb reverse --remove-all
    echo "✓ adb reverse cleared"
  else
    echo "○ No device connected (nothing to clear)"
  fi
}

case "${1:-}" in
  metro)    cmd_metro ;;
  services) cmd_services ;;
  connect)  cmd_connect ;;
  all)
    cmd_metro
    cmd_services
    cmd_connect
    echo "✓ Mobile stack fully stopped"
    ;;
  *)
    sed -n '2,14p' "${BASH_SOURCE[0]}"
    exit 1
    ;;
esac

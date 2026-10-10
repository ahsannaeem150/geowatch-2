#!/usr/bin/env bash
# =============================================================================
# IntelMap24 — STOP EVERYTHING (mobile stack + all five web-side services)
# =============================================================================
# Usage: ./scripts/stop-all-intelmap24.sh
#
# Stops, in order:
#   1. Metro bundler + adb reverse forwards   (stop-mobile-intelmap24.sh all)
#   2. backend + martin                       (already covered by step 1,
#                                              harmless if repeated)
#   3. user-web + admin-web + superadmin-web  (stop-intelmap24.sh)
# =============================================================================
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

"$ROOT_DIR/scripts/stop-mobile-intelmap24.sh" all
echo ""
"$ROOT_DIR/scripts/stop-intelmap24.sh"

# Force-free web ports too (orphaned vite children survive PID-file stops)
for port in 5173 5174 5175; do
  pids=$(ss -tlnp 2>/dev/null | grep ":${port} " | grep -oP 'pid=\K[0-9]+' | sort -u)
  if [[ -n "$pids" ]]; then
    echo "$pids" | xargs -r kill 2>/dev/null; sleep 1
    pids=$(ss -tlnp 2>/dev/null | grep ":${port} " | grep -oP 'pid=\K[0-9]+' | sort -u)
    [[ -n "$pids" ]] && echo "$pids" | xargs -r kill -9 2>/dev/null
    echo "✓ port $port freed (orphaned process killed)"
  fi
done

echo ""
echo "✓ Everything is stopped (mobile + web + backend + martin)"

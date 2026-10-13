#!/usr/bin/env bash
# =============================================================================
# IntelMap24 — Mobile App: START helper (physical Android device over USB)
# =============================================================================
# Usage: ./scripts/start-mobile-intelmap24.sh <target>
#
#   connect    adb reverse ports — run EVERY time the phone is (re)plugged
#   connect-wireless <ip:port> [pair-ip:port pair-code]
#              Wireless adb: connect to the phone over WiFi, then set the same
#              adb reverse ports as 'connect'. If the phone was never paired,
#              pass the PAIRING ip:port + 6-digit code from
#              Settings → Developer options → Wireless debugging → "Pair device
#              with pairing code" as the 2nd/3rd args (pair once, then only
#              the plain form is needed — note the CONNECT port is the one on
#              the main wireless-debugging screen, NOT the pairing port).
#              Example:
#                connect-wireless 192.168.0.100:41667
#                connect-wireless 192.168.0.100:41667 192.168.0.100:37547 641812
#   services   start ONLY backend (API + font glyphs) + martin — all three web
#              apps stay stopped. Streams their logs (Ctrl+C detaches, services
#              keep running)
#   metro      Metro bundler (FOREGROUND — logs + r/j keys, Ctrl+C to stop)
#   logs       stream the phone's JS logs (react-native log-android)
#   build      build debug APK + push to the phone's Download folder (install
#              via Files app — MIUI blocks adb install)
#   all        connect + services (daemonized, no log stream). Then run
#              'metro' yourself in a second terminal.
#
# Typical session (mobile-only work):
#   1. plug phone   → ./scripts/start-mobile-intelmap24.sh connect
#   2. terminal 1   → ./scripts/start-mobile-intelmap24.sh services
#   3. terminal 2   → ./scripts/start-mobile-intelmap24.sh metro
#
# Full-stack (mobile + all 3 web apps): ./scripts/start-intelmap24.sh as usual,
# plus connect + metro from this script.
# Stop anything: ./scripts/stop-mobile-intelmap24.sh <target|all>
# =============================================================================
set -euo pipefail
export PATH="$PATH:$HOME/Android/Sdk/platform-tools"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE_DIR="$ROOT_DIR/src/mobile-app"

require_device() {
  if ! adb devices | grep -qw device; then
    echo "✗ No authorized Android device found. Plug the phone, allow USB"
    echo "  debugging on its screen, then re-run."
    exit 1
  fi
}

cmd_connect() {
  require_device
  adb reverse tcp:3100 tcp:3100   # backend API + font glyphs
  adb reverse tcp:8080 tcp:8080   # Martin tiles
  adb reverse tcp:8081 tcp:8081   # Metro bundler
  echo "✓ adb reverse set: 3100 (API + fonts) · 8080 (Martin) · 8081 (Metro)"
}

cmd_connect_wireless() {
  local target="${1:-}" pair_target="${2:-}" pair_code="${3:-}"
  if [ -z "$target" ]; then
    echo "✗ Usage: connect-wireless <ip:port> [pair-ip:port pair-code]"
    echo "  ip:port = CONNECT address from the main Wireless debugging screen"
    exit 1
  fi
  if [ -n "$pair_target" ]; then
    if [ -z "$pair_code" ]; then
      echo "✗ Pairing needs the 6-digit code too: connect-wireless $target $pair_target <code>"
      exit 1
    fi
    echo "Pairing with $pair_target …"
    adb pair "$pair_target" "$pair_code"
  fi
  echo "Connecting to $target …"
  adb connect "$target"
  cmd_connect
}

start_services() {
  "$ROOT_DIR/scripts/start-intelmap24.sh" backend martin --no-browser
}

cmd_services() {
  start_services
  echo ""
  echo "Streaming logs (Ctrl+C detaches — services keep running)…"
  tail -f "$ROOT_DIR/logs/backend.log" "$ROOT_DIR/logs/martin.log"
}

cmd_metro() {
  cd "$MOBILE_DIR"
  exec npx react-native start --port 8081
}

cmd_logs() {
  require_device
  cd "$MOBILE_DIR"
  exec npx react-native log-android
}

cmd_build() {
  require_device
  export JAVA_HOME="$HOME/jdk"
  cd "$MOBILE_DIR/android"
  ./gradlew app:assembleDebug -x lint
  cd "$ROOT_DIR"
  adb push "$MOBILE_DIR/android/app/build/outputs/apk/debug/app-debug.apk" \
    /sdcard/Download/intelmap24-debug.apk
  echo "✓ APK pushed → on the phone: Files → Download → intelmap24-debug.apk → Install"
}

case "${1:-}" in
  connect)          cmd_connect ;;
  connect-wireless) shift; cmd_connect_wireless "$@" ;;
  services) cmd_services ;;
  metro)    cmd_metro ;;
  logs)     cmd_logs ;;
  build)    cmd_build ;;
  all)
    cmd_connect
    start_services
    echo ""
    echo "✓ Mobile stack up. Now start Metro in a second terminal:"
    echo "  ./scripts/start-mobile-intelmap24.sh metro"
    ;;
  *)
    sed -n '2,28p' "${BASH_SOURCE[0]}"
    exit 1
    ;;
esac

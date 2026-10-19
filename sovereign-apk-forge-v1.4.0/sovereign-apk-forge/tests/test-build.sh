#!/usr/bin/env bash
# Test: template app builds end-to-end.
set -euo pipefail
FORGE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
echo "[test-build] Building template app..."
if "$FORGE/scripts/build-apk.sh" "$FORGE/template" "$TMP" 2>&1 | tail -5; then
    APK=$(find "$TMP" -name "*.apk" | head -1)
    [ -n "$APK" ] && [ -s "$APK" ] || { echo "FAIL: no apk produced"; exit 1; }
    echo "[test-build] PASS — APK produced: $(basename "$APK") ($(stat -c%s "$APK" 2>/dev/null || echo ?) bytes)"
    exit 0
else
    echo "[test-build] FAIL — build script errored"
    exit 1
fi

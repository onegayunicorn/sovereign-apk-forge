#!/usr/bin/env bash
# Sovereign APK Forge — install to connected device (adb) or Termux (local install).
# Usage: install-apk.sh <apk>
set -euo pipefail
APK="${1:?apk required}"
echo "=== Installing: $APK ==="
if command -v adb >/dev/null 2>&1 && adb get-state >/dev/null 2>&1; then
    adb install -r "$APK"
    echo "Installed via adb. Evidence upgrade: SIMULATED → DEMONSTRATED (launch to confirm)"
elif command -v termux-open >/dev/null 2>&1; then
    # Termux: open APK with package installer
    termux-open "$APK"
    echo "Opened APK in Android package installer (Termux)."
else
    echo "No adb device and not in Termux. Transfer $APK to device manually."
    exit 1
fi

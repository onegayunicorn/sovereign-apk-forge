#!/usr/bin/env bash
# Sovereign APK Forge — deterministic replay verification.
# Builds the same project twice; PASS only if SHA256 matches exactly.
# Usage: replay-verify.sh <project-dir>
set -euo pipefail
PROJECT="${1:?project dir required}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TMP1=$(mktemp -d); TMP2=$(mktemp -d)
trap 'rm -rf "$TMP1" "$TMP2"' EXIT

echo "=== Deterministic Replay Verification ==="
echo "Build 1..."
"$SCRIPT_DIR/build-apk.sh" "$PROJECT" "$TMP1" >/dev/null 2>&1
echo "Build 2..."
"$SCRIPT_DIR/build-apk.sh" "$PROJECT" "$TMP2" >/dev/null 2>&1

APK1=$(find "$TMP1" -name "*-signed.apk" | head -1)
APK2=$(find "$TMP2" -name "*-signed.apk" | head -1)

H1=$(sha256sum "$APK1" | cut -d' ' -f1)
H2=$(sha256sum "$APK2" | cut -d' ' -f1)
echo "  Run 1 SHA256: $H1"
echo "  Run 2 SHA256: $H2"

if [ "$H1" = "$H2" ]; then
    echo "RESULT: MATCH — deterministic build confirmed ✅"
    echo "Evidence upgrade: SIMULATED → VERIFIED (deterministic replay passed)"
    exit 0
else
    echo "RESULT: MISMATCH — build is NOT deterministic"
    echo "  (Check: timestamps in zip entries, locale, timezone, tool versions)"
    exit 1
fi

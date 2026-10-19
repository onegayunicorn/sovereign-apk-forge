#!/usr/bin/env bash
# Sovereign APK Forge — verify an APK: signature + manifest + SHA256 + no-ads audit.
# Usage: verify-apk.sh <apk> [expected-sha256]
set -euo pipefail

APK="${1:?apk required}"
EXPECTED="${2:-}"

echo "=== Sovereign APK Forge — Verification ==="
echo "APK: $APK"

PASS=0; FAIL=0
check() { if eval "$2"; then echo "  [PASS] $1"; PASS=$((PASS+1)); else echo "  [FAIL] $1"; FAIL=$((FAIL+1)); fi; }

check "APK exists" "[ -f '$APK' ]"
check "APK is valid zip" "unzip -t '$APK' >/dev/null 2>&1"
check "Contains AndroidManifest" "unzip -l '$APK' | grep -qi 'AndroidManifest.xml'"
check "Contains classes.dex" "unzip -l '$APK' | grep -qi 'classes.dex'"

if command -v apksigner >/dev/null 2>&1; then
    check "apksigner verify passes" "apksigner verify '$APK' >/dev/null 2>&1"
else
    echo "  [SKIP] apksigner not installed"
fi

ACTUAL=$(sha256sum "$APK" | cut -d' ' -f1)
echo "  SHA256: $ACTUAL"
if [ -n "$EXPECTED" ]; then
    check "SHA256 matches expected" "[ '$ACTUAL' = '$EXPECTED' ]"
fi

# No-ads / no-phoning audit
TMP=$(mktemp -d)
unzip -q -o "$APK" -d "$TMP" 2>/dev/null || true
AD_COUNT=0
for PAT in applovin firebase admob play-services-ads recaptcha mopub unity-ads ironsource; do
    if grep -rqi "$PAT" "$TMP" 2>/dev/null; then
        echo "  [WARN] Ad/tracker SDK detected: $PAT"
        AD_COUNT=$((AD_COUNT+1))
    fi
done
check "No ad/tracker SDKs (sovereign policy)" "[ $AD_COUNT -eq 0 ]"
rm -rf "$TMP"

echo ""
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]

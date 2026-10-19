#!/usr/bin/env bash
# Test: template source contains no ad/tracker SDK references.
set -euo pipefail
FORGE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "[test-no-ads] Scanning template for forbidden SDKs..."
COUNT=0
for PAT in applovin firebase admob play-services recaptcha mopub unity ironsource facebook flurry; do
    if grep -rqi "$PAT" "$FORGE/template" "$FORGE/config" 2>/dev/null; then
        echo "  FOUND: $PAT"
        COUNT=$((COUNT+1))
    fi
done
if [ "$COUNT" -eq 0 ]; then
    echo "[test-no-ads] PASS — no ad/tracker SDKs in sovereign template ✅"
    exit 0
else
    echo "[test-no-ads] FAIL — $COUNT forbidden references found"
    exit 1
fi

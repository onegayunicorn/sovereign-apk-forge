#!/usr/bin/env bash
# Sovereign APK Forge — fetch + verify build toolchain.
# Detects Termux vs Linux. Installs: aapt2, ecj (or javac), d8, zipalign, apksigner.
set -euo pipefail

echo "=== Sovereign APK Forge — Toolchain Bootstrap ==="
echo "Evidence: PROPOSED → DEMONSTRATED after first successful build"

detect_os() {
    if command -v termux-setup-storage >/dev/null 2>&1 || [ -d /data/data/com.termux ]; then
        echo "termux"
    else
        echo "linux"
    fi
}

OS=$(detect_os)
echo "Detected environment: $OS"

check_cmd() { command -v "$1" >/dev/null 2>&1; }

if [ "$OS" = "termux" ]; then
    echo "[Termux] Installing packages via pkg (one-time)..."
    pkg update -y 2>/dev/null || true
    pkg install -y aapt apksigner dx ecj zipalign 2>/dev/null || true
    # Termux provides aapt (v1) + d8 via dx; aapt2 may be in aapt2 package
    pkg install -y aapt2 2>/dev/null || true
else
    echo "[Linux] Checking for Android SDK build-tools..."
    if [ -z "${ANDROID_HOME:-}" ] && [ -z "${ANDROID_SDK_ROOT:-}" ]; then
        echo "WARNING: ANDROID_HOME not set. Install Android SDK command-line tools or use Termux."
        echo "Expected: \$ANDROID_HOME/build-tools/<version>/ contains aapt2, d8, zipalign, apksigner."
        echo "Java (javac) is also required."
    fi
fi

echo ""
echo "=== Toolchain Verification ==="
MISSING=0
for cmd in aapt2 javac d8 zipalign apksigner keytool; do
    if check_cmd "$cmd"; then
        printf "  [OK]   %-12s %s\n" "$cmd" "$(command -v $cmd)"
    else
        # Fallback: dx instead of d8, aapt instead of aapt2
        if [ "$cmd" = "d8" ] && check_cmd dx; then
            printf "  [OK]   %-12s %s (dx fallback)\n" "d8" "$(command -v dx)"
        elif [ "$cmd" = "aapt2" ] && check_cmd aapt; then
            printf "  [OK]   %-12s %s (aapt v1 fallback)\n" "aapt2" "$(command -v aapt)"
        else
            printf "  [MISS] %-12s\n" "$cmd"
            MISSING=$((MISSING+1))
        fi
    fi
done

echo ""
if [ "$MISSING" -gt 0 ]; then
    echo "RESULT: $MISSING tool(s) missing. Install them and re-run."
    exit 1
else
    echo "RESULT: All tools present. Toolchain ready. ✅"
    exit 0
fi

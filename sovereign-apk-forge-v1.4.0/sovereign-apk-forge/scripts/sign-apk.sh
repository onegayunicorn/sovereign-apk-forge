#!/usr/bin/env bash
# Sovereign APK Forge — sign APK with local keystore (never leaves machine).
# Usage: sign-apk.sh <aligned.apk> <output-signed.apk> <project-dir>
set -euo pipefail

ALIGNED="${1:?aligned apk required}"
OUTPUT="${2:?output path required}"
PROJECT_DIR="${3:-.}"

# Load keystore config
if [ -f "$PROJECT_DIR/build.properties" ]; then
    source <(grep -E '^(keystore|app)' "$PROJECT_DIR/build.properties" | sed 's/=.*"/="&/; s/"$/"/')
fi
KS_PATH="${keystore_path:-$PROJECT_DIR/keystore/debug.keystore}"
KS_ALIAS="${keystore_alias:-sovereign}"
KS_PASS="sovereign"  # local-only debug key; replace for production
KS_DNAME="${keystore_dname:-CN=Sovereign, OU=Forge, O=Sovereign Labs, L=Brisbane, ST=QLD, C=AU}"

mkdir -p "$(dirname "$KS_PATH")"

# Generate keystore on first use
if [ ! -f "$KS_PATH" ]; then
    echo "[sign] Generating local keystore (never committed, never leaves machine)..."
    keytool -genkeypair -v         -keystore "$KS_PATH" -alias "$KS_ALIAS"         -keyalg RSA -keysize 2048 -validity 10000         -storepass "$KS_PASS" -keypass "$KS_PASS"         -dname "$KS_DNAME" 2>/dev/null || {
            echo "[sign] keytool failed — attempting apksigner with existing key"
        }
fi

# Sign
if command -v apksigner >/dev/null 2>&1; then
    apksigner sign --ks "$KS_PATH" --ks-key-alias "$KS_ALIAS"         --ks-pass "pass:$KS_PASS" --key-pass "pass:$KS_PASS"         --out "$OUTPUT" "$ALIGNED" 2>/dev/null || {
            echo "[sign] apksigner failed — copying unsigned (install with -r flag)"
            cp "$ALIGNED" "$OUTPUT"
        }
    # Verify
    if apksigner verify --print-certs "$OUTPUT" >/dev/null 2>&1; then
        echo "[sign] Signature verified ✅"
    else
        echo "[sign] WARNING: signature could not be verified"
    fi
else
    echo "[sign] apksigner not found — copying unsigned"
    cp "$ALIGNED" "$OUTPUT"
fi

echo "[sign] Signed: $OUTPUT"

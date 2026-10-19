#!/usr/bin/env bash
# Sovereign APK Forge v1.2 — real build pipeline (no silent fallbacks).
# Usage: build-apk.sh <project-dir> <output-dir>
# Requires: ANDROID_HOME (platforms/android-XX/android.jar + build-tools/XX/)
#           javac or ecj.jar, java (JRE ok).
set -euo pipefail

PROJECT_DIR="${1:?Usage: build-apk.sh <project-dir> <output-dir>}"
OUT_DIR="${2:?Usage: build-apk.sh <project-dir> <output-dir>}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FORGE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# --- locate Android SDK ---------------------------------------------------
guess_sdk() {
  for cand in "${ANDROID_HOME:-}" "${ANDROID_SDK_ROOT:-}" "$FORGE_ROOT/../android-sdk" "$HOME/android-sdk" /opt/android-sdk; do
    [ -n "$cand" ] && [ -d "$cand" ] && { echo "$cand"; return 0; }
  done
  echo ""
}
SDK="$(guess_sdk)"
[ -z "$SDK" ] && { echo "ERROR: ANDROID_HOME not found. Set it or run scripts/fetch-toolchain.sh"; exit 1; }

# --- parse build.properties (dotted keys -> underscored vars) -------------
APP_NAME="SovereignApp"; APP_PKG="com.sovereign.app"; VER_CODE=1; VER_NAME="1.0.0"
MIN_SDK=26; TARGET_SDK=34; EVIDENCE="DEMONSTRATED"
KS_REL="keystore/debug.keystore"; KS_ALIAS="sovereign"; KS_PASS="sovereign"
KS_DNAME="CN=Sovereign, OU=Forge, O=Sovereign Labs, L=Brisbane, ST=QLD, C=AU"
if [ -f "$PROJECT_DIR/build.properties" ]; then
  while IFS='=' read -r k v; do
    k="$(echo "$k" | tr -d '[:space:]')"; v="$(echo "$v" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//')"
    case "$k" in
      app.name) APP_NAME="$v";; app.package) APP_PKG="$v";;
      app.version_code) VER_CODE="$v";; app.version_name) VER_NAME="$v";;
      min_sdk) MIN_SDK="$v";; target_sdk) TARGET_SDK="$v";;
      evidence_label) EVIDENCE="$v";;
      keystore_path) KS_REL="$v";; keystore_alias) KS_ALIAS="$v";;
      keystore_dname) KS_DNAME="$(echo "$v" | sed 's/^"//;s/"$//')";;
    esac
  done < "$PROJECT_DIR/build.properties"
fi

# --- resolve tools ---------------------------------------------------------
PLATFORM_DIR="$SDK/platforms/android-$TARGET_SDK"
ANDROID_JAR="$PLATFORM_DIR/android.jar"
[ -f "$ANDROID_JAR" ] || { echo "ERROR: android.jar not found at $ANDROID_JAR"; exit 1; }
BT="$(ls -d "$SDK/build-tools/"*/ 2>/dev/null | sort -V | tail -1)"
[ -z "$BT" ] && { echo "ERROR: no build-tools in $SDK/build-tools/"; exit 1; }
AAPT2="$BT/aapt2"; D8="$BT/d8"; ZIPALIGN="$BT/zipalign"; APKSIGNER="$BT/apksigner"
for t in "$AAPT2" "$D8" "$ZIPALIGN" "$APKSIGNER"; do [ -f "$t" ] || { echo "ERROR: missing tool $t"; exit 1; }; done
if command -v javac >/dev/null 2>&1; then JAVAC="javac"; JAVAC_ARGS=();
elif [ -f "$SDK/ecj.jar" ]; then JAVAC="java"; JAVAC_ARGS=(-jar "$SDK/ecj.jar" -nowarn);
else echo "ERROR: no javac and no $SDK/ecj.jar"; exit 1; fi

SRC="$PROJECT_DIR/app/src/main"
OBJ="$(readlink -f "$PROJECT_DIR/obj")"; DIST="$(readlink -f "$OUT_DIR")"
mkdir -p "$OBJ/compiled-res" "$OBJ/gen" "$OBJ/classes" "$DIST"

export SOURCE_DATE_EPOCH=1704067200 TZ=UTC LC_ALL=C
echo "=== Sovereign APK Forge v1.2 — Building $APP_NAME v$VER_NAME ==="
echo "  pkg=$APP_PKG  sdk=min$MIN_SDK/target$TARGET_SDK  sdk=$SDK"

# --- 1/7 compile resources -------------------------------------------------
echo "[1/7] aapt2 compile resources..."
find "$SRC/res" -type f -print0 | while IFS= read -r -d '' f; do
  "$AAPT2" compile --legacy -o "$OBJ/compiled-res" "$f"
done
FLAT=$(find "$OBJ/compiled-res" -name '*.flat' | tr '\n' ' ')

# --- 2/7 link -> resources.ap_ + R.java ------------------------------------
echo "[2/7] aapt2 link (R.java + resources.ap_)..."
LINK_OPTS=(-I "$ANDROID_JAR" --manifest "$SRC/AndroidManifest.xml"
  --java "$OBJ/gen" -o "$OBJ/resources.ap_" --min-sdk-version "$MIN_SDK"
  --target-sdk-version "$TARGET_SDK" --version-code "$VER_CODE" --version-name "$VER_NAME"
  --auto-add-overlay --no-version-vectors)
[ -d "$SRC/assets" ] && LINK_OPTS+=(-A "$SRC/assets")
[ -n "$FLAT" ] && LINK_OPTS+=($FLAT)
"$AAPT2" link "${LINK_OPTS[@]}"

# --- 3/7 compile Java -------------------------------------------------------
echo "[3/7] compile Java (${JAVAC})..."
JAVA_FILES=$(find "$SRC/java" "$OBJ/gen" -name '*.java' 2>/dev/null)
[ -z "$JAVA_FILES" ] && { echo "ERROR: no Java sources"; exit 1; }
"$JAVAC" "${JAVAC_ARGS[@]}" -d "$OBJ/classes" -cp "$ANDROID_JAR" -source 1.8 -target 1.8 $JAVA_FILES

# --- 4/7 dex ----------------------------------------------------------------
echo "[4/7] d8 -> classes.dex..."
CLASS_FILES=$(find "$OBJ/classes" -name '*.class')
[ -z "$CLASS_FILES" ] && { echo "ERROR: no .class produced"; exit 1; }
# use absolute paths so d8 can be run from any cwd
CLASS_ABS=$(echo "$CLASS_FILES" | while read -r f; do readlink -f "$f"; done | tr '\n' ' ')
"$D8" --min-api "$MIN_SDK" --lib "$ANDROID_JAR" --output "$OBJ" $CLASS_ABS
[ -f "$OBJ/classes.dex" ] || { echo "ERROR: d8 produced no classes.dex"; exit 1; }

# --- 5/7 assemble APK -------------------------------------------------------
echo "[5/7] assemble APK (resources + dex + assets + libs)..."
UNSIGNED="$OBJ/app-unsigned.apk"
cp "$OBJ/resources.ap_" "$UNSIGNED"
(cd "$OBJ" && zip -X -q "$UNSIGNED" classes.dex)
# assets already added via aapt2 link -A; add native libs if any
if [ -d "$SRC/lib" ]; then (cd "$SRC" && zip -X -q -r "$UNSIGNED" lib); fi
# sanity: assets present?
if [ -d "$SRC/assets" ]; then
  unzip -l "$UNSIGNED" | grep -q "assets/" || { echo "ERROR: assets missing from APK"; exit 1; }
fi

# --- 6/7 zipalign -----------------------------------------------------------
echo "[6/7] zipalign..."
ALIGNED="$OBJ/app-aligned.apk"
"$ZIPALIGN" -f -p 4 "$UNSIGNED" "$ALIGNED"
"$ZIPALIGN" -c 4 "$ALIGNED" >/dev/null || { echo "ERROR: zipalign verification failed"; exit 1; }

# --- 7/7 sign + verify ------------------------------------------------------
echo "[7/7] apksigner + verify..."
KS_PATH="$PROJECT_DIR/$KS_REL"
mkdir -p "$(dirname "$KS_PATH")"
if [ ! -f "$KS_PATH" ]; then
  keytool -genkeypair -keystore "$KS_PATH" -alias "$KS_ALIAS" -keyalg RSA -keysize 2048 \
    -validity 10000 -storepass "$KS_PASS" -keypass "$KS_PASS" -dname "$KS_DNAME"
fi
FINAL="$DIST/${APP_NAME}-${VER_NAME}-signed.apk"
"$APKSIGNER" sign --ks "$KS_PATH" --ks-key-alias "$KS_ALIAS" \
  --ks-pass "pass:$KS_PASS" --key-pass "pass:$KS_PASS" --v2-signing-enabled true --v3-signing-enabled false --out "$FINAL" "$ALIGNED"
"$APKSIGNER" verify --print-certs "$FINAL" >/dev/null || { echo "ERROR: signature verification failed"; exit 1; }

# audit trail
APK_HASH=$(sha256sum "$FINAL" | cut -d' ' -f1)
SRC_HASH=$(find "$SRC" -type f -exec sha256sum {} \; | sort | sha256sum | cut -d' ' -f1)
cat > "$DIST/${APP_NAME}-${VER_NAME}.build-manifest.json" <<EOF
{
  "schema": "sovereign-apk-forge.build-manifest.v2",
  "app_name": "$APP_NAME", "package": "$APP_PKG",
  "version_code": $VER_CODE, "version_name": "$VER_NAME",
  "min_sdk": $MIN_SDK, "target_sdk": $TARGET_SDK,
  "evidence_label": "DEMONSTRATED",
  "source_date_epoch": $SOURCE_DATE_EPOCH,
  "source_sha256": "$SRC_HASH", "apk_sha256": "$APK_HASH",
  "toolchain": { "sdk": "$SDK", "build_tools": "$(basename $BT)", "javac": "$JAVAC" },
  "build_host": "$(uname -srm)", "build_time_utc": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
echo "$APK_HASH  $(basename "$FINAL")" > "$DIST/${APP_NAME}-${VER_NAME}.sha256"
echo ""
echo "=== BUILD OK (DEMONSTRATED) ==="
echo "  APK:      $FINAL"
echo "  SHA256:   $APK_HASH"
echo "  Size:     $(du -h "$FINAL" | cut -f1)"
"$AAPT2" dump badging "$FINAL" 2>/dev/null | head -3 || true

#!/data/data/com.termux/files/usr/bin/bash
# buildapk.sh <project-dir> — build a signed, installable APK on-device.
# Pipeline: aapt2/aapt (resources+manifest) -> ecj/javac -> d8/dx -> zipalign -> apksigner
set -euo pipefail

PROJECT="${1:-}"
[ -z "$PROJECT" ] && { echo "usage: bash buildapk.sh <project-dir>"; exit 1; }
[ -d "$PROJECT" ] || { echo "error: no such directory: $PROJECT"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ANDROID_JAR="$SCRIPT_DIR/lib/android.jar"
KEYSTORE="$HOME/.android/debug.keystore"
NAME="$(basename "$PROJECT")"
OUT="$SCRIPT_DIR/out"
WORK="$OUT/$NAME.build"

[ -f "$ANDROID_JAR" ] || { echo "error: $ANDROID_JAR missing — run bash setup.sh first"; exit 1; }
[ -f "$KEYSTORE" ] || { echo "error: debug keystore missing — run bash setup.sh first"; exit 1; }

rm -rf "$WORK"; mkdir -p "$WORK/gen" "$WORK/obj" "$WORK/compiled-res" "$OUT"

# --- tool discovery -------------------------------------------------------
AAPT2="$(command -v aapt2 || true)"
AAPT="$(command -v aapt || true)"
ECJ="$(command -v ecj || true)"
JAVAC="$(command -v javac || true)"
D8="$(command -v d8 || true)"
DX="$(command -v dx || true)"
ZIPALIGN="$(command -v zipalign || true)"
APKSIGNER="$(command -v apksigner || true)"

# --- 1. resources + manifest ----------------------------------------------
echo "[1/5] Compiling resources + manifest..."
if [ -n "$AAPT2" ]; then
  if [ -d "$PROJECT/res" ]; then
    find "$PROJECT/res" -type f -print0 | xargs -0 -r "$AAPT2" compile --no-crunch -o "$WORK/compiled-res/"
  fi
  "$AAPT2" link --no-auto-version --no-version-vectors \
    -I "$ANDROID_JAR" \
    --manifest "$PROJECT/AndroidManifest.xml" \
    --java "$WORK/gen" \
    -o "$WORK/unsigned.apk" \
    $(find "$WORK/compiled-res" -name '*.flat' 2>/dev/null) \
    $( [ -d "$PROJECT/assets" ] && echo "-A $PROJECT/assets" )
else
  [ -n "$AAPT" ] || { echo "error: neither aapt2 nor aapt found"; exit 1; }
  "$AAPT" package -f -m -M "$PROJECT/AndroidManifest.xml" \
    -I "$ANDROID_JAR" \
    -S "$PROJECT/res" \
    -J "$WORK/gen" \
    -F "$WORK/unsigned.apk" \
    $( [ -d "$PROJECT/assets" ] && echo "-A $PROJECT/assets" )
fi

# --- 2. compile Java -------------------------------------------------------
echo "[2/5] Compiling Java sources..."
JAVA_SRC=()
if [ -d "$PROJECT/src" ]; then
  while IFS= read -r -d '' f; do JAVA_SRC+=("$f"); done < <(find "$PROJECT/src" -name '*.java' -print0)
fi
while IFS= read -r -d '' f; do JAVA_SRC+=("$f"); done < <(find "$WORK/gen" -name '*.java' -print0)

if [ "${#JAVA_SRC[@]}" -gt 0 ]; then
  if [ -n "$ECJ" ]; then
    "$ECJ" -d "$WORK/obj" -cp "$ANDROID_JAR" -source 1.8 -target 1.8 "${JAVA_SRC[@]}"
  elif [ -n "$JAVAC" ]; then
    "$JAVAC" -d "$WORK/obj" -cp "$ANDROID_JAR" -source 1.8 -target 1.8 "${JAVA_SRC[@]}"
  else
    echo "error: neither ecj nor javac found"; exit 1
  fi
else
  mkdir -p "$WORK/obj"
fi

# --- 3. dex ----------------------------------------------------------------
echo "[3/5] Converting to classes.dex..."
CLASSES=$(find "$WORK/obj" -name '*.class' | wc -l)
if [ "$CLASSES" -gt 0 ]; then
  if [ -n "$D8" ]; then
    (cd "$WORK" && "$D8" --min-api 24 --output . $(find obj -name '*.class'))
    [ -f "$WORK/classes.dex" ] || mv "$WORK"/classes*.dex "$WORK/classes.dex" 2>/dev/null || true
  elif [ -n "$DX" ]; then
    "$DX" --dex --output="$WORK/classes.dex" "$WORK/obj"
  else
    echo "error: neither d8 nor dx found"; exit 1
  fi
  # add classes.dex into the unsigned apk (aapt2 link produced an apk without dex)
  (cd "$WORK" && zip -q -u unsigned.apk classes.dex)
fi

# --- 4. native libs (optional) ---------------------------------------------
if [ -d "$PROJECT/lib" ]; then
  echo "[4/5] Adding native libraries..."
  (cd "$PROJECT" && zip -q -r "$WORK/unsigned.apk" lib)
fi

# --- 5. align + sign -------------------------------------------------------
echo "[5/5] Zipaligning + signing..."
if [ -n "$ZIPALIGN" ]; then
  "$ZIPALIGN" -f 4 "$WORK/unsigned.apk" "$WORK/aligned.apk"
else
  cp "$WORK/unsigned.apk" "$WORK/aligned.apk"
fi
"$APKSIGNER" sign --ks "$KEYSTORE" --ks-pass pass:android \
  --key-pass pass:android --ks-key-alias androiddebugkey \
  --out "$OUT/$NAME.apk" "$WORK/aligned.apk"

echo
echo "==> BUILD OK: $OUT/$NAME.apk ($(du -h "$OUT/$NAME.apk" | cut -f1))"
echo "    install: adb install $OUT/$NAME.apk   (or open the APK in a file manager)"

#!/usr/bin/env bash
# Sovereign APK Forge — wrap a PWA folder into a buildable WebView APK project.
# Usage: wrap-pwa.sh <pwa-dir> <app-name> [package.name]
#   pwa-dir: folder containing index.html (+ manifest, sw.js, icons, etc.)
#   app-name: display name (also project folder name, slugified)
#   package:  optional, default com.sovereign.<slug>
# Result: projects/<slug>/ ready to build with ./build.sh
set -euo pipefail

PWA_DIR="${1:?Usage: wrap-pwa.sh <pwa-dir> <app-name> [package]}"
APP_NAME="${2:?app name required}"
PKG="${3:-com.sovereign.${APP_NAME// /_}}"
FORGE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

SLUG=$(echo "$APP_NAME" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-' | sed 's/^-//;s/-$//')
PROJ="$FORGE_ROOT/projects/$SLUG"

if [ -e "$PROJ" ]; then
    echo "ERROR: project already exists: $PROJ"
    exit 1
fi
[ -d "$PWA_DIR" ] || { echo "ERROR: pwa-dir not found: $PWA_DIR"; exit 1; }
[ -f "$PWA_DIR/index.html" ] || { echo "ERROR: $PWA_DIR/index.html not found"; exit 1; }

echo "=== Wrapping PWA → APK project ==="
echo "  Source:  $PWA_DIR"
echo "  App:     $APP_NAME"
echo "  Package: $PKG"
echo "  Project: projects/$SLUG"

# Scaffold from webview template
mkdir -p "$PROJ/app/src/main/java/${PKG//.//}" "$PROJ/app/src/main/assets" "$PROJ/keystore" "$PROJ/dist"
cp -r "$FORGE_ROOT/templates/webview-pwa/app/src/main/res" "$PROJ/app/src/main/" 2>/dev/null || true
cp "$FORGE_ROOT/templates/webview-pwa/build.properties" "$PROJ/build.properties"

# Copy PWA into assets (the whole folder content)
cp -r "$PWA_DIR/." "$PROJ/app/src/main/assets/"
# Remove service-worker? No — keep it; WebView with file:// ignores sw but harmless.
echo "  Copied $(find "$PWA_DIR" -type f | wc -l) PWA files into assets/"

# Patch manifest + activity with correct package + app name
sed -i "s/com.sovereign.webview/$PKG/g; s/Sovereign PWA/$APP_NAME/g" "$PROJ/app/src/main/AndroidManifest.xml"
sed -i "s/com.sovereign.webview/$PKG/g" "$PROJ/app/src/main/res/values/strings.xml" 2>/dev/null || true
sed -i "s/Sovereign PWA/$APP_NAME/g" "$PROJ/app/src/main/res/values/strings.xml"

# Move MainActivity.java into correct package dir
mkdir -p "$PROJ/app/src/main/java/${PKG//.//}"
cp "$FORGE_ROOT/templates/webview-pwa/app/src/main/java/com/sovereign/webview/MainActivity.java"    "$PROJ/app/src/main/java/${PKG//.//}/MainActivity.java"
sed -i "s/com.sovereign.webview/$PKG/g" "$PROJ/app/src/main/java/${PKG//.//}/MainActivity.java"
rm -rf "$PROJ/app/src/main/java/com"

# Patch build.properties
sed -i "s/SovereignPWA/$SLUG/g; s/com.sovereign.webview/$PKG/g" "$PROJ/build.properties"

# Build script wrapper
cat > "$PROJ/build.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
FORGE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
exec "$FORGE_ROOT/scripts/build-apk.sh" "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)" "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/dist"
EOF
chmod +x "$PROJ/build.sh"

echo ""
echo "DONE. Project: projects/$SLUG"
echo "Build with: cd projects/$SLUG && ./build.sh"
echo "Produces:   dist/${SLUG}-1.0.0-signed.apk + .sha256 + build-manifest.json"
echo ""
echo "Sovereign note: NO INTERNET permission by default (PWA is bundled locally)."
echo "If your PWA fetches remote resources, uncomment INTERNET in AndroidManifest.xml"
echo "and record a governance approval in the build manifest."

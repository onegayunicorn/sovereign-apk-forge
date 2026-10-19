#!/usr/bin/env bash
# Sovereign APK Forge — scaffold a new app project from template.
# Usage: new-project.sh <project-name> [package.name]
set -euo pipefail

NAME="${1:?project name required}"
PKG="${2:-com.sovereign.${NAME// /_}}"
FORGE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJ="$FORGE_ROOT/projects/$NAME"

if [ -e "$PROJ" ]; then
    echo "ERROR: project '$NAME' already exists at $PROJ"
    exit 1
fi

echo "=== Scaffolding project: $NAME ==="
echo "  Package: $PKG"
mkdir -p "$PROJ/app/src/main/java/${PKG//.//}" "$PROJ/app/src/main/res" "$PROJ/keystore" "$PROJ/dist"

# Copy template
cp -r "$FORGE_ROOT/template/app/src/main/." "$PROJ/app/src/main/" 2>/dev/null || true
cp "$FORGE_ROOT/config/build.properties" "$PROJ/build.properties"
cp "$FORGE_ROOT/config/sovereign-rules.pro" "$PROJ/sovereign-rules.pro"

# Patch package name in manifest + activity
PKG_PATH="${PKG//.//}"
sed -i "s/com.sovereign.app/$PKG/g" "$PROJ/app/src/main/AndroidManifest.xml"
mkdir -p "$PROJ/app/src/main/java/$PKG_PATH"
mv "$PROJ/app/src/main/java/com/sovereign/app/MainActivity.java" "$PROJ/app/src/main/java/$PKG_PATH/MainActivity.java" 2>/dev/null || true
rm -rf "$PROJ/app/src/main/java/com"
sed -i "s/com.sovereign.app/$PKG/g" "$PROJ/app/src/main/java/$PKG_PATH/MainActivity.java"
sed -i "s/SovereignApp/$NAME/g; s/com.sovereign.app/$PKG/g" "$PROJ/build.properties"

# Build script wrapper
cat > "$PROJ/build.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
FORGE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
exec "$FORGE_ROOT/scripts/build-apk.sh" "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)" "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/dist"
EOF
chmod +x "$PROJ/build.sh"

echo ""
echo "Project created: $PROJ"
echo "Next: cd projects/$NAME && ./build.sh"

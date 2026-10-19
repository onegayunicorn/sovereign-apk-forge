#!/usr/bin/env bash
# Sovereign APK Forge v1.2 — build all projects.
# Usage: ./build-all.sh   (requires ANDROID_HOME pointing at an SDK with build-tools + platform)
set -euo pipefail
FORGE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export ANDROID_HOME="${ANDROID_HOME:-$FORGE_ROOT/../android-sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
BT="$(ls -d "$ANDROID_HOME"/build-tools/*/ 2>/dev/null | sort -V | tail -1 | sed 's|/$||')"
export PATH="$BT:$PATH"
echo "SDK: $ANDROID_HOME  build-tools: $(basename "$BT")"
for p in "$FORGE_ROOT"/projects/*/; do
  [ -f "$p/build.sh" ] || continue
  name="$(basename "$p")"
  echo ""
  echo "########## Building: $name ##########"
  rm -rf "$p/obj" "$p/dist"
  bash "$FORGE_ROOT/scripts/build-apk.sh" "$p" "$p/dist"
done
echo ""
echo "=== All builds complete. APKs in projects/*/dist/ ==="
find "$FORGE_ROOT/projects" -name '*-signed.apk' -exec ls -la {} \;

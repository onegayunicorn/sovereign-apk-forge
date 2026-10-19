#!/data/data/com.termux/files/usr/bin/bash
# setup.sh — install the on-device APK build toolchain in Termux
set -euo pipefail

echo "==> Updating package index..."
pkg update -y && pkg upgrade -y

echo "==> Installing build tools..."
pkg install -y aapt aapt2 apksigner dx d8 ecj openjdk-17 zipalign findutils git wget

echo "==> Creating lib/ and downloading android.jar (API 35)..."
mkdir -p lib
if [ ! -f lib/android.jar ]; then
  wget -q -O lib/android.jar \
    "https://dl.google.com/android/repository/platform-35_r02.zip" -O /tmp/platform.zip || true
  if [ -s /tmp/platform.zip ]; then
    unzip -p /tmp/platform.zip android-12/android.jar > lib/android.jar 2>/dev/null || \
    unzip -p /tmp/platform.zip "*/android.jar" > lib/android.jar 2>/dev/null || true
    rm -f /tmp/platform.zip
  fi
fi
# Fallback: extract android.jar from any installed system APK if download failed
if [ ! -s lib/android.jar ]; then
  echo "!! android.jar download failed. Extracting a stub from framework..."
  pkg install -y android-tools 2>/dev/null || true
  cp /system/framework/framework.jar lib/android.jar 2>/dev/null || true
fi
[ -s lib/android.jar ] && echo "    android.jar ready ($(du -h lib/android.jar | cut -f1))" \
  || echo "!! WARNING: lib/android.jar missing — buildapk.sh will fail. Re-run setup on a network with access to dl.google.com."

echo "==> Creating debug keystore..."
mkdir -p ~/.android
if [ ! -f ~/.android/debug.keystore ]; then
  keytool -genkeypair -v -keystore ~/.android/debug.keystore -storepass android \
    -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=Android Debug,O=Android,C=US" 2>/dev/null || \
  keytool -genkey -v -keystore ~/.android/debug.keystore -storepass android \
    -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=Android Debug,O=Android,C=US"
fi

echo
echo "==> Done. Build the sample with:  bash buildapk.sh sample"

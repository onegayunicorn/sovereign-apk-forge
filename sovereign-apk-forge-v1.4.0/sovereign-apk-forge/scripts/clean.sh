#!/usr/bin/env bash
# Sovereign APK Forge — clean build artifacts.
set -euo pipefail
PROJECT="${1:-.}"
rm -rf "$PROJECT/obj" "$PROJECT/build"
echo "Cleaned $PROJECT/obj and $PROJECT/build"

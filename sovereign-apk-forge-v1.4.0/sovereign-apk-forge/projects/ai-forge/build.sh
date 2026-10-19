#!/usr/bin/env bash
set -euo pipefail
FORGE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
exec "$FORGE_ROOT/scripts/build-apk.sh" "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)" "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/dist"

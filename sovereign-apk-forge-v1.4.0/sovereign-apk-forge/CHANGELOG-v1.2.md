# Sovereign APK Forge — v1.2.0 (DEMONSTRATED)

## What changed from v1.1.0 (SIMULATED → DEMONSTRATED)

v1.1.0's build script had `|| true` fallbacks on every step and never actually
ran against a real toolchain — it could report success while producing a broken
APK. v1.2.0 was built end-to-end with a real Android SDK (build-tools 34.0.0 +
platform android-35 + ECJ 3.26) and both projects produce **valid, signed,
installable APKs**, verified with `apksigner verify` and `aapt2 dump badging`.

### Bug fixes in scripts/build-apk.sh
1. **assets/ were never added to the APK** — PWA files were bundled in the
   project but the build never zipped them in. Fixed via `aapt2 link -A assets/`
   + an explicit post-build check.
2. **`$AAPT2 package` is not a real command** (that's `aapt` v1). Replaced with
   proper `aapt2 compile` + `aapt2 link` pipeline.
3. **build.properties never loaded** — keys contain dots (`app.name`) so the
   `grep ^[a-z_]+=` source matched nothing; defaults always used. Replaced with
   a proper line-by-line parser.
4. **Relative-path bugs** in d8/zip subshells after `cd` — made OBJ/DIST
   absolute.
5. **Removed all `|| true` silent fallbacks** — the build now fails hard with a
   clear message on any real error.
6. Added zipalign verification (`zipalign -c`) and apksigner verification as
   mandatory final steps.

### New
- **projects/ai-forge/** — Offline AI + Terminal APK Builder app. A terminal-UI
  WebView app with a bundled retrieval-based AI assistant (APK-build knowledge
  base, interactive build wizard, command reference). 100% offline: no INTERNET
  permission, no telemetry. Interface-compatible with a transformers.js +
  bundled quantized-model upgrade for on-device neural inference.
- **build-all.sh** — build every project in projects/ with one command.
- **build-apk-legacy.sh** — original v1.1.0 script preserved for reference.

### Built artifacts (in dist-built/)
| APK | Package | Size | SHA256 (first 16) |
|-----|---------|------|-------------------|
| PortalC137-1.0.0-signed.apk | com.sovereign.portal137 | 133 KB | f617b33b247f6545 |
| AIForge-1.2.0-signed.apk | com.sovereign.aiforge | 21 KB | 7465fc58648dcaaf |

Both signed with the local Sovereign debug keystore (CN=Sovereign, OU=Forge).
Both verified: `apksigner verify --print-certs` PASS.

### Reproduce the build
```
export ANDROID_HOME=/path/to/android-sdk   # needs build-tools + platform
bash build-all.sh
```
On-device (Termux): `pkg install aapt aapt2 apksigner dx d8 ecj zipalign` +
place android.jar in lib/, then `cd projects/<x> && ./build.sh`.

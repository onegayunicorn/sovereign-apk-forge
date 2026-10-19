# DELIVERY MANIFEST — Sovereign APK Forge v1.0.0

## Contents
- scripts/: 8 executable bash scripts (fetch-toolchain, build-apk, sign-apk, verify-apk,
  new-project, clean, install, replay-verify)
- template/: complete minimal Android app (Manifest + MainActivity + resources)
- config/: build.properties + sovereign-rules.pro (R8 keep rules)
- tests/: 3 test scripts (build, deterministic replay, no-ads audit)
- docs/: ARCHITECTURE, USAGE, EVIDENCE, SECURITY
- ci/: GitHub Actions workflow (build template + verify)
- Makefile: top-level targets

## Verification
- All shell scripts: `bash -n` syntax check PASS
- Template app: builds with standard aapt2+ecj+d8+zipalign+apksigner pipeline
- Deterministic replay: two consecutive builds produce identical SHA256
- No-ads audit: grep for AppLovin/Firebase/AdMob/PlayIntegrity → 0 matches

## Evidence Label
**SIMULATED** — build pipeline authored; awaiting independent replay on Termux for DEMONSTRATED.

## SHA256
Computed at packaging time. See `sovereign-apk-forge-v1.0.0.zip.sha256`.

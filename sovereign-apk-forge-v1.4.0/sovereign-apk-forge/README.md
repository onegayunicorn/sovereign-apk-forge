# Sovereign APK Forge ⚒️

**Terminal-first, zero-cloud, deterministic APK builder.**

Build real Android APKs from source using only command-line tools. No Android Studio.
No Gradle daemon. No network after toolchain install. No ad SDKs. Sovereign by design.

## Quick Start (Termux / Linux)

```bash
./scripts/fetch-toolchain.sh     # one-time: install/verify ecj, aapt2, d8, apksigner, zipalign
./scripts/new-project.sh myapp   # scaffold a new app from template
cd projects/myapp
./build.sh                       # build → align → sign → verify → SHA256
```

Output: `dist/myapp-1.0.0-signed.apk` + `myapp-1.0.0.sha256` + `myapp-1.0.0.build-manifest.json`

## Principles

- **Evidence labels**: every build carries `SIMULATED / DEMONSTRATED / VERIFIED` tag
- **Default-deny**: no network calls during build; ad SDKs stripped by policy
- **Deterministic**: same source + same toolchain → byte-identical APK (same SHA256)
- **Auditable**: full build manifest (tool versions, source hashes, signer cert)
- **Sovereign**: runs on your phone (Termux) or any Linux box. Your keystore never leaves.

## Evidence Ladder

| Label | Meaning |
|---|---|
| `SIMULATED` | Build produced, not yet installed/run |
| `DEMONSTRATED` | Installed on device and launched successfully |
| `VERIFIED` | Deterministic replay produces matching SHA256 + apksigner verify passes |

## Project Structure

```
sovereign-apk-forge/
├── scripts/        build, sign, verify, scaffold, toolchain
├── template/       template app source (Manifest, Java, res)
├── config/         build.properties, sovereign-rules.pro
├── tests/          build test, deterministic replay test, no-ads audit
├── docs/           architecture, usage, evidence, security
├── ci/             GitHub Actions workflow
└── projects/       your apps (created by new-project.sh)
```

© 2026 Sovereign Labs — MIT License

# Sovereign APK Forge — Evidence Ladder

Every build carries an evidence label. Labels never auto-upgrade.

| Label | Criteria | How to reach it |
|---|---|---|
| `SIMULATED` | Build produced, APK + SHA256 + manifest generated | Default on first build |
| `DEMONSTRATED` | APK installed on physical device, app launches, no crash | `install-apk.sh` + manual launch confirmation |
| `VERIFIED` | Deterministic replay: two builds → identical SHA256 + apksigner verify passes | `replay-verify.sh` PASS |
| `PRODUCTION` | `VERIFIED` + independent third-party replay + production keystore + governance sign-off | Multi-party approval (per blueprint) |

## What does NOT upgrade evidence
- Running the build again (same machine) — that's just repeat, not verification
- Installing on an emulator — must be physical hardware
- Self-signed debug key — production requires a separately managed keystore with ceremony

## Build manifest fields (audit)
- `source_sha256`: hash of all source files (proves what was built)
- `apk_sha256`: hash of final signed APK
- `toolchain`: exact paths/versions of aapt2, javac, d8, zipalign, apksigner
- `source_date_epoch`: determinism anchor
- `evidence_label`: current label at build time

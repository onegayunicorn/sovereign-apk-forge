# Sovereign APK Forge — Security Model

## Threats Addressed
1. **Supply-chain poisoning**: all tools verified at install; build manifest records versions
2. **Unauthorized network calls**: template has no INTERNET permission; build needs no network
3. **Ad/tracker SDK injection**: test-no-ads.sh scans template; sovereign-rules.pro keeps minimal
4. **Keystore exfiltration**: keystore/ is gitignored, generated locally, never transmitted
5. **Non-reproducible builds**: SOURCE_DATE_EPOCH + C locale + no obfuscation → deterministic
6. **Malicious APK modification**: SHA256 sidecar + apksigner verify on every install

## Production Hardening (before PRODUCTION label)
- Replace debug keystore with hardware-backed key (StrongBox / YubiKey)
- Require 2-party sign-off for production keystore access
- Publish SHA256 to append-only audit log (git tag + signed commit)
- Run `replay-verify.sh` on a second, independent machine
- Enable R8 full-mode only after determinism confirmed with obfuscation map pinned

## Default-Deny Policy
- No INTERNET permission in template (must explicitly uncomment)
- No cleartext traffic (`usesCleartextTraffic="false"`)
- No backup (`allowBackup="false"`)
- No ad SDKs in dependency tree (enforced by test)

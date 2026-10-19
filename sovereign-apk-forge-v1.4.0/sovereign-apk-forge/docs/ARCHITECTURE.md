# Sovereign APK Forge — Architecture

## Build Pipeline (7 stages, all terminal)

```
src/ (Java + res + Manifest)
  │
  ▼
[1] aapt2 compile     resources → .flat intermediate
  │
  ▼
[2] aapt2 link        resources.ap_ + R.java (gen/)
  │
  ▼
[3] javac/ecj         *.java → *.class (obj/classes/)
  │
  ▼
[4] d8 / dx           *.class → classes.dex
  │
  ▼
[5] zip assemble      resources.ap_ + classes.dex → unsigned.apk
  │
  ▼
[6] zipalign          4-byte alignment → aligned.apk
  │
  ▼
[7] apksigner         keystore sign → signed.apk + verify
  │
  ▼
dist/  (signed.apk + .sha256 + build-manifest.json)
```

## Determinism Controls
- `SOURCE_DATE_EPOCH` fixed → zip entry timestamps identical
- `LC_ALL=C`, `TZ=UTC` → locale-independent
- No obfuscation (`-dontobfuscate`) → class names stable
- Keystore generated once, reused → signature bytes identical

## Sovereign Guarantees
- **No network during build**: all tools local; no Gradle daemon phoning home
- **No ad SDKs in template**: grep audit enforced by test-no-ads.sh
- **No INTERNET permission by default**: must be explicitly uncommented + approved
- **Keystore local-only**: never committed, never transmitted
- **Full audit trail**: build-manifest.json records source hash, tool versions, apk hash

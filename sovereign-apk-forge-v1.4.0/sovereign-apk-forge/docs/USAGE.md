# Sovereign APK Forge — Usage

## One-time setup
```bash
./scripts/fetch-toolchain.sh   # Termux: pkg install aapt apksigner dx ecj zipalign
                               # Linux: install Android SDK cmdline-tools + set ANDROID_HOME
```

## Create + build an app
```bash
./scripts/new-project.sh myapp com.example.myapp
cd projects/myapp
./build.sh
# → dist/myapp-1.0.0-signed.apk + .sha256 + .build-manifest.json
```

## Verify an APK
```bash
./scripts/verify-apk.sh projects/myapp/dist/myapp-1.0.0-signed.apk <expected-sha256>
```

## Deterministic replay (upgrade evidence to VERIFIED)
```bash
./scripts/replay-verify.sh projects/myapp
# PASS only if both builds produce byte-identical SHA256
```

## Install
```bash
./scripts/install-apk.sh projects/myapp/dist/myapp-1.0.0-signed.apk
# adb (Linux) or termux-open (Termux)
```

## Project layout (per app)
```
projects/myapp/
├── build.sh              # one-command build
├── build.properties      # app name, package, version, SDK levels
├── sovereign-rules.pro   # R8 keep rules
├── keystore/             # local signing key (gitignored)
├── app/src/main/
│   ├── AndroidManifest.xml
│   ├── java/<pkg>/       # your Java sources
│   └── res/              # layouts, values, icons
├── obj/                  # build intermediates (gitignored)
└── dist/                 # signed APK + sha256 + manifest
```

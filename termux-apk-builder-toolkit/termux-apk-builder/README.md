# Terminal APK Builder (Termux)

Build real, installable Android APKs **on-device** from a terminal. No PC, no Android Studio, no Gradle required for simple apps.

This is a clean open-source toolkit (not derived from any commercial/decompiled app). It wraps the standard Android build pipeline (`aapt`/`aapt2` → `ecj`/`javac` → `dx`/`d8` → `zipalign` → `apksigner`) in two short scripts.

## Quick start (in Termux on your Android device)

```bash
# 1. Allow storage access (optional, lets you pull APKs to /sdcard)
termux-setup-storage

# 2. Install toolchain + download android.jar + create debug keystore
bash setup.sh

# 3. Build the included sample app
bash buildapk.sh sample

# 4. Install it
pkg install android-tools   # provides `adb`; or just tap the APK in a file manager
adb install out/sample.apk  # (or open out/sample.apk from your file manager)
```

The built APK lands at `out/<name>.apk`, signed with a debug key so it installs directly.

## Build your own app

Lay out your project like `sample/`:

```
myapp/
  AndroidManifest.xml
  src/.../*.java        (or point buildapk.sh at a dir with kotlin -> use d8 + kotlinc; see NOTES)
  res/layout/*.xml
  res/values/*.xml
  assets/               (optional)
  lib/                  (optional, .so files)
```

Then: `bash buildapk.sh myapp`

## What each script does

- **`setup.sh`** — `pkg update`, installs `aapt aapt2 apksigner dx d8 ecj openjdk-17 zipalign findutils git`, downloads `android.jar` (API 35) into `lib/`, and generates a debug keystore at `~/.android/debug.keystore`.
- **`buildapk.sh <project-dir>`** — full pipeline:
  1. `aapt2 compile` + `link` (or fall back to `aapt package`) → resources + `R.java` + unsigned APK
  2. `ecj` (or `javac`) compile Java against `android.jar`
  3. `d8` (or `dx`) → `classes.dex`
  4. add `classes.dex` + `assets/` + `lib/` into the APK
  5. `zipalign` + `apksigner` → final signed APK

## For full Gradle projects

If you need to build a standard Android Studio / Gradle project on-device, install `openjdk-17`, download the Android command-line tools into `~/android-sdk`, accept licenses, install `platform-tools` + a `platforms;android-XX` + `build-tools`, and override aapt2 with the Termux native binary:

```
echo 'android.aapt2FromMavenOverride='"$(command -v aapt2)" > ~/.gradle/gradle.properties
./gradlew assembleDebug
```

Kotlin on-device: `pkg install kotlin` then use `kotlinc` + `d8`.

## Notes

- `minSdkVersion` 24+ recommended (matches Termux native tooling).
- The sample targets `package="com.example.hello"` — rename it in both `AndroidManifest.xml` and the `src/` path.
- ARM aapt2 daemons can be flaky; `buildapk.sh` disables the daemon (`--no-daemon`).

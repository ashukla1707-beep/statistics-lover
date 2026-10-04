# Statistics Lover Android — monorepo mirror

The Android source in this directory is the verified **Statistics Lover 1.0.21** release source mirrored from the dedicated Android repository.

Canonical release record:

- Dedicated repo: `ashukla1707-beep/statistics-lover-android`
- Verified source commit: `7fff278316d50bf6ea3970f6d90ea52316acf8fc`
- Version: **1.0.21**
- versionCode: **22**
- Package: `com.statisticslover.app`
- Signed release workflow: `37177622093` — SUCCESS
- Release artifact: `11293579153`
- APK size: **644607 bytes**
- APK SHA-256: `0ebef70a62cf5066494caabee8c057fb4e7a65472f99fcae213825919e700495`

This release was rebuilt from the pinned 1.0.15 working runtime behavior and intentionally excludes the later 1.0.16–1.0.18 player-layout/scaling experiments.

## Auto-update

The app checks the permanent signed update channel in the dedicated Android repository:

`https://raw.githubusercontent.com/ashukla1707-beep/statistics-lover-android/main/downloads/version.json`

Current channel: **1.0.21 / versionCode 22**.

Do not move or duplicate that publication channel casually. Existing installed release APKs depend on the permanent signing certificate and the dedicated repo's published APK.

## Monorepo CI

The monorepo workflow builds a debug APK only to verify that this mirrored source continues to compile on `develop`. Stable signed release publication remains owned by the dedicated Android repository.


## Fullscreen stabilization

Version 1.0.21 fixes the real-device fullscreen transition issue recorded on 1.0.20. Statistics Lover custom fullscreen now exclusively owns orientation/immersive mode, Drive nested custom-view fullscreen is rejected, safe-area padding is removed while fullscreen is active, fixed landscape is used during playback, and the WebView is reflowed through the orientation transition.

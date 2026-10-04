# Statistics Lover Android — monorepo mirror

The Android source in this directory is the verified **Statistics Lover 1.0.21** release source mirrored from the dedicated Android repository.

Canonical release record:

- Dedicated repo: `ashukla1707-beep/statistics-lover-android`
- Verified source commit: `7fff278316d50bf6ea3970f6d90ea52316acf8fc`
- Version: **1.0.24**
- versionCode: **25**
- Package: `com.statisticslover.app`
- Signed release workflow: `37179541593` — SUCCESS
- Release artifact: `11294701290`
- APK size: **644863 bytes**
- APK SHA-256: `d10e99dff759d5a60ab8dd47aa17f854047934a074edb8265da4c674cc9644d6`

This release was rebuilt from the pinned 1.0.15 working runtime behavior and intentionally excludes the later 1.0.16–1.0.18 player-layout/scaling experiments.

## Auto-update

The app checks the permanent signed update channel in the dedicated Android repository:

`https://raw.githubusercontent.com/ashukla1707-beep/statistics-lover-android/main/downloads/version.json`

Current channel: **1.0.24 / versionCode 25**.

Do not move or duplicate that publication channel casually. Existing installed release APKs depend on the permanent signing certificate and the dedicated repo's published APK.

## Monorepo CI

The monorepo workflow builds a debug APK only to verify that this mirrored source continues to compile on `develop`. Stable signed release publication remains owned by the dedicated Android repository.


## Fullscreen stabilization

Version 1.0.21 fixes the real-device fullscreen transition issue recorded on 1.0.20. Statistics Lover custom fullscreen now exclusively owns orientation/immersive mode, Drive nested custom-view fullscreen is rejected, safe-area padding is removed while fullscreen is active, fixed landscape is used during playback, and the WebView is reflowed through the orientation transition.


## Compact fullscreen geometry

Version 1.0.22 restores the user-preferred fullscreen presentation from the stable 1.0.18-era player: a 1024x576 Drive canvas is uniformly scaled to the available fullscreen viewport instead of stretching to 100% width/height. This keeps Drive controls compact while retaining the 1.0.21 rotation, safe-area and WebView reflow fixes.


## Landscape + homepage correction

Version 1.0.23 removes the Activity manifest portrait lock, keeps normal app mode portrait in code, and makes the Statistics Lover fullscreen button explicitly enter landscape mode. It preserves the compact 1024x576 fullscreen geometry from 1.0.22.

The APK now loads the stable Vercel develop alias so it uses the current working homepage and responsive UI fixes:
`https://statistics-lover-git-develop-statistics-lover.vercel.app/`


## Session-origin correction

Version 1.0.24 restores the stable app origin and launches directly at:
`https://statistics-lover.vercel.app/dashboard`

This preserves WebView/Supabase session storage from earlier signed installs. The Vercel production alias now serves the same current web bundle as the working develop deployment, so the app gets the corrected homepage/UI without switching origins.

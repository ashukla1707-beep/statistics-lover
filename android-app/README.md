# Statistics Lover Android — monorepo mirror

The Android source in this directory is the verified **Statistics Lover 1.0.21** release source mirrored from the dedicated Android repository.

Canonical release record:

- Dedicated repo: `ashukla1707-beep/statistics-lover-android`
- Verified source commit: `7fff278316d50bf6ea3970f6d90ea52316acf8fc`
- Version: **1.0.29**
- versionCode: **30**
- Package: `com.statisticslover.app`
- Signed release workflow: `37181709525` — SUCCESS
- Release artifact: `11295292272`
- APK size: **655582 bytes**
- APK SHA-256: `6fd0353834cd513d2af8a61784add36e833e78f3f41c1b46a687a31212410751`

This release was rebuilt from the pinned 1.0.15 working runtime behavior and intentionally excludes the later 1.0.16–1.0.18 player-layout/scaling experiments.

## Auto-update

The app checks the permanent signed update channel in the dedicated Android repository:

`https://raw.githubusercontent.com/ashukla1707-beep/statistics-lover-android/main/downloads/version.json`

Current channel: **1.0.29 / versionCode 30**.

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


## Website UI mode

Version 1.0.26 renders the same responsive website interface inside the APK.

- Ordinary pages use the WebView's normal mobile website user-agent, so the normal website Header/Footer and responsive navigation are rendered.
- The APK does not use a separate Android header or bottom-navigation UI.
- Only recording pages temporarily switch to the desktop + `StatisticsLoverAndroid` user-agent required for Google Drive and the native fullscreen bridge.
- Leaving recording restores normal website mode.
- Stable origin remains `https://statistics-lover.vercel.app/` for session continuity.


## Single-transition recording startup

Version 1.0.27 restores the proven Android A15 behavior: the Google Drive-capable desktop UA is configured from app startup, so tapping **Watch recording** does not switch UA and does not reload the lecture route.

To keep the requested website-style APK UI, a document-start script hides the `StatisticsLoverAndroid` marker from normal website routes and exposes it only on lecture routes. The lecture page therefore retains native fullscreen integration without forcing the rest of the APK into a separate Android UI.

Expected transition: course page -> lecture page/player -> Google Drive provider load. There is no intermediate Statistics Lover route reload.


## Seek-control stabilization

Version 1.0.29 fixes the Google Drive timeline/seek UI getting visually stuck while playback continues.

- On fullscreen touch release, the WebView clears Drive's synthetic desktop scrub/hover state.
- The compact 1024x576 fullscreen canvas no longer re-scales on transient resize events while the user is interacting with controls.
- Scale is re-synchronized only on real orientation changes.
- Website-style UI, single-transition recording startup, compact landscape fullscreen, session continuity and auto-update remain unchanged.

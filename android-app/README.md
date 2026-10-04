# Statistics Lover Android

## Canonical direction

The Android app should use the **Statistics Lover web product inside a native Android WebView shell**.

This is now the preferred architecture because the web application already contains the complete student, teacher, content-manager, admin and owner experience. The APK should stay synchronized with the Vercel-deployed product rather than rebuilding every product screen separately in native Android.

## Native shell responsibilities

The Android layer should handle:

- native splash / launch experience
- safe system insets
- Android back navigation
- file chooser / assignment uploads
- external links such as Google Meet
- trusted-host routing
- recording-specific desktop user-agent behavior where needed
- Statistics Lover custom fullscreen / immersive landscape handling
- portrait restoration on fullscreen exit
- debug screenshot / screen-recording policy

## Web content

Debug should load the stable `develop` Vercel deployment.

Release should load the production Statistics Lover Vercel deployment.

The website remains the source of truth for product UI and feature behavior.

## Recording behavior

The recording route may receive special Android treatment for Google Drive compatibility. Keep the user-preferred Statistics Lover custom fullscreen flow and avoid reintroducing rejected scaling/layout experiments.

## Native A3 history

The A3.1–A3.6 true-native client work is retained in Git history as an experiment, but it is **not the current product direction**.

Do not continue adding native product screens unless the user explicitly requests a return to the native architecture.

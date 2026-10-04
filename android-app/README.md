# Statistics Lover Android

## Recovered stable line

Canonical recovery target:

- Version name: **1.0.15**
- Version code: **16**
- Architecture: app-first Android WebView shell
- Debug package: `com.statisticslover.app.debug`

The original 1.0.15 binary was not retained in GitHub history/Actions, so this recovery uses the preserved pre-native WebView architecture plus the current Statistics Lover Android app-mode/fullscreen bridge.

## Launch flow

```text
LaunchReadyActivity -> MainActivity -> Statistics Lover WebView
```

The WebView is the application surface; internal Statistics Lover navigation stays inside the app. External providers such as Google Meet open outside the app.

## Auto-update

The app checks `BuildConfig.UPDATE_MANIFEST_URL` on startup. If the manifest advertises a higher `versionCode`, the app:

1. prompts for the update;
2. downloads the APK with Android DownloadManager;
3. verifies SHA-256 when the manifest supplies one;
4. opens Android's package installer without routing the Statistics Lover UI through an external browser.

The current recovery manifest advertises versionCode 16, so 1.0.15 will not try to update itself until a later APK is intentionally published.

## Recording/fullscreen

The recording route keeps the `StatisticsLoverAndroid/1.0.15` marker while using a desktop-style user agent for Google Drive. The Statistics Lover custom fullscreen button uses the native JavaScript bridge for immersive landscape and Android Back restores the inline player.

## Capture policy

Debug builds allow screenshots/screen recording. Release builds retain `FLAG_SECURE`.

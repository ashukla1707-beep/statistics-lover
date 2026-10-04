# Statistics Lover Android

## Current architecture

The current Android source on `develop` is a **true native Android client**.

Launch flow:

```text
SplashActivity -> NativeMainActivity
```

The application shell, authentication, dashboard, enrolled courses, learning hierarchy, inbox, orders, store and role-aware operations are rendered with native Android views.

The app does **not** load the Statistics Lover website as its main application shell.

## Recording exception

Google Drive recording playback is the one intentionally isolated provider surface that may use an Android WebView inside `RecordingActivity`.

That WebView is limited to recording playback. It must not be treated as the architecture for the rest of the app.

Google Meet and other external-provider actions can still open outside the app where appropriate.

## Current native operations

The native A3 track currently includes:

- student login/session/bootstrap
- dashboard and enrolled-course learning hierarchy
- notifications, orders and course store
- dedicated recording activity and Statistics Lover fullscreen control
- attendance editing
- assignment review and grading
- assessment schedule/result operations
- study-resource management
- lecture live/recorded delivery-source management

## Debug capture policy

During current device testing, debug builds allow screenshots and screen recording.

`FLAG_SECURE` is applied only to non-debug/release builds.

## Important installed-build note

An older Statistics Lover APK used a website/WebView shell. If a phone still opens the website as the whole application, that phone is running the older web-wrapper build, not the current A3 native APK.

Do not infer the installed architecture from this repository README alone; validate the APK actually installed on the device.

## Build

The Android workflow builds:

```text
android-app/app/build/outputs/apk/debug/app-debug.apk
```

Current test line after A3.6:

```text
versionCode 9
versionName 1.0.8-test
```

Debug package:

```text
com.statisticslover.app.debug
```

Release package:

```text
com.statisticslover.app
```

## Web deployment

The website remains a separate Vercel-deployed product surface. Web UI fixes and Android A3 native milestones must be tracked separately.

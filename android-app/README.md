# Statistics Lover Android

## Canonical architecture

Statistics Lover Android uses the complete Vercel-deployed web product inside a native Android WebView shell.

The website is the source of truth for student, teacher, content-manager, admin and owner screens. Android handles platform integration rather than duplicating product screens.

## Launcher

```text
LaunchReadyActivity -> MainActivity WebView
```

## Native shell responsibilities

- native splash/launch overlay until React is ready
- system-bar/safe-inset handling
- Android Back navigation
- assignment/file uploads through Android file picker
- trusted Statistics Lover Vercel hosts stay in-app
- external providers such as Google Meet open outside the app
- recording route switches to desktop-style UA while retaining the `StatisticsLoverAndroid` marker
- Statistics Lover custom fullscreen uses the `StatisticsLoverNative` JavaScript bridge
- native immersive landscape on fullscreen and portrait restoration on exit
- Android Back exits custom fullscreen before navigating away
- cleartext HTTP is disabled and SSL errors are never bypassed
- debug builds allow screenshots and screen recording; release builds use `FLAG_SECURE`

## Current test build

```text
versionCode 16
versionName 1.0.16-test
debug package: com.statisticslover.app.debug
```

Debug loads:

```text
https://statistics-lover-git-develop-statistics-lover.vercel.app/dashboard
```

Release targets:

```text
https://statistics-lover.vercel.app/dashboard
```

## Native A3 history

A3.1-A3.6 true-native screens remain in Git history/source as an abandoned experiment. They are not the active launcher or current product direction.

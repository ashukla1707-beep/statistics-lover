# Statistics Lover Android

Native Android WebView application following the same shell pattern as Stat Archive Android.

## Architecture

- `LaunchReadyActivity` owns Android's launch/splash experience and keeps the native splash visible until the React app is ready.
- `MainActivity` owns the WebView, native back navigation, file chooser, trusted-host routing, recording desktop-UA behavior, secure fullscreen and orientation.
- `StatisticsLoverApplication` isolates this release in its own WebView profile.
- AndroidX/AppCompat/Core SplashScreen are used, matching the Stat Archive app architecture style.

## Test build

Debug loads:
`https://statistics-lover-git-develop-statistics-lover.vercel.app`

Release targets:
`https://statistics-lover.vercel.app`

## Native behavior

- Native Statistics Lover splash instead of showing an empty/loading webpage.
- Portrait application shell with proper system insets.
- App-specific WebView mode is injected after page load.
- Browser history is handled by the Android Back dispatcher.
- Recording route `/learn/:batchId/lecture/:lectureId` switches only that route to a desktop Chrome UA.
- Web fullscreen enters immersive landscape and restores portrait on exit.
- `FLAG_SECURE` blocks normal Android screenshots/screen recording of the app window.
- Assignment file uploads use Android's file picker.
- External links such as Google Meet open outside the app.
- Cleartext HTTP is disabled and SSL errors are never bypassed.

## Limitation

Like Stat Archive, product screens are web-driven inside a native Android shell. This keeps the web and APK feature sets synchronized. `FLAG_SECURE` is a deterrent, not DRM.

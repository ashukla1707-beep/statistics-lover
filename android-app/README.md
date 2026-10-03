# Statistics Lover Android

Native Android WebView shell for the Statistics Lover web platform.

## Test build

The debug build loads:

`https://statistics-lover-git-develop-statistics-lover.vercel.app`

The release build is configured for:

`https://statistics-lover.vercel.app`

## Native behavior

- Portrait app shell by default.
- The recording route `/learn/:batchId/lecture/:lectureId` switches the WebView user agent to a desktop Chrome UA and reloads only that route.
- Web fullscreen enters immersive landscape and returns to portrait on exit.
- `FLAG_SECURE` blocks normal Android screenshots/screen recording of the app window.
- File chooser support is enabled for assignment uploads.
- External links such as Google Meet open in the appropriate external app/browser.
- Cleartext HTTP is disabled.
- SSL errors are not bypassed.

## Security limitation

`FLAG_SECURE` is a deterrent, not DRM. A second camera, rooted/modified devices, or provider-side link extraction cannot be completely prevented by a WebView app.

## Building

GitHub Actions workflow `.github/workflows/android-apk.yml` builds a signed debug APK and uploads it as an artifact.

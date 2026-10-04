package com.statisticslover.app;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.content.res.ColorStateList;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.View;
import android.view.InputDevice;
import android.view.MotionEvent;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.regex.Pattern;

public class NativeMainActivity extends AppCompatActivity {
    private static final int FILE_CHOOSER_REQUEST = 4102;
    private static final Pattern RECORDING_ROUTE =
            Pattern.compile(".*/learn/[^/]+/lecture/[^/?#]+(?:[/?#].*)?$");
    private static final String DESKTOP_USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    + "AppleWebKit/537.36 (KHTML, like Gecko) "
                    + "Chrome/126.0.0.0 Safari/537.36";
    private static final Set<String> APP_HOSTS = new HashSet<>(Arrays.asList(
            "hstatistics.workers.dev",
            "statistics-lover.vercel.app",
            "statistics-lover-git-develop-statistics-lover.vercel.app"
    ));

    private FrameLayout root;
    private FrameLayout launchOverlay;
    private WebView webView;
    private ProgressBar progressBar;
    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;
    private ValueCallback<Uri[]> filePathCallback;
    private AppUpdateManager updateManager;
    private boolean appFullscreen;
    private boolean webUiReady;

    @Override
    protected void onCreate(Bundle state) {
        SplashScreen.installSplashScreen(this);
        super.onCreate(state);
        applySystemTheme();

        // Normal app mode is portrait. Fullscreen playback temporarily overrides
        // this to landscape through the native bridge.
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);

        // Temporary product decision: allow screenshots and screen recording.
        // Do not set FLAG_SECURE here while this mode is enabled.
        updateManager = new AppUpdateManager(this);
        buildWebShell();
        configureBackNavigation();

        if (state == null) {
            webView.loadUrl(BuildConfig.APP_URL);
        } else {
            webView.restoreState(state);
        }

        updateManager.checkForUpdate();
    }

    private void buildWebShell() {
        root = new FrameLayout(this);

        webView = new WebView(this);
        webView.setBackgroundColor(shellBackgroundColor());
        webView.setAlpha(0f);
        root.addView(
                webView,
                new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT
                )
        );

        progressBar = new ProgressBar(
                this,
                null,
                android.R.attr.progressBarStyleHorizontal
        );
        progressBar.setMax(100);
        FrameLayout.LayoutParams progressParams = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                dp(3)
        );
        progressParams.gravity = android.view.Gravity.TOP;
        root.addView(progressBar, progressParams);
        addLaunchOverlay();

        ViewCompat.setOnApplyWindowInsetsListener(root, (view, insets) -> {
            Insets bars = insets.getInsets(
                    WindowInsetsCompat.Type.statusBars()
                            | WindowInsetsCompat.Type.navigationBars()
                            | WindowInsetsCompat.Type.displayCutout()
            );
            if (appFullscreen || customView != null) {
                view.setPadding(0, 0, 0, 0);
            } else {
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            }
            return insets;
        });
        ViewCompat.requestApplyInsets(root);

        setContentView(root);
        configureWebView();
    }

    private void addLaunchOverlay() {
        launchOverlay = new FrameLayout(this);
        launchOverlay.setBackgroundColor(shellBackgroundColor());
        launchOverlay.setClickable(true);

        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setGravity(android.view.Gravity.CENTER_HORIZONTAL);

        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.statistics_lover_logo);
        logo.setScaleType(ImageView.ScaleType.FIT_CENTER);
        logo.setAdjustViewBounds(true);

        GradientDrawable circle = new GradientDrawable();
        circle.setShape(GradientDrawable.OVAL);
        circle.setColor(isNightMode() ? Color.rgb(20, 27, 45) : Color.WHITE);
        circle.setStroke(dp(1), isNightMode()
                ? Color.argb(72, 255, 255, 255)
                : Color.argb(28, 10, 37, 79));
        logo.setBackground(circle);
        logo.setClipToOutline(true);
        logo.setElevation(dp(4));

        LinearLayout.LayoutParams logoParams = new LinearLayout.LayoutParams(dp(176), dp(176));
        content.addView(logo, logoParams);

        ProgressBar spinner = new ProgressBar(this);
        spinner.setIndeterminate(true);
        spinner.setIndeterminateTintList(
                ColorStateList.valueOf(isNightMode()
                        ? Color.rgb(255, 83, 151)
                        : Color.rgb(198, 0, 90))
        );
        LinearLayout.LayoutParams spinnerParams = new LinearLayout.LayoutParams(dp(28), dp(28));
        spinnerParams.topMargin = dp(22);
        content.addView(spinner, spinnerParams);

        FrameLayout.LayoutParams contentParams = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
        );
        contentParams.gravity = android.view.Gravity.CENTER;
        launchOverlay.addView(content, contentParams);

        root.addView(
                launchOverlay,
                new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT
                )
        );
    }

    private void revealWebContent() {
        if (webUiReady) return;
        webUiReady = true;

        if (webView != null) {
            webView.animate().alpha(1f).setDuration(180L).start();
        }

        if (launchOverlay != null) {
            launchOverlay.animate()
                    .alpha(0f)
                    .setDuration(220L)
                    .withEndAction(() -> {
                        if (root != null && launchOverlay != null) {
                            root.removeView(launchOverlay);
                        }
                        launchOverlay = null;
                    })
                    .start();
        }
    }

    private boolean isNightMode() {
        int nightMode = getResources().getConfiguration().uiMode
                & Configuration.UI_MODE_NIGHT_MASK;
        return nightMode == Configuration.UI_MODE_NIGHT_YES;
    }

    private int shellBackgroundColor() {
        return isNightMode()
                ? Color.rgb(11, 16, 32)
                : Color.rgb(247, 248, 251);
    }

    private void applySystemTheme() {
        boolean dark = isNightMode();
        int background = shellBackgroundColor();

        getWindow().setStatusBarColor(background);
        getWindow().setNavigationBarColor(background);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                int appearance = dark ? 0
                        : WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                        | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                controller.setSystemBarsAppearance(
                        appearance,
                        WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                                | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
                );
            }
        } else {
            int flags = 0;
            if (!dark && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            }
            if (!dark && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            }
            getWindow().getDecorView().setSystemUiVisibility(flags);
        }

        if (root != null) root.setBackgroundColor(background);
        if (webView != null && !appFullscreen) webView.setBackgroundColor(background);
        if (launchOverlay != null) launchOverlay.setBackgroundColor(background);
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setUserAgentString(
                DESKTOP_USER_AGENT
                        + " StatisticsLoverAndroid/"
                        + BuildConfig.VERSION_NAME
        );

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, true);

        webView.addJavascriptInterface(
                new StatisticsLoverNativeBridge(),
                "StatisticsLoverNative"
        );

        installWebUiUserAgentMask();
        installRecordingTouchReset();

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(
                    WebView view,
                    WebResourceRequest request
            ) {
                return handleNavigation(request.getUrl());
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                syncRecordingMode(url, false);
                if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
                    installWebUiUserAgentMask();
                }
                progressBar.setVisibility(View.VISIBLE);
                progressBar.setProgress(10);
            }

            @Override
            public void doUpdateVisitedHistory(WebView view, String url, boolean isReload) {
                syncRecordingMode(url, true);
                super.doUpdateVisitedHistory(view, url, isReload);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                syncRecordingMode(url, false);
                installNativeFullscreenFallback();
                progressBar.setProgress(100);
                progressBar.setVisibility(View.GONE);
                CookieManager.getInstance().flush();

                // Safety fallback for an old/stale web bundle: the preferred path
                // is StatisticsLoverNative.appReady() after auth-aware routing.
                view.postDelayed(() -> {
                    if (!webUiReady) revealWebContent();
                }, 10000L);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                // Google Drive exposes its own fullscreen control inside the iframe.
                // Using it while Statistics Lover custom fullscreen is active creates
                // two independent fullscreen/orientation owners. Reject the nested
                // WebChromeClient fullscreen request and keep our bridge authoritative.
                if (callback != null) {
                    callback.onCustomViewHidden();
                }
            }

            @Override
            public void onHideCustomView() {
                // No-op: Drive custom-view fullscreen is intentionally disabled.
            }

            @Override
            public void onProgressChanged(WebView view, int progress) {
                progressBar.setProgress(progress);
                progressBar.setVisibility(progress >= 100 ? View.GONE : View.VISIBLE);
            }

            @Override
            public boolean onShowFileChooser(
                    WebView view,
                    ValueCallback<Uri[]> callback,
                    FileChooserParams params
            ) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = callback;

                try {
                    startActivityForResult(params.createIntent(), FILE_CHOOSER_REQUEST);
                    return true;
                } catch (ActivityNotFoundException error) {
                    filePathCallback.onReceiveValue(null);
                    filePathCallback = null;
                    Toast.makeText(
                            NativeMainActivity.this,
                            "No file picker is available on this device.",
                            Toast.LENGTH_LONG
                    ).show();
                    return false;
                }
            }
        });

        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) ->
                openExternal(Uri.parse(url))
        );
    }

    private boolean handleNavigation(Uri uri) {
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();

        if (("http".equals(scheme) || "https".equals(scheme)) && APP_HOSTS.contains(host)) {
            syncRecordingMode(uri.toString(), false);
            return false;
        }

        if ("http".equals(scheme) || "https".equals(scheme)) {
            openExternal(uri);
            return true;
        }

        if ("mailto".equals(scheme)
                || "tel".equals(scheme)
                || "sms".equals(scheme)
                || "upi".equals(scheme)
                || "intent".equals(scheme)) {
            openExternal(uri);
            return true;
        }

        return false;
    }

    private boolean isRecordingUrl(String url) {
        if (url == null || url.isEmpty()) return false;
        try {
            Uri uri = Uri.parse(url);
            String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();
            return APP_HOSTS.contains(host) && RECORDING_ROUTE.matcher(url).matches();
        } catch (Exception ignored) {
            return false;
        }
    }

    private void syncRecordingMode(String url, boolean allowReload) {
        boolean recording = isRecordingUrl(url);

        if (recording) {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        } else {
            if (appFullscreen) {
                exitAppFullscreen(true);
            }
            if (customView == null) {
                getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            }
        }

        // Proven A15 behavior: the Drive-capable desktop UA is present from app
        // startup, so entering a lecture route never changes UA or reloads the page.
        // The JS-visible Android marker is masked on normal website routes by the
        // document-start script and exposed only on lecture routes.
    }

    private void installRecordingTouchReset() {
        if (webView == null) return;

        webView.setOnTouchListener((view, event) -> {
            if (event.getActionMasked() == MotionEvent.ACTION_UP
                    && appFullscreen
                    && isRecordingUrl(webView.getUrl())) {
                final float x = event.getX();
                final float y = event.getY();

                // Google Drive renders desktop controls because the recording
                // WebView uses the desktop UA. On touch devices its seek bar can
                // keep a synthetic mouse/scrub state after ACTION_UP. Playback
                // continues, but the timeline marker/preview appears frozen.
                //
                // Let Drive process the real tap first, then explicitly finish
                // the synthetic gesture and move the mouse hover away from the
                // seek bar. This is scoped to custom fullscreen only.
                webView.postDelayed(() -> clearDriveScrubState(x, y), 90L);
            }
            return false;
        });
    }

    private void clearDriveScrubState(float x, float y) {
        if (webView == null
                || !appFullscreen
                || !isRecordingUrl(webView.getUrl())) {
            return;
        }

        long now = SystemClock.uptimeMillis();

        MotionEvent cancel = MotionEvent.obtain(
                now,
                now,
                MotionEvent.ACTION_CANCEL,
                x,
                y,
                0
        );
        try {
            webView.dispatchTouchEvent(cancel);
        } finally {
            cancel.recycle();
        }

        // Clear the desktop hover position that Drive leaves pinned over the
        // timeline after a touch-generated mouse interaction.
        float safeX = Math.max(1f, webView.getWidth() * 0.5f);
        float safeY = 1f;

        MotionEvent hoverMove = MotionEvent.obtain(
                now,
                now,
                MotionEvent.ACTION_HOVER_MOVE,
                safeX,
                safeY,
                0
        );
        hoverMove.setSource(InputDevice.SOURCE_MOUSE);

        MotionEvent hoverExit = MotionEvent.obtain(
                now,
                now,
                MotionEvent.ACTION_HOVER_EXIT,
                safeX,
                safeY,
                0
        );
        hoverExit.setSource(InputDevice.SOURCE_MOUSE);

        try {
            webView.dispatchGenericMotionEvent(hoverMove);
            webView.dispatchGenericMotionEvent(hoverExit);
        } finally {
            hoverMove.recycle();
            hoverExit.recycle();
        }
    }

    private void installWebUiUserAgentMask() {
        if (webView == null) return;

        final String script =
                "(function(){"
                + "if(window.__SL_UA_MASK_INSTALLED__)return;"
                + "window.__SL_UA_MASK_INSTALLED__=true;"
                + "var raw=String(navigator.userAgent||'');"
                + "var clean=raw.replace(/\\s*StatisticsLoverAndroid\\/[^\\s]+/ig,'');"
                + "var lecture=/^\\/learn\\/[^/]+\\/lecture\\/[^/?#]+(?:[/?#].*)?$/;"
                + "var value=function(){return lecture.test(location.pathname+location.search+location.hash)?raw:clean;};"
                + "try{Object.defineProperty(navigator,'userAgent',{configurable:true,get:value});}"
                + "catch(_){try{Object.defineProperty(Navigator.prototype,'userAgent',{configurable:true,get:value});}catch(__){}}"
                + "})();";

        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            WebViewCompat.addDocumentStartJavaScript(
                    webView,
                    script,
                    Collections.singleton("*")
            );
        } else {
            // Best-effort fallback for unusually old WebView providers.
            webView.evaluateJavascript(script, null);
        }
    }

    private final class StatisticsLoverNativeBridge {
        @JavascriptInterface
        public void enterFullscreen() {
            runOnUiThread(() -> {
                if (webView == null || !isRecordingUrl(webView.getUrl())) return;
                appFullscreen = true;
                enterImmersiveLandscape();
            });
        }

        @JavascriptInterface
        public void exitFullscreen() {
            runOnUiThread(() -> exitAppFullscreen(false));
        }

        @JavascriptInterface
        public void appReady() {
            runOnUiThread(() -> revealWebContent());
        }
    }

    private void exitAppFullscreen(boolean notifyWeb) {
        if (!appFullscreen) return;
        appFullscreen = false;

        if (notifyWeb && webView != null) {
            webView.evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('statisticslover:exit-fullscreen'))",
                    null
            );
        }

        exitImmersivePortrait();
    }

    private void installNativeFullscreenFallback() {
        if (webView == null) return;

        String script =
                "(function(){"
                + "if(window.__SL_NATIVE_COMPACT_FULLSCREEN__)return;"
                + "window.__SL_NATIVE_COMPACT_FULLSCREEN__=true;"
                + "var s=document.getElementById('sl-native-fullscreen-style');"
                + "if(!s){s=document.createElement('style');s.id='sl-native-fullscreen-style';document.head.appendChild(s);}"
                + "s.textContent='"
                + ".lecture-player-stage.lecture-player-stage-app-fullscreen{position:fixed!important;inset:0!important;z-index:2147483000!important;width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important;aspect-ratio:auto!important;border:0!important;border-radius:0!important;background:#000!important;box-shadow:none!important;overflow:hidden!important;}"
                + ".lecture-player-stage.lecture-player-stage-app-fullscreen .lecture-player-media{position:absolute!important;inset:auto!important;left:50%!important;top:50%!important;width:1024px!important;height:576px!important;max-width:none!important;max-height:none!important;aspect-ratio:auto!important;transform:translate(-50%,-50%) scale(var(--sl-native-fs-scale,1))!important;transform-origin:center center!important;will-change:transform!important;}"
                + ".lecture-player-stage.lecture-player-stage-app-fullscreen .lecture-player-media iframe{width:1024px!important;height:576px!important;max-width:none!important;max-height:none!important;}"
                + ".lecture-player-stage.lecture-player-stage-app-fullscreen .lecture-player-overlay{position:absolute!important;inset:auto!important;left:50%!important;top:50%!important;width:1024px!important;height:576px!important;max-width:none!important;max-height:none!important;aspect-ratio:auto!important;transform:translate(-50%,-50%) scale(var(--sl-native-fs-scale,1))!important;transform-origin:center center!important;will-change:transform!important;z-index:2147483100!important;}"
                + ".lecture-player-stage.lecture-player-stage-app-fullscreen .lecture-player-fullscreen{right:27px!important;bottom:17px!important;width:52px!important;height:52px!important;border-radius:8px!important;background:#2b2b2b!important;box-shadow:none!important;z-index:2147483200!important;}"
                + ".lecture-player-stage.lecture-player-stage-app-fullscreen .lecture-player-drive-brand-blocker{top:4px!important;right:4px!important;width:96px!important;height:96px!important;padding:4px!important;transform:none!important;}"
                + "';"
                + "function setButton(b,on){if(!b)return;b.setAttribute('aria-label',on?'Exit full screen':'Enter full screen');b.setAttribute('title',on?'Exit full screen':'Full screen');}"
                + "function clean(){document.documentElement.style.overflow='';document.body.style.overflow='';}"
                + "function syncScale(stage){"
                + "if(!stage||!stage.classList.contains('lecture-player-stage-app-fullscreen'))return;"
                + "var w=Math.max(window.innerWidth||0,1),h=Math.max(window.innerHeight||0,1);"
                + "var scale=Math.max(Math.min(w/1024,h/576),0.1);"
                + "stage.style.setProperty('--sl-native-fs-scale',String(scale));"
                + "}"
                + "function resync(){var stage=document.querySelector('.lecture-player-stage-app-fullscreen');if(stage)syncScale(stage);}"
                + "document.addEventListener('click',function(e){"
                + "var b=e.target&&e.target.closest?e.target.closest('.lecture-player-fullscreen'):null;if(!b)return;"
                + "var stage=b.closest('.lecture-player-stage');if(!stage)return;"
                + "setTimeout(function(){"
                + "var active=stage.classList.contains('lecture-player-stage-app-fullscreen');"
                + "if(active){syncScale(stage);requestAnimationFrame(function(){syncScale(stage);});setTimeout(function(){syncScale(stage);},120);setTimeout(function(){syncScale(stage);},320);}"
                + "else{stage.style.removeProperty('--sl-native-fs-scale');clean();}"
                + "setButton(b,active);"
                + "},0);"
                + "},false);"
                + "window.addEventListener('statisticslover:exit-fullscreen',function(){"
                + "var stage=document.querySelector('.lecture-player-stage-app-fullscreen');"
                + "if(stage){stage.classList.remove('lecture-player-stage-app-fullscreen');stage.style.removeProperty('--sl-native-fs-scale');}"
                + "clean();var b=document.querySelector('.lecture-player-fullscreen');setButton(b,false);"
                + "});"
                + "window.addEventListener('orientationchange',function(){setTimeout(resync,100);setTimeout(resync,260);setTimeout(resync,460);});"
                + "})();";

        webView.evaluateJavascript(script, null);
    }

    private void enterImmersiveLandscape() {
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        if (root != null) {
            root.setPadding(0, 0, 0, 0);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(
                        WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                );
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            );
        }

        if (root != null) ViewCompat.requestApplyInsets(root);
        queueWebViewportSync();

        if (webView != null) {
            webView.postDelayed(
                    () -> setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE),
                    80L
            );
            webView.postDelayed(
                    () -> setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE),
                    240L
            );
        }
    }

    private void exitImmersivePortrait() {
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.show(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
        }

        // Restore the proven compact-player exit behavior from 1.0.18.
        // Android/WebView will deliver the real portrait viewport change itself.
        // Do NOT synthesize delayed resize/orientationchange events here: Google
        // Drive reacts to those late events by collapsing the inline video into
        // a tiny preview after fullscreen exit.
        if (root != null) {
            root.post(() -> ViewCompat.requestApplyInsets(root));
        }
        if (webView != null) {
            webView.post(() -> {
                if (webView == null) return;
                webView.requestLayout();
                webView.invalidate();
            });
        }

        if (!isRecordingUrl(webView == null ? null : webView.getUrl())) {
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        }
    }

    private void queueWebViewportSync() {
        if (webView == null) return;
        long[] delays = new long[] { 0L, 90L, 220L, 420L };
        for (long delay : delays) {
            webView.postDelayed(() -> {
                if (webView == null) return;
                webView.requestLayout();
                webView.invalidate();
                webView.evaluateJavascript(
                        "(function(){window.dispatchEvent(new Event('resize'));"
                                + "window.dispatchEvent(new Event('orientationchange'));})();",
                        null
                );
            }, delay);
        }
    }

    private void hideCustomView() {
        if (customView == null) return;

        FrameLayout contentRoot = findViewById(android.R.id.content);
        contentRoot.removeView(customView);
        customView = null;

        if (webView != null) {
            webView.setVisibility(View.VISIBLE);
        }
        exitImmersivePortrait();

        if (customViewCallback != null) {
            customViewCallback.onCustomViewHidden();
            customViewCallback = null;
        }
    }

    private void openExternal(Uri uri) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            startActivity(intent);
        } catch (Exception error) {
            Toast.makeText(
                    this,
                    "No app is available to open this link.",
                    Toast.LENGTH_LONG
            ).show();
        }
    }

    private void configureBackNavigation() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (appFullscreen) {
                    exitAppFullscreen(true);
                } else if (customView != null) {
                    hideCustomView();
                } else if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                } else {
                    finish();
                }
            }
        });
    }

    @Override
    protected void onActivityResult(
            int requestCode,
            int resultCode,
            @Nullable Intent data
    ) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST || filePathCallback == null) {
            return;
        }

        Uri[] result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
        filePathCallback.onReceiveValue(result);
        filePathCallback = null;
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) {
            webView.saveState(outState);
        }
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus && appFullscreen) {
            enterImmersiveLandscape();
        }
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        applySystemTheme();
        if (root != null) ViewCompat.requestApplyInsets(root);

        // Reflow aggressively only while entering/remaining in our custom
        // fullscreen. On portrait exit, the native viewport change is enough
        // and avoids the late Google Drive inline-player collapse.
        if (appFullscreen) {
            queueWebViewportSync();
        } else if (webView != null) {
            webView.requestLayout();
            webView.invalidate();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
        if (updateManager != null) {
            updateManager.onResume();
        }
    }

    @Override
    protected void onPause() {
        if (webView != null) {
            webView.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (appFullscreen) {
            exitAppFullscreen(false);
        }
        if (customView != null) {
            hideCustomView();
        }
        if (webView != null) {
            webView.stopLoading();
            webView.setWebChromeClient(null);
            webView.setWebViewClient(null);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}

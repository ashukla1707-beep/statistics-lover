package com.statisticslover.app;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
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
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import java.util.Arrays;
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

    private WebView webView;
    private ProgressBar progressBar;
    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;
    private ValueCallback<Uri[]> filePathCallback;
    private AppUpdateManager updateManager;
    private boolean appFullscreen;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);

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
        FrameLayout root = new FrameLayout(this);

        webView = new WebView(this);
        webView.setBackgroundColor(0xFFF7F8FB);
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

        ViewCompat.setOnApplyWindowInsetsListener(root, (view, insets) -> {
            Insets bars = insets.getInsets(
                    WindowInsetsCompat.Type.statusBars()
                            | WindowInsetsCompat.Type.navigationBars()
                            | WindowInsetsCompat.Type.displayCutout()
            );
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return insets;
        });
        ViewCompat.requestApplyInsets(root);

        setContentView(root);
        configureWebView();
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
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (customView != null) {
                    callback.onCustomViewHidden();
                    return;
                }

                customView = view;
                customViewCallback = callback;

                FrameLayout contentRoot = findViewById(android.R.id.content);
                contentRoot.addView(
                        customView,
                        new FrameLayout.LayoutParams(
                                ViewGroup.LayoutParams.MATCH_PARENT,
                                ViewGroup.LayoutParams.MATCH_PARENT
                        )
                );
                webView.setVisibility(View.GONE);
                enterImmersiveLandscape();
            }

            @Override
            public void onHideCustomView() {
                hideCustomView();
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

        // The APK uses a desktop Chrome user-agent from startup while keeping the
        // real phone viewport width. This preserves the responsive mobile layout
        // and lets Google Drive render its desktop-capable player immediately.
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
                + "if(window.__SL_NATIVE_FULLSCREEN_FALLBACK__)return;"
                + "window.__SL_NATIVE_FULLSCREEN_FALLBACK__=true;"
                + "var s=document.createElement('style');"
                + "s.id='sl-native-fullscreen-style';"
                + "s.textContent='"
                + ".lecture-player-stage.lecture-player-stage-app-fullscreen{position:fixed!important;inset:0!important;z-index:2147483000!important;width:100dvw!important;height:100dvh!important;max-width:none!important;max-height:none!important;aspect-ratio:auto!important;border:0!important;border-radius:0!important;background:#000!important;box-shadow:none!important;overflow:hidden!important;}"
                + ".lecture-player-stage.lecture-player-stage-app-fullscreen .lecture-player-media{position:absolute!important;inset:0!important;left:0!important;top:0!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;aspect-ratio:auto!important;transform:none!important;will-change:auto!important;}"
                + ".lecture-player-stage.lecture-player-stage-app-fullscreen .lecture-player-media iframe{width:100%!important;height:100%!important;}"
                + ".lecture-player-stage.lecture-player-stage-app-fullscreen .lecture-player-overlay{position:absolute!important;inset:0!important;left:0!important;top:0!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;aspect-ratio:auto!important;transform:none!important;will-change:auto!important;z-index:40!important;}"
                + ".lecture-player-stage.lecture-player-stage-app-fullscreen .lecture-player-fullscreen{right:18px!important;bottom:18px!important;width:48px!important;height:48px!important;border-radius:10px!important;background:rgba(0,0,0,.72)!important;box-shadow:0 3px 12px rgba(0,0,0,.3)!important;}"
                + ".lecture-player-stage.lecture-player-stage-app-fullscreen .lecture-player-drive-brand-blocker{top:12px!important;right:12px!important;width:64px!important;height:64px!important;transform:none!important;}"
                + "';"
                + "document.head.appendChild(s);"
                + "function setButton(b,on){"
                + "b.setAttribute('aria-label',on?'Exit full screen':'Enter full screen');"
                + "b.setAttribute('title',on?'Exit full screen':'Full screen');"
                + "}"
                + "document.addEventListener('click',function(e){"
                + "var b=e.target&&e.target.closest?e.target.closest('.lecture-player-fullscreen'):null;"
                + "if(!b)return;"
                + "var stage=b.closest('.lecture-player-stage');"
                + "if(!stage)return;"
                + "e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();"
                + "var on=!stage.classList.contains('lecture-player-stage-app-fullscreen');"
                + "stage.classList.toggle('lecture-player-stage-app-fullscreen',on);"
                + "document.documentElement.style.overflow=on?'hidden':'';"
                + "document.body.style.overflow=on?'hidden':'';"
                + "setButton(b,on);"
                + "try{if(on){window.StatisticsLoverNative&&window.StatisticsLoverNative.enterFullscreen&&window.StatisticsLoverNative.enterFullscreen();}"
                + "else{window.StatisticsLoverNative&&window.StatisticsLoverNative.exitFullscreen&&window.StatisticsLoverNative.exitFullscreen();}}catch(_){ }"
                + "},true);"
                + "window.addEventListener('statisticslover:exit-fullscreen',function(){"
                + "var stage=document.querySelector('.lecture-player-stage-app-fullscreen');"
                + "if(stage)stage.classList.remove('lecture-player-stage-app-fullscreen');"
                + "document.documentElement.style.overflow='';document.body.style.overflow='';"
                + "var b=document.querySelector('.lecture-player-fullscreen');if(b)setButton(b,false);"
                + "});"
                + "})();";

        webView.evaluateJavascript(script, null);
    }

    private void enterImmersiveLandscape() {
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

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

        if (!isRecordingUrl(webView == null ? null : webView.getUrl())) {
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
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

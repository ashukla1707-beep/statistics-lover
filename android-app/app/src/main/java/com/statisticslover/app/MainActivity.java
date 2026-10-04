package com.statisticslover.app;

import android.annotation.SuppressLint;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import java.util.Locale;
import java.util.regex.Pattern;

public class MainActivity extends AppCompatActivity {
    private static final Pattern RECORDING_ROUTE =
            Pattern.compile(".*/learn/[^/]+/lecture/[^/?#]+(?:[/?#].*)?$");

    private static final String DESKTOP_USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
            "AppleWebKit/537.36 (KHTML, like Gecko) " +
            "Chrome/126.0.0.0 Safari/537.36 StatisticsLoverAndroid/1.0.16";

    protected WebView webView;
    private FrameLayout root;
    private String mobileUserAgent;
    private boolean desktopUserAgentActive;
    private boolean userAgentReloadInProgress;
    private boolean appFullscreen;
    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;
    private ValueCallback<Uri[]> filePathCallback;
    private static final int FILE_CHOOSER_REQUEST = 4107;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (!BuildConfig.DEBUG) getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);

        root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(248, 246, 250));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(248, 246, 250));
        root.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        setContentView(root);

        ViewCompat.setOnApplyWindowInsetsListener(root, (view, insets) -> {
            if (customView != null) return insets;
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return insets;
        });

        configureWebView();
        configureBackNavigation();

        if (savedInstanceState == null) {
            webView.loadUrl(BuildConfig.APP_URL);
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(false);
        s.setSupportMultipleWindows(true);
        s.setTextZoom(100);
        webView.setInitialScale(0);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            s.setSafeBrowsingEnabled(true);
            webView.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_YES);
        }

        mobileUserAgent = s.getUserAgentString() + " StatisticsLoverAndroid/1.0.16";
        s.setUserAgentString(mobileUserAgent);

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new AppWebViewClient());
        webView.setWebChromeClient(new AppWebChromeClient());
        webView.addJavascriptInterface(new StatisticsLoverBridge(), "StatisticsLoverNative");
        webView.setDownloadListener((url, ua, disposition, mime, length) -> openExternal(Uri.parse(url)));
    }

    private void configureBackNavigation() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (appFullscreen) {
                    exitAppFullscreen(true);
                } else if (customView != null) {
                    ((AppWebChromeClient) webView.getWebChromeClient()).onHideCustomView();
                } else if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    finish();
                }
            }
        });
    }

    protected boolean isInternalHost(String host) {
        if (host == null) return false;
        String h = host.toLowerCase(Locale.US);
        return h.equals("statistics-lover.vercel.app")
                || h.equals("statistics-lover-git-develop-statistics-lover.vercel.app")
                || h.endsWith(".vercel.app") && h.startsWith("statistics-lover-");
    }

    private boolean isRecordingUrl(String url) {
        if (url == null) return false;
        try {
            Uri uri = Uri.parse(url);
            return isInternalHost(uri.getHost()) && RECORDING_ROUTE.matcher(url).matches();
        } catch (Exception ignored) {
            return false;
        }
    }

    private void syncRecordingMode(String url, boolean allowReload) {
        boolean shouldUseDesktop = isRecordingUrl(url);

        if (shouldUseDesktop) {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        } else if (customView == null) {
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        }

        if (shouldUseDesktop == desktopUserAgentActive) return;

        desktopUserAgentActive = shouldUseDesktop;
        webView.getSettings().setUserAgentString(
                shouldUseDesktop ? DESKTOP_USER_AGENT : mobileUserAgent
        );

        if (allowReload && !userAgentReloadInProgress) {
            userAgentReloadInProgress = true;
            webView.post(webView::reload);
        }
    }

    protected void openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException error) {
            Toast.makeText(this, "No app is available to open this link.", Toast.LENGTH_SHORT).show();
        }
    }

    private void injectNativeAppMode(WebView view) {
        view.evaluateJavascript(
                "(function(){try{" +
                "document.documentElement.classList.add('statistics-lover-android-app');" +
                "if(document.body)document.body.classList.add('statistics-lover-android-app');" +
                "var m=document.querySelector('meta[name=theme-color]');" +
                "if(m)m.setAttribute('content','#08111F');" +
                "var style=document.getElementById('statisticsLoverAndroidStyle');" +
                "if(!style){style=document.createElement('style');style.id='statisticsLoverAndroidStyle';" +
                "style.textContent='" +
                "html.statistics-lover-android-app .site-footer{display:none!important}" +
                "html.statistics-lover-android-app .skip-link{display:none!important}" +
                "html.statistics-lover-android-app .primary-nav a[href^=\\\"/#\\\"]{display:none!important}" +
                "html.statistics-lover-android-app .header-inner{min-height:60px!important}" +
                "html.statistics-lover-android-app .brand-logo{width:38px!important;height:38px!important}" +
                "html.statistics-lover-android-app .brand-copy small{display:none!important}" +
                "html.statistics-lover-android-app .brand-copy strong{font-size:1rem!important}" +
                "html.statistics-lover-android-app .site-header{background:#fffdfd!important}" +
                "html.statistics-lover-android-app .app-shell{min-height:100dvh!important}" +
                "html.statistics-lover-android-app main{min-height:calc(100dvh - 60px)!important}" +
                "';document.head.appendChild(style);}" +
                "if(!window.__statisticsLoverAndroidBrandBound){" +
                "window.__statisticsLoverAndroidBrandBound=true;" +
                "document.addEventListener('click',function(e){" +
                "var t=e.target&&e.target.closest?e.target.closest('.brand'):null;" +
                "if(!t)return;e.preventDefault();e.stopImmediatePropagation();" +
                "window.location.assign('/dashboard');" +
                "},true);" +
                "}" +
                "return true;}catch(e){return false;}})();",
                null
        );
    }

    private void enterImmersiveLandscape() {
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        root.setPadding(0,0,0,0);

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
                    View.SYSTEM_UI_FLAG_FULLSCREEN |
                    View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            );
        }
    }

    private void exitImmersivePortrait() {
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        ViewCompat.requestApplyInsets(root);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.show(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
        }

        if (!isRecordingUrl(webView.getUrl())) {
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        }
    }


    private final class StatisticsLoverBridge {
        @JavascriptInterface
        public void enterFullscreen() {
            runOnUiThread(() -> {
                if (appFullscreen) return;
                appFullscreen = true;
                enterImmersiveLandscape();
            });
        }

        @JavascriptInterface
        public void exitFullscreen() {
            runOnUiThread(() -> exitAppFullscreen(false));
        }
    }

    private void exitAppFullscreen(boolean notifyPage) {
        if (!appFullscreen) return;
        appFullscreen = false;
        exitImmersivePortrait();
        if (notifyPage) {
            webView.evaluateJavascript(
                    "window.dispatchEvent(new Event('statisticslover:exit-fullscreen'));",
                    null
            );
        }
    }

    private final class AppWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.US);

            if ("http".equals(scheme) || "https".equals(scheme)) {
                if (isInternalHost(uri.getHost())) {
                    syncRecordingMode(uri.toString(), false);
                    return false;
                }
                openExternal(uri);
                return true;
            }

            if ("about".equals(scheme)) return false;
            openExternal(uri);
            return true;
        }

        @Override
        public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
            if (appFullscreen && !isRecordingUrl(url)) exitAppFullscreen(false);
            syncRecordingMode(url, false);
            super.onPageStarted(view, url, favicon);
        }

        @Override
        public void doUpdateVisitedHistory(WebView view, String url, boolean isReload) {
            syncRecordingMode(url, true);
            super.doUpdateVisitedHistory(view, url, isReload);
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            userAgentReloadInProgress = false;
            syncRecordingMode(url, false);
            injectNativeAppMode(view);
            CookieManager.getInstance().flush();
            super.onPageFinished(view, url);
        }

        @Override
        public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
            handler.cancel();
            Toast.makeText(MainActivity.this, "Secure connection failed.", Toast.LENGTH_SHORT).show();
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) {
                Toast.makeText(MainActivity.this, "Unable to load Statistics Lover. Check your connection.", Toast.LENGTH_LONG).show();
            }
            super.onReceivedError(view, request, error);
        }
    }

    private final class AppWebChromeClient extends WebChromeClient {
        @Override
        public void onShowCustomView(View view, CustomViewCallback callback) {
            if (customView != null) {
                callback.onCustomViewHidden();
                return;
            }
            customView = view;
            customViewCallback = callback;
            root.addView(customView, new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
            ));
            webView.setVisibility(View.GONE);
            enterImmersiveLandscape();
        }

        @Override
        public void onHideCustomView() {
            if (customView == null) return;
            root.removeView(customView);
            customView = null;
            webView.setVisibility(View.VISIBLE);
            exitImmersivePortrait();
            if (customViewCallback != null) {
                customViewCallback.onCustomViewHidden();
                customViewCallback = null;
            }
        }

        @Override
        public boolean onShowFileChooser(
                WebView view,
                ValueCallback<Uri[]> callback,
                FileChooserParams params
        ) {
            if (filePathCallback != null) filePathCallback.onReceiveValue(null);
            filePathCallback = callback;
            try {
                Intent intent = params.createIntent();
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                return true;
            } catch (ActivityNotFoundException error) {
                filePathCallback = null;
                Toast.makeText(MainActivity.this, "No file picker is available.", Toast.LENGTH_SHORT).show();
                return false;
            }
        }

        @Override
        public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
            WebView popup = new WebView(MainActivity.this);
            popup.setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView child, WebResourceRequest request) {
                    Uri uri = request.getUrl();
                    if (isInternalHost(uri.getHost())) {
                        webView.loadUrl(uri.toString());
                    } else {
                        openExternal(uri);
                    }
                    child.destroy();
                    return true;
                }
            });
            WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
            transport.setWebView(popup);
            resultMsg.sendToTarget();
            return true;
        }
    }

    @Override
    @SuppressWarnings("deprecation")
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST && filePathCallback != null) {
            Uri[] result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            filePathCallback.onReceiveValue(result);
            filePathCallback = null;
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus && appFullscreen) enterImmersiveLandscape();
    }

    @Override
    protected void onPause() {
        webView.onPause();
        CookieManager.getInstance().flush();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.loadUrl("about:blank");
            webView.stopLoading();
            webView.setWebChromeClient(null);
            webView.setWebViewClient(null);
            webView.destroy();
        }
        super.onDestroy();
    }
}

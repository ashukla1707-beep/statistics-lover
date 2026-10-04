package com.statisticslover.app;

import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.core.splashscreen.SplashScreen;

public class LaunchReadyActivity extends MainActivity {
    private static final long READY_POLL_MS = 90L;
    private static final long MIN_SPLASH_VISIBLE_MS = 750L;
    private static final long FAILSAFE_MS = 9000L;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private FrameLayout launchOverlay;
    private long createdAt;
    private boolean dismissed;

    private final Runnable readyPoll = new Runnable() {
        @Override
        public void run() {
            if (dismissed || isFinishing() || isDestroyed()) return;

            long elapsed = SystemClock.uptimeMillis() - createdAt;
            if (elapsed >= FAILSAFE_MS) {
                reveal();
                return;
            }

            WebView view = webView;
            if (view == null) {
                schedule();
                return;
            }

            view.evaluateJavascript(
                    "(function(){try{" +
                    "var root=document.getElementById('root');" +
                    "return document.readyState==='complete'&&!!root&&root.childElementCount>0;" +
                    "}catch(e){return false;}})();",
                    value -> {
                        if (dismissed) return;
                        if ("true".equals(value)) {
                            long remaining = MIN_SPLASH_VISIBLE_MS -
                                    (SystemClock.uptimeMillis() - createdAt);
                            if (remaining > 0) handler.postDelayed(this::reveal, remaining);
                            else reveal();
                        } else {
                            schedule();
                        }
                    }
            );
        }

        private void reveal() {
            LaunchReadyActivity.this.reveal();
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
        createdAt = SystemClock.uptimeMillis();
        installOverlay();
        handler.post(readyPoll);
    }

    private void installOverlay() {
        ViewGroup content = findViewById(android.R.id.content);
        if (content == null) return;

        launchOverlay = new FrameLayout(this);
        launchOverlay.setBackgroundColor(Color.rgb(248, 246, 250));
        launchOverlay.setClickable(true);
        launchOverlay.setFocusable(true);

        LinearLayout stack = new LinearLayout(this);
        stack.setOrientation(LinearLayout.VERTICAL);
        stack.setGravity(Gravity.CENTER);
        stack.setPadding(48, 48, 48, 48);

        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.ic_launcher);
        int logoSize = (int) (150 * getResources().getDisplayMetrics().density);
        stack.addView(logo, new LinearLayout.LayoutParams(logoSize, logoSize));

        TextView title = new TextView(this);
        title.setText("Statistics Lover");
        title.setTextColor(Color.rgb(10, 37, 79));
        title.setTextSize(30f);
        title.setGravity(Gravity.CENTER);
        title.setTypeface(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        titleParams.topMargin = (int) (20 * getResources().getDisplayMetrics().density);
        stack.addView(title, titleParams);

        TextView subtitle = new TextView(this);
        subtitle.setText("Learn. Practice. Perform.");
        subtitle.setTextColor(Color.rgb(102, 112, 133));
        subtitle.setTextSize(13f);
        subtitle.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams subtitleParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        subtitleParams.topMargin = (int) (8 * getResources().getDisplayMetrics().density);
        stack.addView(subtitle, subtitleParams);

        launchOverlay.addView(stack, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        content.addView(launchOverlay, new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
    }

    private void schedule() {
        handler.removeCallbacks(readyPoll);
        handler.postDelayed(readyPoll, READY_POLL_MS);
    }

    private void reveal() {
        if (dismissed) return;
        dismissed = true;
        handler.removeCallbacksAndMessages(null);
        restoreSystemBars();

        if (launchOverlay == null) return;
        launchOverlay.animate()
                .alpha(0f)
                .setDuration(150L)
                .withEndAction(() -> {
                    ViewGroup parent = (ViewGroup) launchOverlay.getParent();
                    if (parent != null) parent.removeView(launchOverlay);
                    launchOverlay = null;
                })
                .start();
    }

    private void restoreSystemBars() {
        Window window = getWindow();
        window.clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        window.setStatusBarColor(Color.rgb(8, 17, 31));
        window.setNavigationBarColor(Color.rgb(8, 17, 31));
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R
                && window.getInsetsController() != null) {
            window.getInsetsController().show(
                    WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars()
            );
        }
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }
}

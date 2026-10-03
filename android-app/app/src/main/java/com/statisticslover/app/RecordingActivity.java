package com.statisticslover.app;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

public final class RecordingActivity extends AppCompatActivity {
    private static final String EXTRA_TITLE="recording_title";
    private static final String EXTRA_URL="recording_url";

    private final String desktopUserAgent=
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "+
            "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 StatisticsLoverAndroid/1.0";

    private FrameLayout root;
    private LinearLayout toolbar;
    private WebView webView;
    private Button fullscreenButton;
    private boolean fullscreen;

    static void open(Context context,String title,String url){
        Intent intent=new Intent(context,RecordingActivity.class);
        intent.putExtra(EXTRA_TITLE,title);
        intent.putExtra(EXTRA_URL,url);
        context.startActivity(intent);
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle state){
        super.onCreate(state);
        if(!BuildConfig.DEBUG) getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);

        String url=getIntent().getStringExtra(EXTRA_URL);
        if(url==null||url.isBlank()||!url.startsWith("https://")){
            Toast.makeText(this,"Recording link is unavailable.",Toast.LENGTH_LONG).show();
            finish();
            return;
        }

        NativeUi ui=new NativeUi(this);
        root=new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);

        LinearLayout shell=new LinearLayout(this);
        shell.setOrientation(LinearLayout.VERTICAL);
        shell.setBackgroundColor(Color.BLACK);
        root.addView(shell,new FrameLayout.LayoutParams(-1,-1));

        toolbar=new LinearLayout(this);
        toolbar.setGravity(Gravity.CENTER_VERTICAL);
        toolbar.setPadding(ui.dp(10),ui.dp(6),ui.dp(12),ui.dp(6));
        toolbar.setBackgroundColor(Color.WHITE);

        Button back=ui.button("← Back",false);
        back.setOnClickListener(v->finish());
        toolbar.addView(back,new LinearLayout.LayoutParams(ui.dp(92),ui.dp(44)));

        LinearLayout titleBlock=new LinearLayout(this);
        titleBlock.setOrientation(LinearLayout.VERTICAL);
        titleBlock.setPadding(ui.dp(10),0,0,0);
        TextView brand=ui.text("STATISTICS LOVER",10,NativeUi.MAGENTA,true);
        TextView title=ui.text(getIntent().getStringExtra(EXTRA_TITLE),15,NativeUi.NAVY,true);
        titleBlock.addView(brand);
        titleBlock.addView(title);
        toolbar.addView(titleBlock,new LinearLayout.LayoutParams(0,-2,1f));
        shell.addView(toolbar,new LinearLayout.LayoutParams(-1,ui.dp(58)));

        webView=new WebView(this);
        webView.setBackgroundColor(Color.BLACK);
        WebSettings settings=webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUserAgentString(desktopUserAgent);
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient(){
            @Override
            public void onShowCustomView(View view,CustomViewCallback callback){
                if(callback!=null) callback.onCustomViewHidden();
                enterFullscreen();
            }

            @Override
            public void onHideCustomView(){
                exitFullscreen();
            }
        });
        shell.addView(webView,new LinearLayout.LayoutParams(-1,0,1f));

        fullscreenButton=ui.button("⛶ Fullscreen",true);
        fullscreenButton.setOnClickListener(v->{
            if(fullscreen) exitFullscreen(); else enterFullscreen();
        });
        FrameLayout.LayoutParams fullParams=new FrameLayout.LayoutParams(ui.dp(154),ui.dp(48));
        fullParams.gravity=Gravity.BOTTOM|Gravity.END;
        fullParams.setMargins(ui.dp(12),ui.dp(12),ui.dp(14),ui.dp(14));
        root.addView(fullscreenButton,fullParams);

        ViewCompat.setOnApplyWindowInsetsListener(root,(v,insets)->{
            Insets bars=insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(bars.left,fullscreen?0:bars.top,bars.right,fullscreen?0:bars.bottom);
            return insets;
        });

        setContentView(root);
        configureBack();
        webView.loadUrl(url);
    }

    private void configureBack(){
        getOnBackPressedDispatcher().addCallback(this,new OnBackPressedCallback(true){
            @Override
            public void handleOnBackPressed(){
                if(fullscreen){
                    exitFullscreen();
                    return;
                }
                finish();
            }
        });
    }

    private void enterFullscreen(){
        if(fullscreen) return;
        fullscreen=true;
        toolbar.setVisibility(View.GONE);
        fullscreenButton.setText("Exit fullscreen");

        WindowInsetsControllerCompat controller=
                new WindowInsetsControllerCompat(getWindow(),getWindow().getDecorView());
        controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controller.hide(WindowInsetsCompat.Type.systemBars());

        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
        ViewCompat.requestApplyInsets(root);
    }

    private void exitFullscreen(){
        if(!fullscreen) return;
        fullscreen=false;
        toolbar.setVisibility(View.VISIBLE);
        fullscreenButton.setText("⛶ Fullscreen");

        WindowInsetsControllerCompat controller=
                new WindowInsetsControllerCompat(getWindow(),getWindow().getDecorView());
        controller.show(WindowInsetsCompat.Type.systemBars());

        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        ViewCompat.requestApplyInsets(root);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus){
        super.onWindowFocusChanged(hasFocus);
        if(hasFocus&&fullscreen){
            WindowInsetsControllerCompat controller=
                    new WindowInsetsControllerCompat(getWindow(),getWindow().getDecorView());
            controller.hide(WindowInsetsCompat.Type.systemBars());
        }
    }

    @Override
    protected void onDestroy(){
        if(webView!=null){
            webView.stopLoading();
            webView.loadUrl("about:blank");
            webView.clearHistory();
            webView.removeAllViews();
            webView.destroy();
        }
        super.onDestroy();
    }
}

package com.statisticslover.app;

import android.app.Application;
import android.os.Build;
import android.webkit.WebView;

public class StatisticsLoverApplication extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            try {
                WebView.setDataDirectorySuffix("statisticslover_v101");
            } catch (Throwable ignored) {
            }
        }
    }
}

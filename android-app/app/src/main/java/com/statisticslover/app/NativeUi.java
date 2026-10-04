package com.statisticslover.app;

import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

final class NativeUi {
    static final int NAVY=Color.rgb(10,37,79);
    static final int MAGENTA=Color.rgb(198,0,90);
    static final int BG=Color.rgb(247,248,251);
    static final int MUTED=Color.rgb(102,112,133);
    static final int LINE=Color.rgb(222,226,234);
    static final int GREEN=Color.rgb(23,107,57);

    final Context context;

    NativeUi(Context context){ this.context=context; }

    int dp(int value){
        return Math.round(value*context.getResources().getDisplayMetrics().density);
    }

    TextView text(String value,float size,int color,boolean bold){
        TextView view=new TextView(context);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        if(bold)view.setTypeface(Typeface.DEFAULT,Typeface.BOLD);
        return view;
    }

    GradientDrawable rounded(int fill,int stroke,int strokeColor,int radius){
        GradientDrawable drawable=new GradientDrawable();
        drawable.setColor(fill);
        drawable.setCornerRadius(dp(radius));
        if(stroke>0)drawable.setStroke(dp(stroke),strokeColor);
        return drawable;
    }

    LinearLayout card(){
        LinearLayout card=new LinearLayout(context);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(16),dp(14),dp(16),dp(14));
        card.setBackground(rounded(Color.WHITE,1,LINE,14));
        LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);
        lp.setMargins(0,0,0,dp(10));
        card.setLayoutParams(lp);
        return card;
    }

    Button button(String label,boolean primary){
        Button button=new Button(context);
        button.setText(label);
        button.setAllCaps(false);
        button.setTextSize(13);
        button.setTypeface(Typeface.DEFAULT,Typeface.BOLD);
        button.setMinHeight(dp(46));
        button.setTextColor(primary?Color.WHITE:NAVY);
        button.setBackground(rounded(primary?MAGENTA:Color.WHITE,primary?0:1,LINE,11));
        return button;
    }

    ScrollView page(String title,String subtitle){
        ScrollView scroll=new ScrollView(context);
        LinearLayout body=new LinearLayout(context);
        body.setOrientation(LinearLayout.VERTICAL);
        body.setPadding(dp(16),dp(18),dp(16),dp(24));
        scroll.addView(body);
        scroll.setTag(body);
        body.addView(text("STATISTICS LOVER",11,MAGENTA,true));
        body.addView(text(title,27,NAVY,true));
        if(subtitle!=null&&!subtitle.isBlank())add(body,text(subtitle,13,MUTED,false),3);
        return scroll;
    }

    LinearLayout body(ScrollView scroll){
        return (LinearLayout)scroll.getTag();
    }

    void add(LinearLayout parent,View child,int topMargin){
        LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);
        lp.topMargin=dp(topMargin);
        parent.addView(child,lp);
    }
}

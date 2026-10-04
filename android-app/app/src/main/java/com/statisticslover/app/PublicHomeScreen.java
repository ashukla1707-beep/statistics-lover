package com.statisticslover.app;

import android.graphics.Color;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

final class PublicHomeScreen {
    interface Listener {
        void onExploreCourses();
        void onFreeContent();
        void onAccount();
    }

    static ScrollView build(NativeUi ui, Listener listener, boolean signedIn) {
        ScrollView scroll=new ScrollView(ui.context);
        scroll.setFillViewport(true);

        LinearLayout body=new LinearLayout(ui.context);
        body.setOrientation(LinearLayout.VERTICAL);
        body.setPadding(ui.dp(20),ui.dp(28),ui.dp(20),ui.dp(34));
        scroll.addView(body);

        TextView kicker=ui.text("A DEDICATED PLATFORM FOR STATISTICS LEARNERS",11,NativeUi.MAGENTA,true);
        kicker.setPadding(ui.dp(12),ui.dp(7),ui.dp(12),ui.dp(7));
        kicker.setBackground(ui.rounded(Color.rgb(255,240,247),0,Color.TRANSPARENT,30));
        body.addView(kicker,new LinearLayout.LayoutParams(-2,-2));

        ui.add(body,ui.text("Learn statistics with",34,NativeUi.NAVY,true),18);
        ui.add(body,ui.text("clarity, structure and practice.",34,NativeUi.MAGENTA,true),0);
        ui.add(body,ui.text(
                "A focused statistics learning platform for live classes, recorded lectures, tests, PYQs and study material.",
                15,NativeUi.MUTED,false
        ),14);

        Button explore=ui.button("Explore Courses",true);
        explore.setOnClickListener(v->listener.onExploreCourses());
        ui.add(body,explore,22);

        Button free=ui.button("Start with Free Content",false);
        free.setOnClickListener(v->listener.onFreeContent());
        ui.add(body,free,10);

        LinearLayout trust=new LinearLayout(ui.context);
        trust.setOrientation(LinearLayout.HORIZONTAL);
        trust.setGravity(Gravity.CENTER_VERTICAL);
        trust.setPadding(0,ui.dp(20),0,ui.dp(6));
        trust.addView(trustItem(ui,"Live classes"),new LinearLayout.LayoutParams(0,-2,1f));
        trust.addView(trustItem(ui,"Recorded lectures"),new LinearLayout.LayoutParams(0,-2,1f));
        trust.addView(trustItem(ui,"Tests & PYQs"),new LinearLayout.LayoutParams(0,-2,1f));
        body.addView(trust);

        ui.add(body,ui.text("EVERYTHING IN ONE PLACE",11,NativeUi.MAGENTA,true),30);
        ui.add(body,ui.text("A complete statistics learning ecosystem",26,NativeUi.NAVY,true),5);
        ui.add(body,ui.text(
                "Courses, practice, previous-year questions and study material in one focused learning experience.",
                14,NativeUi.MUTED,false
        ),8);

        body.addView(feature(ui,"01","Courses & Batches",
                "Structured learning paths with live teaching and organized recorded lectures."));
        body.addView(feature(ui,"02","Free Content",
                "High-quality open lessons and resources before a student commits to a paid batch."));
        body.addView(feature(ui,"03","Test Series",
                "Topic-wise and full-length assessments designed around real examination patterns."));
        body.addView(feature(ui,"04","PYQs & Materials",
                "Previous-year questions, notes, formula sheets and practice resources."));

        LinearLayout foundation=ui.card();
        foundation.setBackground(ui.rounded(Color.rgb(10,37,79),0,Color.TRANSPARENT,16));
        foundation.addView(ui.text("BUILT TO GROW",11,Color.rgb(255,148,197),true));
        foundation.addView(ui.text("Live today. App-ready tomorrow.",23,Color.WHITE,true));
        ui.add(foundation,ui.text(
                "Student learning, teacher tools and administration stay connected to the same Statistics Lover platform.",
                13,Color.rgb(222,229,240),false
        ),8);
        ui.add(body,foundation,20);

        LinearLayout callout=ui.card();
        callout.addView(ui.text("STATISTICS LOVER",11,NativeUi.MAGENTA,true));
        callout.addView(ui.text(
                signedIn ? "Continue with your learning dashboard." : "Ready to start learning?",
                22,NativeUi.NAVY,true
        ));
        ui.add(callout,ui.text(
                signedIn
                        ? "Open your dashboard for enrolled courses, notifications, tests, orders and more."
                        : "Sign in to access your enrolled courses and student tools.",
                13,NativeUi.MUTED,false
        ),8);
        Button account=ui.button(signedIn?"Open Dashboard":"Student Login",true);
        account.setOnClickListener(v->listener.onAccount());
        ui.add(callout,account,14);
        ui.add(body,callout,10);

        return scroll;
    }

    private static TextView trustItem(NativeUi ui,String label){
        TextView view=ui.text(label,10,NativeUi.NAVY,true);
        view.setGravity(Gravity.CENTER);
        view.setPadding(ui.dp(4),ui.dp(8),ui.dp(4),ui.dp(8));
        return view;
    }

    private static LinearLayout feature(NativeUi ui,String number,String title,String description){
        LinearLayout card=ui.card();
        LinearLayout.LayoutParams lp=(LinearLayout.LayoutParams)card.getLayoutParams();
        lp.topMargin=ui.dp(10);
        card.setLayoutParams(lp);
        card.addView(ui.text(number,12,NativeUi.MAGENTA,true));
        ui.add(card,ui.text(title,18,NativeUi.NAVY,true),5);
        ui.add(card,ui.text(description,13,NativeUi.MUTED,false),7);
        return card;
    }
}

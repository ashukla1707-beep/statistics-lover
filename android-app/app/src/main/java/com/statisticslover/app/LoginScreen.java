package com.statisticslover.app;

import android.content.Context;
import android.text.InputType;
import android.view.Gravity;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

final class LoginScreen {
    interface Listener {
        void onSignIn(String email, String credential);
    }

    static ScrollView build(Context context, NativeUi ui, Listener listener) {
        ScrollView scroll=new ScrollView(context);
        scroll.setFillViewport(true);

        LinearLayout body=new LinearLayout(context);
        body.setOrientation(LinearLayout.VERTICAL);
        body.setGravity(Gravity.CENTER_HORIZONTAL);
        body.setPadding(ui.dp(24),ui.dp(44),ui.dp(24),ui.dp(24));
        scroll.addView(body);

        body.addView(ui.text("STATISTICS LOVER",12,NativeUi.MAGENTA,true));
        body.addView(ui.text("Sign in",32,NativeUi.NAVY,true));
        body.addView(ui.text("Native Android application",14,NativeUi.MUTED,false));

        EditText email=new EditText(context);
        email.setHint("Email");
        email.setTextSize(16);
        email.setSingleLine(true);
        email.setTextColor(NativeUi.NAVY);
        email.setHintTextColor(NativeUi.MUTED);
        email.setPadding(ui.dp(14),0,ui.dp(14),0);
        email.setMinHeight(ui.dp(52));
        email.setBackground(ui.rounded(android.graphics.Color.WHITE,1,NativeUi.LINE,11));

        EditText secret=new EditText(context);
        secret.setHint("Password");
        secret.setTextSize(16);
        secret.setSingleLine(true);
        secret.setTextColor(NativeUi.NAVY);
        secret.setHintTextColor(NativeUi.MUTED);
        secret.setPadding(ui.dp(14),0,ui.dp(14),0);
        secret.setMinHeight(ui.dp(52));
        secret.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);
        secret.setBackground(ui.rounded(android.graphics.Color.WHITE,1,NativeUi.LINE,11));

        ui.add(body,email,28);
        ui.add(body,secret,10);

        Button submit=ui.button("Sign in",true);
        ui.add(body,submit,14);

        TextView note=ui.text(
                "This screen is native. The Statistics Lover website is not loaded inside the app.",
                12,NativeUi.MUTED,false);
        ui.add(body,note,22);

        submit.setOnClickListener(v->listener.onSignIn(
                email.getText().toString().trim(),
                secret.getText().toString()
        ));

        return scroll;
    }
}

package com.statisticslover.app;

import android.content.Context;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.NumberFormat;
import java.util.Locale;

final class StoreScreen {
    interface CreateOrder {
        void run(String batchId,String couponCode);
    }

    static ScrollView build(
            Context context,
            NativeUi ui,
            JSONArray offers,
            CreateOrder createOrder,
            Runnable back
    ) {
        ScrollView scroll=ui.page("Courses","Browse Statistics Lover batches and course offers");
        LinearLayout body=ui.body(scroll);

        Button backButton=ui.button("← Back",false);
        backButton.setOnClickListener(v->back.run());
        body.addView(backButton);

        EditText coupon=new EditText(context);
        coupon.setHint("Coupon code (optional)");
        coupon.setSingleLine(true);
        coupon.setTextSize(16);
        coupon.setPadding(ui.dp(14),0,ui.dp(14),0);
        coupon.setMinHeight(ui.dp(50));
        coupon.setBackground(ui.rounded(android.graphics.Color.WHITE,1,NativeUi.LINE,11));
        ui.add(body,coupon,12);

        NumberFormat money=NumberFormat.getCurrencyInstance(new Locale("en","IN"));

        for(int i=0;i<offers.length();i++){
            JSONObject offer=offers.optJSONObject(i);
            if(offer==null)continue;

            LinearLayout card=ui.card();
            card.addView(ui.text(offer.optString("course_title","Course"),18,NativeUi.NAVY,true));
            card.addView(ui.text(offer.optString("batch_title","Batch"),13,NativeUi.MUTED,false));

            long price=offer.isNull("sale_price_minor")
                    ? offer.optLong("list_price_minor",0)
                    : offer.optLong("sale_price_minor",0);
            card.addView(ui.text(money.format(price/100.0),17,NativeUi.MAGENTA,true));

            String batchId=offer.optString("batch_id");
            Button order=ui.button("Create order",true);
            order.setOnClickListener(v->createOrder.run(batchId,coupon.getText().toString()));
            ui.add(card,order,10);
            body.addView(card);
        }
        return scroll;
    }
}

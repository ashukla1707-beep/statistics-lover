package com.statisticslover.app;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.Toast;

final class ExternalActions {
    static void open(Context context,String url){
        if(url==null||url.isBlank())return;
        try{
            context.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        }catch(ActivityNotFoundException error){
            Toast.makeText(context,"No app can open this link.",Toast.LENGTH_LONG).show();
        }
    }
}

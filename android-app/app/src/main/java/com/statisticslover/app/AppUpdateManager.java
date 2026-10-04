package com.statisticslover.app;

import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

final class AppUpdateManager {
    private final MainActivity activity;
    private final ExecutorService io=Executors.newSingleThreadExecutor();
    private DownloadManager downloads;
    private long downloadId=-1L;
    private JSONObject pendingUpdate;
    private boolean receiverRegistered;
    private boolean closed;

    AppUpdateManager(MainActivity activity){
        this.activity=activity;
        downloads=(DownloadManager)activity.getSystemService(Context.DOWNLOAD_SERVICE);
    }

    void checkForUpdate(){
        io.execute(()->{
            try{
                JSONObject update=fetchManifest();
                if(update==null||closed)return;
                int latest=update.optInt("versionCode",0);
                String apkUrl=update.optString("apkUrl","").trim();
                if(latest<=BuildConfig.VERSION_CODE||!apkUrl.startsWith("https://"))return;
                pendingUpdate=update;
                activity.runOnUiThread(()->showPrompt(update));
            }catch(Exception ignored){
                // Update checks must never block the app.
            }
        });
    }

    void onResume(){
        if(pendingUpdate==null||closed)return;
        if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.O
                && activity.getPackageManager().canRequestPackageInstalls()
                && downloadId<0L){
            JSONObject update=pendingUpdate;
            pendingUpdate=null;
            startDownload(update);
        }
    }

    private JSONObject fetchManifest() throws Exception{
        HttpURLConnection connection=(HttpURLConnection)new URL(BuildConfig.UPDATE_MANIFEST_URL).openConnection();
        connection.setConnectTimeout(7000);
        connection.setReadTimeout(7000);
        connection.setRequestMethod("GET");
        connection.setRequestProperty("Accept","application/json");
        connection.setRequestProperty("Cache-Control","no-cache");
        try{
            if(connection.getResponseCode()!=200)return null;
            StringBuilder body=new StringBuilder();
            try(BufferedReader reader=new BufferedReader(new InputStreamReader(connection.getInputStream()))){
                String line;
                while((line=reader.readLine())!=null)body.append(line);
            }
            return new JSONObject(body.toString());
        }finally{
            connection.disconnect();
        }
    }

    private void showPrompt(JSONObject update){
        if(activity.isFinishing()||activity.isDestroyed()||closed)return;
        String version=update.optString("versionName","new version");
        new AlertDialog.Builder(activity)
                .setTitle("Statistics Lover update")
                .setMessage("Version "+version+" is available. Update now?")
                .setNegativeButton("Later",null)
                .setPositiveButton("Update",(dialog,which)->prepareDownload(update))
                .show();
    }

    private void prepareDownload(JSONObject update){
        if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.O
                && !activity.getPackageManager().canRequestPackageInstalls()){
            pendingUpdate=update;
            Intent settings=new Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:"+activity.getPackageName())
            );
            activity.startActivity(settings);
            Toast.makeText(
                    activity,
                    "Allow Statistics Lover to install updates, then return to the app.",
                    Toast.LENGTH_LONG
            ).show();
            return;
        }
        pendingUpdate=null;
        startDownload(update);
    }

    private void startDownload(JSONObject update){
        if(downloads==null||downloadId>=0L||closed)return;
        String apkUrl=update.optString("apkUrl","").trim();
        if(!apkUrl.startsWith("https://"))return;

        registerReceiver();
        DownloadManager.Request request=new DownloadManager.Request(Uri.parse(apkUrl));
        request.setTitle("Statistics Lover "+update.optString("versionName","update"));
        request.setDescription("Downloading app update");
        request.setMimeType("application/vnd.android.package-archive");
        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
        request.setAllowedOverMetered(true);
        request.setAllowedOverRoaming(false);
        request.setDestinationInExternalFilesDir(
                activity,
                Environment.DIRECTORY_DOWNLOADS,
                "statistics-lover-update.apk"
        );
        downloadId=downloads.enqueue(request);
        pendingUpdate=update;
    }

    private void registerReceiver(){
        if(receiverRegistered)return;
        IntentFilter filter=new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.TIRAMISU){
            activity.registerReceiver(receiver,filter,Context.RECEIVER_NOT_EXPORTED);
        }else{
            activity.registerReceiver(receiver,filter);
        }
        receiverRegistered=true;
    }

    private final BroadcastReceiver receiver=new BroadcastReceiver(){
        @Override
        public void onReceive(Context context,Intent intent){
            long completed=intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID,-1L);
            if(completed!=downloadId)return;
            JSONObject update=pendingUpdate;
            Uri apk=downloads.getUriForDownloadedFile(downloadId);
            downloadId=-1L;
            pendingUpdate=null;
            if(apk==null){
                Toast.makeText(activity,"Update download failed.",Toast.LENGTH_LONG).show();
                return;
            }
            io.execute(()->{
                boolean verified=verifyDigest(apk,update==null?"":update.optString("sha256",""));
                activity.runOnUiThread(()->{
                    if(!verified){
                        Toast.makeText(activity,"Update verification failed.",Toast.LENGTH_LONG).show();
                        return;
                    }
                    install(apk);
                });
            });
        }
    };

    private boolean verifyDigest(Uri apk,String expected){
        if(expected==null||expected.isBlank())return true;
        try(InputStream input=activity.getContentResolver().openInputStream(apk)){
            if(input==null)return false;
            MessageDigest digest=MessageDigest.getInstance("SHA-256");
            byte[] buffer=new byte[8192];
            int read;
            while((read=input.read(buffer))>0)digest.update(buffer,0,read);
            StringBuilder actual=new StringBuilder();
            for(byte b:digest.digest())actual.append(String.format(Locale.US,"%02x",b));
            return actual.toString().equalsIgnoreCase(expected.trim());
        }catch(Exception error){
            return false;
        }
    }

    private void install(Uri apk){
        try{
            Intent install=new Intent(Intent.ACTION_VIEW);
            install.setDataAndType(apk,"application/vnd.android.package-archive");
            install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            install.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            activity.startActivity(install);
        }catch(Exception error){
            Toast.makeText(activity,"Could not open the Android installer.",Toast.LENGTH_LONG).show();
        }
    }

    void close(){
        closed=true;
        io.shutdownNow();
        if(receiverRegistered){
            try{ activity.unregisterReceiver(receiver); }catch(Exception ignored){}
            receiverRegistered=false;
        }
    }
}

package com.statisticslover.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.core.content.FileProvider;

import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

final class AppUpdateManager {
    private static final String UPDATE_INFO_URL =
            "https://raw.githubusercontent.com/ashukla1707-beep/statistics-lover-android/main/downloads/version.json";

    private final NativeMainActivity activity;
    private boolean updateDialogShown;
    private File pendingUpdateApk;

    AppUpdateManager(NativeMainActivity activity) {
        this.activity = activity;
    }

    void checkForUpdate() {
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(UPDATE_INFO_URL).openConnection();
                connection.setRequestMethod("GET");
                connection.setConnectTimeout(8000);
                connection.setReadTimeout(8000);
                connection.setUseCaches(false);
                connection.setRequestProperty("Cache-Control", "no-cache");

                int responseCode = connection.getResponseCode();
                if (responseCode < 200 || responseCode >= 300) return;

                JSONObject json = new JSONObject(readText(connection.getInputStream()));
                long latestVersionCode = json.optLong("versionCode", 0);
                String latestVersionName = json.optString("versionName", "");
                String apkUrl = json.optString("apkUrl", "").trim();
                String sha256 = json.optString("sha256", "").trim();
                long apkSizeBytes = json.optLong("apkSizeBytes", 0);
                String message = json.optString(
                        "message",
                        "A new version of Statistics Lover is available."
                );

                if (latestVersionCode > getInstalledVersionCode() && !apkUrl.isEmpty()) {
                    activity.runOnUiThread(() -> showUpdateDialog(
                            latestVersionName,
                            message,
                            apkUrl,
                            sha256,
                            apkSizeBytes
                    ));
                }
            } catch (Exception ignored) {
                // Update checks must never prevent normal app usage.
            } finally {
                if (connection != null) connection.disconnect();
            }
        }).start();
    }

    void onResume() {
        if (pendingUpdateApk == null) return;
        if (!pendingUpdateApk.exists()) {
            pendingUpdateApk = null;
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && !activity.getPackageManager().canRequestPackageInstalls()) {
            return;
        }

        File apk = pendingUpdateApk;
        pendingUpdateApk = null;
        installDownloadedApk(apk);
    }

    @SuppressWarnings("deprecation")
    private long getInstalledVersionCode() throws Exception {
        android.content.pm.PackageInfo info = activity.getPackageManager()
                .getPackageInfo(activity.getPackageName(), 0);
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                ? info.getLongVersionCode()
                : info.versionCode;
    }

    private void showUpdateDialog(
            String versionName,
            String message,
            String apkUrl,
            String sha256,
            long apkSizeBytes
    ) {
        if (activity.isFinishing() || activity.isDestroyed() || updateDialogShown) return;
        updateDialogShown = true;

        String cleanMessage = message == null ? "" : message.trim();
        StringBuilder text = new StringBuilder(
                cleanMessage.isEmpty()
                        ? "A new version of Statistics Lover is available."
                        : cleanMessage
        );
        if (versionName != null && !versionName.trim().isEmpty()) {
            text.append("\n\nNew version: ").append(versionName.trim());
        }

        AlertDialog dialog = new AlertDialog.Builder(activity)
                .setTitle("Update available")
                .setMessage(text.toString())
                .setPositiveButton(
                        "Update",
                        (d, which) -> downloadAppUpdate(apkUrl, sha256, apkSizeBytes)
                )
                .setNegativeButton("Later", (d, which) -> { })
                .setOnDismissListener(d -> updateDialogShown = false)
                .create();

        dialog.show();
        dialog.getButton(AlertDialog.BUTTON_POSITIVE).setAllCaps(false);
        dialog.getButton(AlertDialog.BUTTON_NEGATIVE).setAllCaps(false);
    }

    private void downloadAppUpdate(String apkUrl, String sha256, long apkSizeBytes) {
        if (apkUrl == null || apkUrl.trim().isEmpty()) {
            Toast.makeText(activity, "Update download address is missing.", Toast.LENGTH_LONG).show();
            return;
        }
        if (!apkUrl.regionMatches(true, 0, "https://", 0, 8)) {
            Toast.makeText(activity, "Invalid update download address.", Toast.LENGTH_LONG).show();
            return;
        }

        Toast.makeText(activity, "Downloading update…", Toast.LENGTH_SHORT).show();

        new Thread(() -> {
            HttpURLConnection connection = null;
            File temporaryFile = null;
            try {
                connection = (HttpURLConnection) new URL(apkUrl).openConnection();
                connection.setRequestMethod("GET");
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(30000);
                connection.setInstanceFollowRedirects(true);
                connection.setUseCaches(false);
                connection.setRequestProperty("Cache-Control", "no-cache");

                int responseCode = connection.getResponseCode();
                if (responseCode < 200 || responseCode >= 300) {
                    throw new IOException("APK download failed.");
                }

                File updatesDirectory = new File(activity.getCacheDir(), "updates");
                if (!updatesDirectory.exists() && !updatesDirectory.mkdirs()) {
                    throw new IOException("Couldn't create update directory.");
                }

                temporaryFile = new File(updatesDirectory, "statistics-lover-update.download");
                File finalApk = new File(updatesDirectory, "statistics-lover-update.apk");
                if (temporaryFile.exists()) temporaryFile.delete();
                if (finalApk.exists()) finalApk.delete();

                try (
                        InputStream input = new BufferedInputStream(connection.getInputStream());
                        FileOutputStream output = new FileOutputStream(temporaryFile)
                ) {
                    copyStream(input, output);
                }

                if (temporaryFile.length() < 50_000) {
                    throw new IOException("Downloaded update is invalid.");
                }
                if (apkSizeBytes > 0 && temporaryFile.length() != apkSizeBytes) {
                    throw new IOException("Downloaded update size does not match metadata.");
                }
                if (!sha256.isEmpty() && !sha256.equalsIgnoreCase(fileSha256(temporaryFile))) {
                    throw new IOException("Downloaded update checksum does not match metadata.");
                }

                if (!temporaryFile.renameTo(finalApk)) {
                    copyFile(temporaryFile, finalApk);
                    temporaryFile.delete();
                }

                activity.runOnUiThread(() -> beginUpdateInstallation(finalApk));
            } catch (Exception error) {
                if (temporaryFile != null && temporaryFile.exists()) temporaryFile.delete();
                activity.runOnUiThread(() -> Toast.makeText(
                        activity,
                        "Couldn't download the update.",
                        Toast.LENGTH_LONG
                ).show());
            } finally {
                if (connection != null) connection.disconnect();
            }
        }).start();
    }

    private void beginUpdateInstallation(File apkFile) {
        if (apkFile == null || !apkFile.exists()) {
            pendingUpdateApk = null;
            Toast.makeText(activity, "Update file could not be found.", Toast.LENGTH_LONG).show();
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && !activity.getPackageManager().canRequestPackageInstalls()) {
            pendingUpdateApk = apkFile;

            new AlertDialog.Builder(activity)
                    .setTitle("Allow app updates")
                    .setMessage(
                            "Android needs permission for Statistics Lover to install its downloaded " +
                            "update. Enable \"Allow from this source\", then return to Statistics Lover."
                    )
                    .setPositiveButton("Open settings", (d, which) -> {
                        try {
                            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                            intent.setData(Uri.parse("package:" + activity.getPackageName()));
                            activity.startActivity(intent);
                        } catch (Exception error) {
                            pendingUpdateApk = null;
                            Toast.makeText(
                                    activity,
                                    "Couldn't open installation settings.",
                                    Toast.LENGTH_LONG
                            ).show();
                        }
                    })
                    .setNegativeButton("Cancel", (d, which) -> pendingUpdateApk = null)
                    .setOnCancelListener(d -> pendingUpdateApk = null)
                    .show();
            return;
        }

        pendingUpdateApk = null;
        installDownloadedApk(apkFile);
    }

    private void installDownloadedApk(File apkFile) {
        if (apkFile == null || !apkFile.exists()) {
            pendingUpdateApk = null;
            Toast.makeText(activity, "Update file could not be found.", Toast.LENGTH_LONG).show();
            return;
        }

        try {
            Uri apkUri = FileProvider.getUriForFile(
                    activity,
                    activity.getPackageName() + ".fileprovider",
                    apkFile
            );
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            activity.startActivity(intent);
        } catch (Exception error) {
            pendingUpdateApk = null;
            Toast.makeText(
                    activity,
                    "Couldn't start the Android update installer.",
                    Toast.LENGTH_LONG
            ).show();
        }
    }

    private String readText(InputStream inputStream) throws IOException {
        StringBuilder builder = new StringBuilder();
        try (
                BufferedReader reader = new BufferedReader(
                        new InputStreamReader(inputStream, StandardCharsets.UTF_8)
                )
        ) {
            char[] buffer = new char[4096];
            int count;
            while ((count = reader.read(buffer)) != -1) {
                builder.append(buffer, 0, count);
            }
        }
        return builder.toString();
    }

    private void copyFile(File source, File destination) throws IOException {
        try (
                InputStream input = new FileInputStream(source);
                OutputStream output = new FileOutputStream(destination)
        ) {
            copyStream(input, output);
        }
    }

    private void copyStream(InputStream input, OutputStream output) throws IOException {
        byte[] buffer = new byte[8192];
        int count;
        while ((count = input.read(buffer)) != -1) {
            output.write(buffer, 0, count);
        }
        output.flush();
    }

    private String fileSha256(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream input = new FileInputStream(file)) {
            byte[] buffer = new byte[8192];
            int count;
            while ((count = input.read(buffer)) != -1) {
                digest.update(buffer, 0, count);
            }
        }
        StringBuilder out = new StringBuilder();
        for (byte value : digest.digest()) {
            out.append(String.format("%02x", value));
        }
        return out.toString();
    }
}

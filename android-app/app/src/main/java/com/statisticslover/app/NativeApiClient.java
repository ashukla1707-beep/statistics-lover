package com.statisticslover.app;

import android.content.Context;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

final class NativeApiClient {
    private static final String ENDPOINT =
            "https://wjsudutyvsssfhrdqvbr.supabase.co/functions/v1/native-api";

    private final SessionStore session;

    NativeApiClient(Context context) {
        session = new SessionStore(context);
    }

    SessionStore session() {
        return session;
    }

    JSONObject signIn(String email, String password) throws Exception {
        JSONObject body = action("signIn");
        body.put("email", email);
        body.put("password", password);
        JSONObject result = request(body);
        saveSession(result);
        return result;
    }

    JSONObject signUp(String fullName, String email, String phone, String password) throws Exception {
        JSONObject body = action("signUp");
        body.put("fullName", fullName);
        body.put("email", email);
        body.put("phone", phone);
        body.put("password", password);
        JSONObject result = request(body);
        if (!result.optBoolean("confirmationRequired", true)) saveSession(result);
        return result;
    }

    void recover(String email) throws Exception {
        JSONObject body = action("recover");
        body.put("email", email);
        request(body);
    }

    JSONObject bootstrap() throws Exception {
        return authed("bootstrap");
    }

    JSONObject notifications() throws Exception {
        return authed("notifications");
    }

    JSONObject markAllRead() throws Exception {
        return authed("markAllRead");
    }

    JSONObject orders() throws Exception {
        return authed("orders");
    }

    JSONObject offers() throws Exception {
        return request(action("offers"));
    }

    JSONObject createOrder(String batchId, String couponCode) throws Exception {
        JSONObject body = action("createOrder");
        body.put("accessToken", session.accessToken());
        body.put("batchId", batchId);
        body.put("couponCode", couponCode == null ? "" : couponCode);
        return withRefresh(body);
    }

    JSONObject learning(String batchId) throws Exception {
        JSONObject body = action("learning");
        body.put("accessToken", session.accessToken());
        body.put("batchId", batchId);
        return withRefresh(body);
    }

    JSONObject operationsCourses() throws Exception {
        return authed("operationsCourses");
    }

    void signOut() {
        session.clear();
    }

    private JSONObject authed(String action) throws Exception {
        JSONObject body = action(action);
        body.put("accessToken", session.accessToken());
        return withRefresh(body);
    }

    private JSONObject withRefresh(JSONObject body) throws Exception {
        try {
            return request(body);
        } catch (ApiException error) {
            if (session.refreshToken() == null) throw error;
            JSONObject refresh = action("refresh");
            refresh.put("refreshToken", session.refreshToken());
            JSONObject refreshed = request(refresh);
            saveSession(refreshed);
            body.put("accessToken", session.accessToken());
            return request(body);
        }
    }

    private JSONObject action(String name) throws Exception {
        JSONObject body = new JSONObject();
        body.put("action", name);
        return body;
    }

    private void saveSession(JSONObject result) {
        String access = result.optString("accessToken", null);
        String refresh = result.optString("refreshToken", null);
        String userId = result.optString("userId", null);
        String email = result.optString("email", "");
        if (access != null && refresh != null && userId != null) {
            session.save(access, refresh, userId, email);
        }
    }

    private JSONObject request(JSONObject body) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(ENDPOINT).openConnection();
        connection.setRequestMethod("POST");
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(30000);
        connection.setDoOutput(true);
        connection.setRequestProperty("Content-Type", "application/json");
        connection.setRequestProperty("Accept", "application/json");

        byte[] payload = body.toString().getBytes(StandardCharsets.UTF_8);
        try (OutputStream out = connection.getOutputStream()) {
            out.write(payload);
        }

        int status = connection.getResponseCode();
        InputStream stream = status >= 200 && status < 300
                ? connection.getInputStream()
                : connection.getErrorStream();
        String text = read(stream);
        connection.disconnect();

        JSONObject result = text.isBlank() ? new JSONObject() : new JSONObject(text);
        if (status < 200 || status >= 300 || result.has("error")) {
            throw new ApiException(status, result.optString("error", "Request failed."));
        }
        return result;
    }

    private String read(InputStream stream) throws Exception {
        if (stream == null) return "";
        StringBuilder builder = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) builder.append(line);
        }
        return builder.toString();
    }

    static final class ApiException extends Exception {
        final int status;
        ApiException(int status, String message) {
            super(message);
            this.status = status;
        }
    }
}

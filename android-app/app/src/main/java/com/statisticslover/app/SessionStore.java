package com.statisticslover.app;

import android.content.Context;
import android.content.SharedPreferences;

final class SessionStore {
    private static final String PREFS = "statistics_lover_native_session";
    private final SharedPreferences prefs;

    SessionStore(Context context) {
        prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    String accessToken() { return prefs.getString("access_token", null); }
    String refreshToken() { return prefs.getString("refresh_token", null); }
    String userId() { return prefs.getString("user_id", null); }
    String email() { return prefs.getString("email", null); }

    boolean hasSession() {
        return accessToken() != null && refreshToken() != null && userId() != null;
    }

    void save(String accessToken, String refreshToken, String userId, String email) {
        prefs.edit()
                .putString("access_token", accessToken)
                .putString("refresh_token", refreshToken)
                .putString("user_id", userId)
                .putString("email", email)
                .apply();
    }

    void clear() {
        prefs.edit().clear().apply();
    }
}

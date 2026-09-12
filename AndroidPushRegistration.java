package de.pizzadesilva.admin;

import android.content.Context;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public final class AndroidPushRegistration {

    private AndroidPushRegistration(){}

    public static void registerToken(Context context, String token) {
        new Thread(() -> {
            try {
                URL url = new URL("https://rsxviwsmymlrwgphydae.supabase.co/functions/v1/register-android-push");
                HttpURLConnection c = (HttpURLConnection) url.openConnection();
                c.setConnectTimeout(10000);
                c.setReadTimeout(10000);
                c.setRequestMethod("POST");
                c.setRequestProperty("Content-Type", "application/json");
                c.setDoOutput(true);

                JSONObject body = new JSONObject();
                body.put("token", token);
                body.put("platform", "android");
                body.put("app", "pizza-de-silva-admin");

                try (OutputStream os = c.getOutputStream()) {
                    os.write(body.toString().getBytes("UTF-8"));
                }
                c.getResponseCode();
                c.disconnect();
            } catch (Exception ignored) {
            }
        }).start();
    }
}

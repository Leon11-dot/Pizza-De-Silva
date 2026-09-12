package de.pizzadesilva.admin;

import android.app.PendingIntent;
import android.content.Intent;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class PizzaMessagingService extends FirebaseMessagingService {

    @Override
    public void onNewToken(String token) {
        AndroidPushRegistration.registerToken(this, token);
    }

    @Override
    public void onMessageReceived(RemoteMessage msg) {
        String title = "🔔 Neue Bestellung – Pizza De Silva";
        String body = "Eine neue Bestellung ist eingetroffen.";

        if (msg.getNotification() != null) {
            if (msg.getNotification().getTitle() != null) title = msg.getNotification().getTitle();
            if (msg.getNotification().getBody() != null) body = msg.getNotification().getBody();
        }
        if (msg.getData().containsKey("title")) title = msg.getData().get("title");
        if (msg.getData().containsKey("body")) body = msg.getData().get("body");

        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(
                this, 1001, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder b = new NotificationCompat.Builder(this, MainActivity.CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setAutoCancel(true)
                .setContentIntent(pi)
                .setVibrate(new long[]{0,400,150,400,150,700,200,700});

        NotificationManagerCompat.from(this)
                .notify((int)(System.currentTimeMillis() & 0xfffffff), b.build());
    }
}

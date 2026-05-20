package expo.modules.ongoingnotification

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * OngoingNotificationModule
 *
 * A minimal Expo native module that creates Android "ongoing" notifications.
 * Ongoing notifications cannot be swiped away by the user — they behave
 * exactly like the Wi-Fi hotspot or music player notification.
 *
 * The notification can only be removed programmatically via [dismiss].
 */
class OngoingNotificationModule : Module() {

    companion object {
        private const val CHANNEL_ID = "lecture_ongoing"
        private const val CHANNEL_NAME = "Lecture Reminders"
    }

    override fun definition() = ModuleDefinition {

        Name("OngoingNotification")

        // ── show(id, title, body) ─────────────────────────────────
        // Post an ongoing notification WITH sound (first appearance).
        Function("show") { id: String, title: String, body: String ->
            postNotification(id, title, body, silent = false)
        }

        // ── update(id, title, body) ───────────────────────────────
        // Update an existing ongoing notification WITHOUT sound.
        Function("update") { id: String, title: String, body: String ->
            postNotification(id, title, body, silent = true)
        }

        // ── dismiss(id) ──────────────────────────────────────────
        // Cancel (remove) an ongoing notification.
        Function("dismiss") { id: String ->
            val ctx = appContext.reactContext ?: return@Function
            val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.cancel(id.hashCode())
        }
    }

    /**
     * Create or update an ongoing notification.
     *
     * @param id     Unique string identifier (hashed to an Android int ID).
     * @param title  Notification title text.
     * @param body   Notification body text.
     * @param silent If true, the notification updates silently (no sound/vibration).
     */
    private fun postNotification(id: String, title: String, body: String, silent: Boolean) {
        val ctx = appContext.reactContext ?: return
        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Ensure the notification channel exists (required on Android 8+).
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (nm.getNotificationChannel(CHANNEL_ID) == null) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
                )
                channel.description = "Ongoing reminders for upcoming lectures"
                nm.createNotificationChannel(channel)
            }
        }

        // Resolve the small icon — prefer the custom notification_icon drawable
        // set by expo-notifications plugin, fall back to the app launcher icon.
        val iconRes = ctx.resources.getIdentifier(
            "notification_icon", "drawable", ctx.packageName
        )
        val smallIcon = if (iconRes != 0) iconRes else ctx.applicationInfo.icon

        // Build the notification.
        val builder = NotificationCompat.Builder(ctx, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(smallIcon)
            .setOngoing(true)          // ← NON-SWIPABLE
            .setAutoCancel(false)      // ← Don't dismiss on tap
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)

        if (silent) {
            builder.setSilent(true)
        }

        nm.notify(id.hashCode(), builder.build())
    }
}

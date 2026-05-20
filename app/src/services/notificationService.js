/**
 * notificationService.js
 * ---------------------
 * Handles push notification permissions, token registration,
 * and notification event listeners using expo-notifications.
 *
 * This service is Expo-native and does NOT rely on @react-native-firebase.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { isGuardianActive } from './NotificationManager';

// ── Foreground notification behaviour ────────────────────────────────────────
// Show the notification banner even when the app is in the foreground.
// Exception: suppress scheduled lecture notifications when the Guardian is
// active — the Guardian already displays a non-swipable ongoing notification.
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request?.content?.data;

    // If this is a scheduled lecture notification AND the guardian is running,
    // suppress it to prevent duplicate notifications.
    if (data?.source === 'campus_connect_schedule' && isGuardianActive()) {
      return {
        shouldShowBanner: false,
        shouldShowList: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      };
    }

    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

/**
 * Request permission and obtain the Expo push token.
 * Returns the token string, or null if permission is denied.
 */
export async function registerForPushNotificationsAsync() {
  try {
    // 1. Check / request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notifications] Permission not granted.');
      return null;
    }

    // 2. Android channel — must be set before token fetch (required for Android 8+)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563eb',
      });
    }

    // 3. Read Expo project UUID from app.json → extra.eas.projectId
    //    ⚠️ Do NOT use EXPO_PUBLIC_FIREBASE_PROJECT_ID here — that is the
    //    Firebase project name, not the Expo UUID. Expo's server will reject it.
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    if (!projectId) {
      console.error(
        '[Notifications] projectId not found. ' +
        'Make sure app.json has: extra.eas.projectId = "<your-expo-uuid>"'
      );
      return null;
    }

    // 4. Get the Expo push token (maps to FCM under the hood on Android)
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    console.log('[Notifications] Expo push token:', token);
    return token;

  } catch (error) {
    console.error('[Notifications] Registration failed:', error);
    return null;
  }
}

/**
 * Set up listeners for incoming notifications.
 * Call this once in App.js and store the subscriptions for cleanup.
 *
 * @param {Function} onNotificationReceived  – called with the notification object (foreground)
 * @param {Function} onNotificationResponse  – called when the user taps a notification
 * @returns {{ remove: Function }} – call remove() to unsubscribe both listeners
 */
export function setupNotificationListeners(onNotificationReceived, onNotificationResponse) {
  const receivedSub = Notifications.addNotificationReceivedListener(
    onNotificationReceived || (() => { }),
  );

  const responseSub = Notifications.addNotificationResponseReceivedListener(
    onNotificationResponse || (() => { }),
  );

  return {
    remove: () => {
      receivedSub.remove();
      responseSub.remove();
    },
  };
}
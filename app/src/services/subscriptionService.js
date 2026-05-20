/**
 * subscriptionService.js
 * ──────────────────────
 * Manages FCM token storage and topic metadata in Firestore.
 *
 * Uses the `subscribedTopics` array directly from the user's Firestore
 * profile (as seeded) instead of building topics from parsed fields.
 *
 * The Cloud Function queries `fcm_tokens` to find matching tokens
 * when sending targeted notifications.
 */

import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../api/firebase/firebaseConfig';
import { registerForPushNotificationsAsync } from './notificationService';

// ── Public API ─────────────────────────────────────────

/**
 * Register the device's push token and subscribe to notification topics.
 *
 * @param {Object} userData – The user's Firestore profile (from AuthContext).
 *   Expected field: subscribedTopics (array of topic strings)
 * @returns {Promise<boolean>} – true if registration succeeded
 */
export async function subscribeToTopics(userData) {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.warn('[Subscription] No authenticated user.');
      return false;
    }

    // 1. Get the Expo push token
    const expoPushToken = await registerForPushNotificationsAsync();
    if (!expoPushToken) {
      console.warn('[Subscription] Could not obtain push token.');
      return false;
    }

    // 2. Use subscribedTopics directly from user profile
    const topics = userData?.subscribedTopics || [];

    // 3. Extract hierarchy metadata for Cloud Function querying
    const dept  = String(userData?.dept  || '').trim().toUpperCase();
    const batch = String(userData?.batch || '').trim().toUpperCase();

    // 4. Write to Firestore → fcm_tokens/{uid}
    await setDoc(doc(db, 'fcm_tokens', user.uid), {
      expoPushToken,
      uid: user.uid,
      dept,
      batch,
      topics,
      updatedAt: serverTimestamp(),
    });

    console.log('[Subscription] Registered with topics:', topics);
    return true;
  } catch (error) {
    console.error('[Subscription] Failed to subscribe:', error);
    return false;
  }
}

/**
 * Unsubscribe by removing the token document.
 * Call this on logout.
 *
 * @returns {Promise<boolean>}
 */
export async function unsubscribeFromTopics() {
  try {
    const user = auth.currentUser;
    if (!user) return false;

    await deleteDoc(doc(db, 'fcm_tokens', user.uid));
    console.log('[Subscription] Unsubscribed — token document deleted.');
    return true;
  } catch (error) {
    console.error('[Subscription] Failed to unsubscribe:', error);
    return false;
  }
}

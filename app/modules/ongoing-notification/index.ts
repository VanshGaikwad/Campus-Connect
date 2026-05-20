import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

/**
 * OngoingNotification — local Expo native module
 *
 * Creates Android "ongoing" notifications that CANNOT be swiped away
 * by the user (like hotspot / music player notifications).
 *
 * Only works on Android. On iOS / Expo Go, all functions are safe no-ops.
 */

// Load the native module (only available on Android after a native build)
let NativeModule: any = null;
if (Platform.OS === 'android') {
  try {
    NativeModule = requireNativeModule('OngoingNotification');
  } catch {
    // Not available — running in Expo Go or iOS
  }
}

/**
 * Show an ongoing (non-swipable) notification with sound.
 * If a notification with the same ID already exists, it is replaced.
 */
export function showOngoing(id: string, title: string, body: string): void {
  NativeModule?.show(id, title, body);
}

/**
 * Update an existing ongoing notification silently (no sound).
 * If the notification doesn't exist, it is created silently.
 */
export function updateOngoing(id: string, title: string, body: string): void {
  NativeModule?.update(id, title, body);
}

/**
 * Dismiss (cancel) an ongoing notification.
 * Safe to call even if the notification doesn't exist.
 */
export function dismissOngoing(id: string): void {
  NativeModule?.dismiss(id);
}

/**
 * Check if the native module is available.
 * Returns false in Expo Go or on iOS.
 */
export function isOngoingSupported(): boolean {
  return NativeModule != null;
}

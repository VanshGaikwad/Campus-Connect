/**
 * NotificationManager.js
 * ──────────────────────
 * Schedules and manages lecture reminder notifications.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  When app is in FOREGROUND (guardian active):                   │
 * │  • ONE non-swipable notification per lecture (like hotspot)     │
 * │  • Countdown text updates live: "CN in 14 min" → "CN in 13 …" │
 * │  • At T-5 min: a popup banner flashes with sound (4s)          │
 * │  • At T-0: notification vanishes automatically                 │
 * │  • If user somehow removes it, it stays gone (no re-posting)   │
 * │                                                                │
 * │  When app is in BACKGROUND (guardian not active):               │
 * │  • A scheduled weekly notification fires at T-15 as fallback   │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Public API:
 *   syncScheduleWithNotifications(divisionPath, userBatch)
 *   isScheduleStale(divisionPath)
 *   dismissExpiredNotifications()
 *   startNotificationGuardian()
 *   stopNotificationGuardian()
 *   isGuardianActive()
 */

import * as Notifications from 'expo-notifications';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../api/firebase/firebaseConfig';
import { saveToCache, loadFromCache } from '../utils/cache';
import {
  showOngoing,
  updateOngoing,
  dismissOngoing,
  isOngoingSupported,
} from 'ongoing-notification';

// ── Diagnostic: check if native module loaded ──
console.log(TAG, '🔍 OngoingNotification module supported:', isOngoingSupported());

// ── Constants ────────────────────────────────────────────────────────────────

const TAG = '[NotifManager]';
const CACHE_SCHEDULE_HASH = '@cc_notif_schedule_hash';
const CACHE_ACTIVE_SLOTS  = '@cc_notif_active_slots';

let _syncInProgress = null;
let _guardianInterval = null;

// Guardian in-memory state (resets on app restart — that's fine)
const _managedSlots = new Set();   // Slots where guardian posted its notification
const _headsUpSent  = new Set();   // Slots where the 5-min popup was sent

const DAY_TO_WEEKDAY = {
  sunday: 1, monday: 2, tuesday: 3, wednesday: 4,
  thursday: 5, friday: 6, saturday: 7,
};
const WEEKDAY_TO_DAY = [
  'sunday', 'monday', 'tuesday', 'wednesday',
  'thursday', 'friday', 'saturday',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function simpleHash(obj) {
  const str = JSON.stringify(obj);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

/**
 * Parse start time from "10:30 - 12:30" → { hour, minute } in 24h format.
 * Hours 1–7 are treated as PM (college doesn't run midnight–7 AM).
 */
function parseStartTime(timeStr) {
  if (!timeStr) return null;
  const parts = timeStr.split('-')[0].trim().split(':');
  if (parts.length < 2) return null;
  let hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);
  if (isNaN(hour) || isNaN(minute)) return null;
  if (hour >= 1 && hour <= 7) hour += 12;
  return { hour, minute };
}

function subtractMinutes(hour, minute, mins) {
  let total = hour * 60 + minute - mins;
  if (total < 0) total = 0;
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function todayKey() {
  return WEEKDAY_TO_DAY[new Date().getDay()];
}

function slotKey(slot) {
  return `${slot.dayKey}_${slot.subject}_${slot.startHour}_${slot.startMinute}`;
}

// ── Firestore ────────────────────────────────────────────────────────────────

async function fetchWeeklySchedule(divisionPath) {
  const ref = doc(db, divisionPath, 'timetables', 'weekly_schedule');
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

// ── Schedule sync ────────────────────────────────────────────────────────────

export function syncScheduleWithNotifications(divisionPath, userBatch) {
  if (_syncInProgress) {
    console.log(TAG, 'Sync already in progress.');
    return _syncInProgress;
  }
  _syncInProgress = _doSync(divisionPath, userBatch).finally(() => {
    _syncInProgress = null;
  });
  return _syncInProgress;
}

async function _doSync(divisionPath, userBatch) {
  if (!divisionPath) return 0;

  const timetable = await fetchWeeklySchedule(divisionPath);
  if (!timetable) {
    console.warn(TAG, 'weekly_schedule not found.');
    return 0;
  }

  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log(TAG, 'Cancelled all previous scheduled notifications.');

  const normBatch = (userBatch || '').trim().toUpperCase();
  let count = 0;
  const activeSlots = [];

  for (const [dayName, slots] of Object.entries(timetable)) {
    const weekday = DAY_TO_WEEKDAY[dayName.toLowerCase()];
    if (!weekday || !Array.isArray(slots)) continue;

    for (const slot of slots) {
      const slotBatch = (slot.batch || 'all').toUpperCase();
      if (slotBatch !== 'ALL' && normBatch && slotBatch !== normBatch) continue;

      const startTime = parseStartTime(slot.time);
      if (!startTime) continue;

      const subject  = slot.sub || slot.subject || 'Class';
      const room     = slot.room || 'TBD';
      const teacher  = slot.teacher || slot.type || 'Faculty';
      const batchTag = slotBatch !== 'ALL' ? `  ·  Batch ${slot.batch}` : '';

      // Save for guardian
      activeSlots.push({
        dayKey: dayName.toLowerCase(),
        subject, room, teacher, batchTag,
        startHour: startTime.hour,
        startMinute: startTime.minute,
      });

      // Schedule ONE weekly notification at T-15 (fallback when app is closed)
      const t15 = subtractMinutes(startTime.hour, startTime.minute, 15);
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `📚 ${subject} in 15 min`,
            body:  `Room ${room}  ·  ${teacher}${batchTag}`,
            sound: true,
            data: {
              source: 'campus_connect_schedule',
              lectureStartHour: startTime.hour,
              lectureStartMinute: startTime.minute,
              subject, room, teacher, batchTag,
              dayKey: dayName.toLowerCase(),
            },
          },
          trigger: {
            type: 'weekly',
            weekday,
            hour: t15.hour,
            minute: t15.minute,
            repeats: true,
          },
        });
        count++;
      } catch (err) {
        console.warn(TAG, `Schedule failed for ${subject}/${dayName}:`, err.message);
      }
    }
  }

  await saveToCache(CACHE_SCHEDULE_HASH, simpleHash(timetable));
  await saveToCache(CACHE_ACTIVE_SLOTS, JSON.stringify(activeSlots));
  console.log(TAG, `Scheduled ${count} notifications.`);
  return count;
}

// ── Notification Guardian ────────────────────────────────────────────────────
//
// Runs every 10 seconds while the app is in the foreground.
//
// Uses the native OngoingNotification module (if available) to create
// non-swipable notifications — like the Android hotspot notification.
//
// Timeline for a lecture at 13:15:
//   12:55  →  SHOW  "CN in 20 min"  (not in window, skip)
//   13:00  →  SHOW  "📚 CN in 15 min"  ongoing + sound
//   13:01  →  UPDATE  "📚 CN in 14 min"  silent
//   ...
//   13:10  →  UPDATE  "⏰ CN in 5 min!"  + flash popup with sound
//   ...
//   13:14  →  UPDATE  "⏰ CN in 1 min!"
//   13:15  →  DISMISS (auto-vanish)
// ─────────────────────────────────────────────────────────────────────────────

async function _guardianTick() {
  try {
    const today = todayKey();
    const currentMin = nowMinutes();

    const raw = await loadFromCache(CACHE_ACTIVE_SLOTS);
    if (!raw) return;

    let allSlots;
    try { allSlots = JSON.parse(raw); } catch { return; }

    const todaySlots = allSlots.filter(s => s.dayKey === today);
    if (!todaySlots.length) return;

    // Get currently visible expo-notifications (for cleanup)
    const presented = await Notifications.getPresentedNotificationsAsync();

    for (const slot of todaySlots) {
      const lectureMin = slot.startHour * 60 + slot.startMinute;
      const window15   = lectureMin - 15;
      const remaining  = lectureMin - currentMin;
      const sk         = slotKey(slot);
      const mainId     = `lec_${sk}`;

      // ── LECTURE STARTED → dismiss everything ──
      if (currentMin >= lectureMin) {
        // Dismiss native ongoing notification
        dismissOngoing(mainId);

        // Dismiss any leftover expo-notifications for this slot
        for (const n of presented) {
          const d = n.request?.content?.data;
          if (d?.source === 'campus_connect_schedule' &&
              d?.lectureStartHour === slot.startHour &&
              d?.lectureStartMinute === slot.startMinute) {
            await Notifications.dismissNotificationAsync(n.request.identifier).catch(() => {});
          }
        }

        _managedSlots.delete(sk);
        _headsUpSent.delete(sk);
        continue;
      }

      // ── NOT YET IN WINDOW → skip ──
      if (currentMin < window15) continue;

      // ── IN THE [T-15, T) WINDOW ──
      const isUrgent = remaining <= 5;
      const title = isUrgent
        ? `⏰ ${slot.subject} in ${remaining} min!`
        : `📚 ${slot.subject} in ${remaining} min`;
      const body = `Room ${slot.room}  ·  ${slot.teacher}${slot.batchTag || ''}`;

      if (!_managedSlots.has(sk)) {
        // ── FIRST TIME: Take over from the scheduled notification ──
        _managedSlots.add(sk);

        // Dismiss any expo-notifications for this slot (prevent duplicates)
        for (const n of presented) {
          const d = n.request?.content?.data;
          if (d?.source === 'campus_connect_schedule' &&
              d?.lectureStartHour === slot.startHour &&
              d?.lectureStartMinute === slot.startMinute) {
            await Notifications.dismissNotificationAsync(n.request.identifier).catch(() => {});
          }
        }

        // Post the ONGOING notification (non-swipable!) with sound
        if (isOngoingSupported()) {
          console.log(TAG, '✅ Posting ONGOING (non-swipable) notification:', mainId);
          showOngoing(mainId, title, body);
        } else {
          console.log(TAG, '⚠️ FALLBACK: Native module NOT available, using regular notification');
          // Fallback for Expo Go — regular notification
          await Notifications.scheduleNotificationAsync({
            identifier: mainId,
            content: { title, body, sound: true, data: { source: 'campus_connect_guardian' } },
            trigger: null,
          }).catch(() => {});
        }

      } else {
        // ── ALREADY MANAGED: Update countdown text silently ──
        if (isOngoingSupported()) {
          updateOngoing(mainId, title, body);
        } else {
          // Fallback — update regular notification
          await Notifications.scheduleNotificationAsync({
            identifier: mainId,
            content: { title, body, sound: false, data: { source: 'campus_connect_guardian' } },
            trigger: null,
          }).catch(() => {});
        }
      }

      // ── 5-MIN HEADS-UP POPUP ──
      // A brief banner alert with sound. Auto-dismissed from the notification
      // center after 4 seconds so only 1 notification stays visible.
      if (isUrgent && !_headsUpSent.has(sk)) {
        _headsUpSent.add(sk);
        const headsUpId = `hu_${sk}`;

        await Notifications.scheduleNotificationAsync({
          identifier: headsUpId,
          content: {
            title: `🔔 ${slot.subject} starts in ${remaining} min!`,
            body:  'Head to class now! 🏃',
            sound: true,
          },
          trigger: null,
        }).catch(() => {});

        // Remove from notification center after 4 seconds
        // (the banner alert has already been shown to the user)
        setTimeout(() => {
          Notifications.dismissNotificationAsync(headsUpId).catch(() => {});
        }, 4000);
      }
    }
  } catch (err) {
    console.warn(TAG, 'Guardian tick error:', err.message);
  }
}

// ── Dismiss expired notifications ────────────────────────────────────────────

export async function dismissExpiredNotifications() {
  try {
    const currentMin = nowMinutes();

    // 1. Dismiss expired expo-notifications
    const presented = await Notifications.getPresentedNotificationsAsync();
    let dismissed = 0;

    for (const n of (presented || [])) {
      const d = n.request?.content?.data;
      if (!d) continue;
      if (d.source !== 'campus_connect_schedule' && d.source !== 'campus_connect_guardian') continue;
      const lecMin = (d.lectureStartHour ?? -1) * 60 + (d.lectureStartMinute ?? -1);
      if (lecMin >= 0 && currentMin >= lecMin) {
        await Notifications.dismissNotificationAsync(n.request.identifier).catch(() => {});
        dismissed++;
      }
    }

    // 2. Dismiss expired ongoing (native) notifications
    const raw = await loadFromCache(CACHE_ACTIVE_SLOTS);
    if (raw) {
      try {
        const allSlots = JSON.parse(raw);
        const today = todayKey();
        for (const slot of allSlots) {
          if (slot.dayKey !== today) continue;
          const lectureMin = slot.startHour * 60 + slot.startMinute;
          if (currentMin >= lectureMin) {
            const mainId = `lec_${slotKey(slot)}`;
            dismissOngoing(mainId);
            dismissed++;
          }
        }
      } catch { /* ignore parse errors */ }
    }

    if (dismissed) console.log(TAG, `Dismissed ${dismissed} expired notification(s).`);
    return dismissed;
  } catch (e) {
    console.warn(TAG, 'dismissExpired error:', e.message);
    return 0;
  }
}

// ── Guardian lifecycle ───────────────────────────────────────────────────────

/**
 * Returns true if the guardian is currently running.
 * Used by notificationService to suppress scheduled duplicates in foreground.
 */
export function isGuardianActive() {
  return _guardianInterval !== null;
}

export function startNotificationGuardian() {
  if (_guardianInterval) return;
  console.log(TAG, 'Guardian started (10s interval).');
  _guardianTick();
  _guardianInterval = setInterval(_guardianTick, 10_000);
}

export function stopNotificationGuardian() {
  if (_guardianInterval) {
    clearInterval(_guardianInterval);
    _guardianInterval = null;
    console.log(TAG, 'Guardian stopped.');
  }
}

// ── Staleness check ──────────────────────────────────────────────────────────

export async function isScheduleStale(divisionPath) {
  if (!divisionPath) return false;
  try {
    const timetable = await fetchWeeklySchedule(divisionPath);
    if (!timetable) return false;
    const current = simpleHash(timetable);
    const cached  = await loadFromCache(CACHE_SCHEDULE_HASH);
    if (cached === null) return true;
    return current !== cached;
  } catch (e) {
    console.warn(TAG, 'Staleness check error:', e.message);
    return false;
  }
}

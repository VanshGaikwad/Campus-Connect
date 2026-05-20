import * as Notifications from 'expo-notifications';
import { collection, getDocs } from 'firebase/firestore';

import { db } from '../api/firebase/firebaseConfig';
import { loadFromCache, saveToCache } from '../utils/cache';

const TAG = '[ContentPoller]';
const POLL_INTERVAL_MS = 5 * 60 * 1000;
const CACHE_KEY = '@cc_content_notification_state';
const POLLED_COLLECTIONS = ['notices', 'events', 'placement_drives'];

let pollTimer = null;
let pollInProgress = false;
let cachedState = null;

function getMillis(value) {
  if (!value) return 0;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? 0 : value.getTime();
  if (typeof value === 'number') return value < 1e12 ? value * 1000 : value;
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function formatDate(value, fallback) {
  const millis = getMillis(value);
  if (!millis) return fallback;

  return new Date(millis).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function normalizeDocs(docs) {
  return docs.map((doc) => ({
    id: doc.id,
    data: doc.data(),
  }));
}

function buildNoticeNotification(doc) {
  const data = doc.data;
  const title = data.headline || data.title || 'New Notice';
  const description = data.description || 'A new notice has been posted.';
  const category = String(data.category || '').trim().toLowerCase();

  return {
    title: `New Notice: ${title}`,
    body: category ? `${category} · ${description}` : description,
    data: {
      source: 'notice_polling',
      notificationType: 'local',
      screenName: 'NoticeDetailScreen',
      collection: 'notices',
      noticeId: doc.id,
      title,
      category,
      description,
      fileUrl: data.fileUrl || '',
      fileName: data.fileName || '',
    },
  };
}

function buildEventNotification(doc) {
  const data = doc.data;
  const title = data.eventName || data.title || 'New Event';
  const venue = data.venue || 'Venue TBA';
  const dateText = formatDate(data.date || data.createdAt || data.timestamp, data.date || 'Date TBA');

  return {
    title: `New Event: ${title}`,
    body: `${dateText} · ${venue}`,
    data: {
      source: 'event_polling',
      notificationType: 'local',
      screenName: 'OngoingEventScreen',
      collection: 'events',
      eventId: doc.id,
      title,
      date: dateText,
      venue,
      description: data.description || '',
      imageUrl: data.imageUrl || data.image || '',
      registrationLink: data.registrationLink || data.regLink || '',
    },
  };
}

function buildPlacementNotification(doc) {
  const data = doc.data;
  const companyName = data.company || data.companyName || 'New Placement Drive';
  const offer = data.offer || data.lpa || 'N/A';
  const venue = data.venue || 'Venue TBA';
  const dateText = formatDate(data.date || data.createdAt || data.timestamp, data.date || 'Date TBA');

  return {
    title: `Placement Drive: ${companyName}`,
    body: `${offer} · ${dateText} · ${venue}`,
    data: {
      source: 'placement_polling',
      notificationType: 'local',
      screenName: 'TodayCompanyScreen',
      collection: 'placement_drives',
      driveId: doc.id,
      companyName,
      offer,
      venue,
      date: dateText,
      reportingTime: data.reportingTime || 'TBA',
      imageUrl: data.imageUrl || '',
      imageName: data.imageName || '',
      eligibility: data.eligibility || data.criteria || '',
    },
  };
}

function buildNotification(doc, collectionName) {
  if (collectionName === 'notices') return buildNoticeNotification(doc);
  if (collectionName === 'events') return buildEventNotification(doc);
  if (collectionName === 'placement_drives') return buildPlacementNotification(doc);
  return null;
}

function getSeenIds(collectionName) {
  return cachedState?.[collectionName]?.seenIds || [];
}

function setSeenIds(collectionName, seenIds) {
  if (!cachedState) {
    cachedState = {};
  }

  cachedState[collectionName] = { seenIds };
}

async function seedOrLoadState() {
  if (cachedState) return cachedState;
  cachedState = (await loadFromCache(CACHE_KEY)) || {};
  return cachedState;
}

async function persistState() {
  if (!cachedState) return;
  await saveToCache(CACHE_KEY, cachedState);
}

async function fetchCollectionDocs(collectionName) {
  const snapshot = await getDocs(collection(db, collectionName));
  return normalizeDocs(snapshot.docs);
}

async function notifyIfPermitted(notification) {
  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.status !== 'granted') {
    return false;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.body,
      sound: true,
      data: notification.data,
    },
    trigger: null,
  });

  return true;
}

async function pollOnce() {
  if (pollInProgress) return;
  pollInProgress = true;

  try {
    await seedOrLoadState();

    for (const collectionName of POLLED_COLLECTIONS) {
      const docs = await fetchCollectionDocs(collectionName);
      const sortedDocs = docs.sort((left, right) => {
        const leftMillis = getMillis(left.data?.date || left.data?.createdAt || left.data?.timestamp || left.data?.updatedAt);
        const rightMillis = getMillis(right.data?.date || right.data?.createdAt || right.data?.timestamp || right.data?.updatedAt);
        return rightMillis - leftMillis;
      });

      const seenIds = new Set(getSeenIds(collectionName));
      const currentIds = sortedDocs.map((doc) => doc.id);
      const freshDocs = sortedDocs.filter((doc) => !seenIds.has(doc.id));

      if (!cachedState[collectionName]) {
        setSeenIds(collectionName, currentIds.slice(0, 50));
        continue;
      }

      for (const doc of freshDocs.reverse()) {
        const notification = buildNotification(doc, collectionName);
        if (notification) {
          await notifyIfPermitted(notification);
        }
      }

      setSeenIds(collectionName, currentIds.slice(0, 50));
    }

    await persistState();
  } catch (error) {
    console.error(`${TAG} Polling failed:`, error);
  } finally {
    pollInProgress = false;
  }
}

export async function seedContentNotificationState() {
  await pollOnce();
}

export function startContentNotificationPolling() {
  if (pollTimer) return;

  pollOnce();
  pollTimer = setInterval(() => {
    pollOnce();
  }, POLL_INTERVAL_MS);
}

export function stopContentNotificationPolling() {
  if (!pollTimer) return;

  clearInterval(pollTimer);
  pollTimer = null;
}

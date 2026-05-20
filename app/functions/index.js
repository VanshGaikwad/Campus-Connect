/**
 * Cloud Functions — PICT Campus Connect
 * ======================================
 * Sends push notifications for college posts and timetable reminders.
 *
 * Firestore collections used:
 *   • `events/{id}`            – immediate push only
 *   • `notices/{id}`           – immediate push, plus 2-day reminder for
 *                                academic/scholarship notices
 *   • `placement_drives/{id}`  – immediate push, plus 8-hour reminder
 *   • `notification_reminders`  – delayed reminder queue
 *   • `fcm_tokens/{uid}`        – Expo push tokens for all devices
 *   • `timetables/{division}`   – existing lecture reminder schedule
 */

const { logger } = require('firebase-functions');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const { Expo } = require('expo-server-sdk');

admin.initializeApp();
const db = admin.firestore();
const expo = new Expo();

const NOTIFICATION_COLLECTION = 'notification_reminders';
const RELEVANT_NOTICE_CATEGORIES = new Set(['academic', 'academics', 'scholarship']);
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function getTodayKey() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);
  return WEEKDAYS[ist.getDay()];
}

function normalizeCategory(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeString(value, fallback) {
  const text = String(value || '').trim();
  return text || fallback;
}

function parseDateLike(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const millis = value < 1e12 ? value * 1000 : value;
    const date = new Date(millis);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }

  const text = String(value).trim();
  if (!text) return null;

  const ymd = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:\s+.*)?$/);
  if (ymd) {
    const date = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]), 12, 0, 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const dmy = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(?:\s+.*)?$/);
  if (dmy) {
    let year = Number(dmy[3]);
    if (year < 100) year += 2000;
    const date = new Date(year, Number(dmy[2]) - 1, Number(dmy[1]), 12, 0, 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateForMessage(value, fallback) {
  const date = parseDateLike(value);
  if (!date) return fallback || 'Date TBA';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isImportantNotice(category) {
  return RELEVANT_NOTICE_CATEGORIES.has(normalizeCategory(category));
}

function buildPushPayloads(tokens, content) {
  return tokens.map((token) => ({
    to: token,
    sound: 'default',
    channelId: 'default',
    ...content,
  }));
}

function chunkMessages(messages) {
  return expo.chunkPushNotifications(messages);
}

async function sendExpoMessages(messages) {
  if (!messages.length) return [];

  const chunks = chunkMessages(messages);
  const tickets = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      logger.error('Error sending push chunk:', error);
    }
  }

  return tickets;
}

async function getAllValidExpoTokens() {
  const snapshot = await db.collection('fcm_tokens').get();
  const tokens = [];
  const invalidRefs = [];

  snapshot.forEach((tokenDoc) => {
    const tokenData = tokenDoc.data();
    const token = tokenData.expoPushToken;

    if (!token || !Expo.isExpoPushToken(token)) {
      invalidRefs.push(tokenDoc.ref);
      return;
    }

    tokens.push(token);
  });

  if (invalidRefs.length > 0) {
    const batch = db.batch();
    invalidRefs.forEach((ref) => batch.delete(ref));
    await batch.commit();
    logger.info(`Cleaned up ${invalidRefs.length} invalid push token document(s).`);
  }

  return tokens;
}

async function sendToEveryone(content) {
  const tokens = await getAllValidExpoTokens();
  if (!tokens.length) {
    logger.warn('No valid Expo push tokens found.');
    return 0;
  }

  const messages = buildPushPayloads(tokens, content);
  const tickets = await sendExpoMessages(messages);
  logger.info(`Sent ${tickets.length} push ticket(s).`);
  return tickets.length;
}

async function queueReminder(payload) {
  const dueAt = new Date(Date.now() + payload.delayMinutes * 60 * 1000);
  await db.collection(NOTIFICATION_COLLECTION).add({
    ...payload,
    status: 'pending',
    dueAt: admin.firestore.Timestamp.fromDate(dueAt),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function sendImmediateAndMaybeQueueReminder({
  source,
  title,
  body,
  data,
  reminderDelayMinutes,
  reminderTitle,
  reminderBody,
  reminderData,
}) {
  await sendToEveryone({
    title,
    body,
    data: {
      source,
      notificationType: 'immediate',
      ...data,
    },
  });

  if (reminderDelayMinutes != null) {
    await queueReminder({
      source,
      title: reminderTitle,
      body: reminderBody,
      data: {
        source,
        notificationType: 'reminder',
        ...reminderData,
      },
      delayMinutes: reminderDelayMinutes,
    });
  }
}

exports.onEventCreated = onDocumentCreated('events/{eventId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const data = snapshot.data();
  const title = normalizeString(data.eventName || data.title, 'New Event');
  const dateText = formatDateForMessage(data.date, 'Date TBA');
  const venue = normalizeString(data.venue, 'Venue TBA');
  const description = normalizeString(data.description, 'New event has been posted.');

  await sendImmediateAndMaybeQueueReminder({
    source: 'event',
    title: `New Event: ${title}`,
    body: `${dateText} · ${venue}`,
    data: {
      screenName: 'OngoingEventScreen',
      collection: 'events',
      eventId: event.params.eventId,
      title,
      date: dateText,
      venue,
      description,
      imageUrl: data.imageUrl || data.image || '',
      registrationLink: data.registrationLink || data.regLink || '',
    },
  });
});

exports.onNoticeCreated = onDocumentCreated('notices/{noticeId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const data = snapshot.data();
  const category = normalizeCategory(data.category);
  const title = normalizeString(data.headline || data.title, 'New Notice');
  const description = normalizeString(data.description, 'A new notice has been posted.');

  await sendImmediateAndMaybeQueueReminder({
    source: 'notice',
    title: `New Notice: ${title}`,
    body: description,
    data: {
      screenName: 'NoticeDetailScreen',
      collection: 'notices',
      noticeId: event.params.noticeId,
      title,
      category,
      description,
      fileUrl: data.fileUrl || '',
      fileName: data.fileName || '',
    },
    reminderDelayMinutes: isImportantNotice(category) ? 2 * 24 * 60 : null,
    reminderTitle: `Reminder: ${title}`,
    reminderBody: description,
    reminderData: {
      screenName: 'NoticeDetailScreen',
      collection: 'notices',
      noticeId: event.params.noticeId,
      title,
      category,
      description,
      fileUrl: data.fileUrl || '',
      fileName: data.fileName || '',
      reminderFor: 'important_notice',
    },
  });
});

exports.onPlacementDriveCreated = onDocumentCreated('placement_drives/{driveId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const data = snapshot.data();
  const companyName = normalizeString(data.company || data.companyName, 'New Placement Drive');
  const offer = normalizeString(data.offer || data.lpa, 'N/A');
  const venue = normalizeString(data.venue, 'Venue TBA');
  const reportingTime = normalizeString(data.reportingTime, 'TBA');
  const dateText = formatDateForMessage(data.date, 'Date TBA');

  await sendImmediateAndMaybeQueueReminder({
    source: 'placement_drive',
    title: `Placement Drive: ${companyName}`,
    body: `${offer} · ${dateText} · ${venue}`,
    data: {
      screenName: 'TodayCompanyScreen',
      collection: 'placement_drives',
      driveId: event.params.driveId,
      companyName,
      offer,
      venue,
      reportingTime,
      date: dateText,
      imageUrl: data.imageUrl || '',
      imageName: data.imageName || '',
      eligibility: data.eligibility || data.criteria || '',
    },
    reminderDelayMinutes: 8 * 60,
    reminderTitle: `Reminder: ${companyName} drive`,
    reminderBody: `${offer} · ${venue} · ${reportingTime}`,
    reminderData: {
      screenName: 'TodayCompanyScreen',
      collection: 'placement_drives',
      driveId: event.params.driveId,
      companyName,
      offer,
      venue,
      reportingTime,
      date: dateText,
      imageUrl: data.imageUrl || '',
      imageName: data.imageName || '',
      eligibility: data.eligibility || data.criteria || '',
      reminderFor: 'placement_drive',
    },
  });
});

exports.processQueuedNotifications = onSchedule(
  {
    schedule: 'every 5 minutes',
    timeZone: 'Asia/Kolkata',
    region: 'asia-south1',
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async () => {
    const now = admin.firestore.Timestamp.now();
    const snapshot = await db
      .collection(NOTIFICATION_COLLECTION)
      .where('status', '==', 'pending')
      .where('dueAt', '<=', now)
      .limit(50)
      .get();

    if (snapshot.empty) {
      return;
    }

    for (const docSnap of snapshot.docs) {
      const reminder = docSnap.data();
      try {
        await sendToEveryone({
          title: reminder.title,
          body: reminder.body,
          data: {
            source: reminder.source,
            notificationType: 'reminder',
            ...(reminder.data || {}),
          },
        });

        await docSnap.ref.update({
          status: 'sent',
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (error) {
        logger.error('Failed to process reminder notification:', error);
        await docSnap.ref.update({
          status: 'failed',
          error: error.message || String(error),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  },
);

// ── Existing timetable notification flow ─────────────────────────────────────
exports.sendMorningNotifications = onSchedule(
  {
    schedule: '0 7 * * *',
    timeZone: 'Asia/Kolkata',
    region: 'asia-south1',
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async () => {
    const todayKey = getTodayKey();

    if (todayKey === 'saturday' || todayKey === 'sunday') {
      logger.info('Weekend — skipping notifications.');
      return;
    }

    logger.info(`Sending morning notifications for: ${todayKey}`);

    try {
      const timetablesSnap = await db.collection('timetables').get();
      if (timetablesSnap.empty) {
        logger.warn('No timetable documents found.');
        return;
      }

      const allMessages = [];
      const tokenCleanupBatch = db.batch();
      let cleanupCount = 0;

      for (const timetableDoc of timetablesSnap.docs) {
        const divisionId = timetableDoc.id;
        const data = timetableDoc.data();
        const todayEntries = data[todayKey];

        if (!todayEntries || !Array.isArray(todayEntries) || todayEntries.length === 0) {
          continue;
        }

        const parts = divisionId.split('_');
        if (parts.length < 3) {
          logger.warn(`Invalid division ID format: ${divisionId}`);
          continue;
        }
        const [dept, year, div] = parts;

        const tokensSnap = await db
          .collection('fcm_tokens')
          .where('dept', '==', dept)
          .where('year', '==', year)
          .where('div', '==', div)
          .get();

        if (tokensSnap.empty) {
          logger.info(`No registered tokens for ${divisionId}`);
          continue;
        }

        const divisionTokens = [];
        const batchTokenMap = {};

        tokensSnap.forEach((tokenDoc) => {
          const tokenData = tokenDoc.data();
          const token = tokenData.expoPushToken;

          if (!token || !Expo.isExpoPushToken(token)) {
            tokenCleanupBatch.delete(tokenDoc.ref);
            cleanupCount++;
            return;
          }

          divisionTokens.push(token);

          const batch = (tokenData.batch || '').toUpperCase();
          if (batch) {
            if (!batchTokenMap[batch]) batchTokenMap[batch] = [];
            batchTokenMap[batch].push(token);
          }
        });

        for (const entry of todayEntries) {
          const subject = entry.subject || entry.sub || 'Class';
          const time = entry.time || 'TBD';
          const room = entry.room || 'TBD';
          const type = (entry.type || 'Lecture').trim();
          const messageBody = `Good morning! You have ${subject} at ${time} in ${room}.`;

          let targetTokens = [];

          if (type === 'Practical' && entry.batch) {
            const batchKey = entry.batch.toUpperCase();
            targetTokens = batchTokenMap[batchKey] || [];
            if (targetTokens.length === 0) continue;
          } else {
            targetTokens = divisionTokens;
            if (targetTokens.length === 0) continue;
          }

          for (const pushToken of targetTokens) {
            allMessages.push({
              to: pushToken,
              sound: 'default',
              title: '📚 Today\'s Schedule',
              body: messageBody,
              data: {
                type,
                subject,
                time,
                room,
                divisionId,
                batch: entry.batch || null,
              },
              channelId: 'default',
            });
          }
        }
      }

      if (allMessages.length === 0) {
        logger.info('No messages to send today.');
        return;
      }

      const tickets = await sendExpoMessages(allMessages);

      tickets.forEach((ticket, idx) => {
        if (ticket.status === 'error') {
          logger.warn(`Ticket error: ${ticket.message}`, { details: ticket.details });
          if (ticket.details && ticket.details.error === 'DeviceNotRegistered') {
            const badToken = allMessages[idx]?.to;
            if (badToken) {
              logger.info(`Cleaning up invalid token: ${badToken}`);
            }
          }
        }
      });

      if (cleanupCount > 0) {
        await tokenCleanupBatch.commit();
        logger.info(`Cleaned up ${cleanupCount} invalid token documents.`);
      }

      logger.info(`Done. Sent ${tickets.length} notifications.`);
    } catch (error) {
      logger.error('sendMorningNotifications failed:', error);
      throw error;
    }
  },
);

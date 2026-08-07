import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import webpush from 'web-push';
import cron from 'node-cron';
import {
  upsertSubscription,
  removeSubscription,
  getAllSubscriptions,
  markSent,
  setSnooze,
} from './store.js';

const PORT = process.env.PORT || 8787;
const PUBLIC_SERVER_URL = process.env.PUBLIC_SERVER_URL || `http://localhost:${PORT}`;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:example@example.com';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error(
    'VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY is not set.\n' +
    'Run `npm run generate-vapid` inside server/ and copy the keys into server/.env (see .env.example).'
  );
  process.exit(1);
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.get('/api/vapid-public-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

app.post('/api/subscribe', (req, res) => {
  const { subscription, reminderTime, timezoneOffsetMinutes } = req.body || {};
  if (!subscription?.endpoint || !reminderTime) {
    return res.status(400).json({ error: 'subscription and reminderTime are required' });
  }
  upsertSubscription({ subscription, reminderTime, timezoneOffsetMinutes: timezoneOffsetMinutes ?? 0 });
  res.json({ ok: true });
});

app.post('/api/unsubscribe', (req, res) => {
  const { endpoint } = req.body || {};
  if (!endpoint) return res.status(400).json({ error: 'endpoint is required' });
  removeSubscription(endpoint);
  res.json({ ok: true });
});

app.post('/api/snooze', (req, res) => {
  const { endpoint, minutes } = req.body || {};
  if (!endpoint) return res.status(400).json({ error: 'endpoint is required' });
  setSnooze(endpoint, Date.now() + (Number(minutes) || 15) * 60 * 1000);
  res.json({ ok: true });
});

const buildPayload = (endpoint) => ({
  title: '服薬リマインダー',
  body: 'お薬を飲む時間です。通知から記録できます。',
  dateStr: new Date().toISOString().slice(0, 10),
  medicationId: 'ALL',
  endpoint,
  snoozeUrl: `${PUBLIC_SERVER_URL}/api/snooze`,
});

const sendReminder = async (sub) => {
  try {
    await webpush.sendNotification(sub.subscription, JSON.stringify(buildPayload(sub.subscription.endpoint)));
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      // Subscription is gone (browser data cleared, uninstalled, etc.) — stop tracking it.
      removeSubscription(sub.subscription.endpoint);
    } else {
      console.error('Failed to send push notification:', err.message);
    }
  }
};

// Every minute: fire the daily reminder for any subscription whose local time
// matches its configured reminderTime, and deliver any snooze that just came due.
cron.schedule('* * * * *', async () => {
  const now = Date.now();
  const subs = getAllSubscriptions();

  for (const sub of subs) {
    if (sub.snoozeUntil) {
      if (sub.snoozeUntil <= now) {
        setSnooze(sub.subscription.endpoint, null);
        await sendReminder(sub);
      }
      continue;
    }

    // subscription.timezoneOffsetMinutes follows Date.prototype.getTimezoneOffset():
    // localMs = utcMs - offsetMinutes * 60000
    const localDate = new Date(now - sub.timezoneOffsetMinutes * 60 * 1000);
    const localTime = `${String(localDate.getUTCHours()).padStart(2, '0')}:${String(localDate.getUTCMinutes()).padStart(2, '0')}`;
    const localDateStr = localDate.toISOString().slice(0, 10);

    if (localTime === sub.reminderTime && sub.lastSentDate !== localDateStr) {
      markSent(sub.subscription.endpoint, localDateStr);
      await sendReminder(sub);
    }
  }
});

app.listen(PORT, () => {
  console.log(`MediMate push server listening on http://localhost:${PORT}`);
});

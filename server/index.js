import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import webpush from 'web-push';
import cron from 'node-cron';
import jwt from 'jsonwebtoken';
import { WebSocketServer, WebSocket } from 'ws';
import {
  upsertSubscription,
  removeSubscription,
  getAllSubscriptions,
  markSent,
  setSnooze,
} from './store.js';
import { hashPassword, verifyPassword, signToken, requireAuth } from './auth.js';
import {
  findUserByEmail,
  createUser,
  getHouseholdsForUser,
  getHouseholdById,
  isMember,
  createHousehold,
  joinHouseholdByInviteCode,
  leaveHousehold,
  getHouseholdMembers,
  getHouseholdData,
  setHouseholdData,
} from './accountStore.js';

const PORT = process.env.PORT || 8787;
const PUBLIC_SERVER_URL = process.env.PUBLIC_SERVER_URL || `http://localhost:${PORT}`;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:example@example.com';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error(
    'VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY is not set.\n' +
    'Run `npm run generate-vapid` inside server/ and copy the keys into server/.env (see .env.example).'
  );
  process.exit(1);
}

if (!JWT_SECRET) {
  console.error(
    'JWT_SECRET is not set.\n' +
    'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"\n' +
    'and copy it into server/.env (see .env.example).'
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

// --- Accounts, households (family/caregiver sharing groups), and data sync ---

app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: 'メールアドレスと8文字以上のパスワードを入力してください' });
  }
  if (findUserByEmail(email)) {
    return res.status(409).json({ error: 'このメールアドレスは既に登録されています' });
  }
  const passwordHash = await hashPassword(password);
  const user = createUser({ email, passwordHash });
  res.json({ token: signToken(user), user: { id: user.id, email: user.email } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = findUserByEmail(email || '');
  if (!user || !(await verifyPassword(password || '', user.passwordHash))) {
    return res.status(401).json({ error: 'メールアドレスまたはパスワードが違います' });
  }
  res.json({ token: signToken(user), user: { id: user.id, email: user.email } });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const households = getHouseholdsForUser(req.user.id).map((h) => ({
    id: h.id,
    name: h.name,
    inviteCode: h.inviteCode,
    ownerId: h.ownerId,
  }));
  res.json({ user: req.user, households });
});

app.post('/api/households', requireAuth, (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: '世帯名を入力してください' });
  const household = createHousehold({ name, ownerId: req.user.id });
  res.json({ household });
});

app.post('/api/households/join', requireAuth, (req, res) => {
  const { inviteCode } = req.body || {};
  if (!inviteCode) return res.status(400).json({ error: '招待コードを入力してください' });
  try {
    const household = joinHouseholdByInviteCode({ inviteCode, userId: req.user.id });
    res.json({ household });
  } catch (e) {
    res.status(404).json({ error: '招待コードが見つかりません' });
  }
});

const requireMembership = (req, res, next) => {
  const householdId = req.params.id;
  if (!getHouseholdById(householdId)) return res.status(404).json({ error: '世帯が見つかりません' });
  if (!isMember(householdId, req.user.id)) return res.status(403).json({ error: 'この世帯のメンバーではありません' });
  next();
};

app.get('/api/households/:id/members', requireAuth, requireMembership, (req, res) => {
  res.json({ members: getHouseholdMembers(req.params.id) });
});

app.post('/api/households/:id/leave', requireAuth, requireMembership, (req, res) => {
  leaveHousehold({ householdId: req.params.id, userId: req.user.id });
  res.json({ ok: true });
});

app.get('/api/households/:id/data', requireAuth, requireMembership, (req, res) => {
  res.json(getHouseholdData(req.params.id) || { data: null, updatedAt: null });
});

app.put('/api/households/:id/data', requireAuth, requireMembership, (req, res) => {
  const { data } = req.body || {};
  if (!data) return res.status(400).json({ error: 'data is required' });
  const entry = setHouseholdData(req.params.id, data);
  broadcastToHousehold(req.params.id, { type: 'data-updated', updatedAt: entry.updatedAt });
  res.json({ updatedAt: entry.updatedAt });
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
const cronTask = cron.schedule('* * * * *', async () => {
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

// --- Realtime sync: WebSocket clients join a household "room" and get notified
// whenever any member's device pushes new data, so open tabs stay in sync live. ---

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const householdSockets = new Map(); // householdId -> Set<WebSocket>

const broadcastToHousehold = (householdId, payload) => {
  const sockets = householdSockets.get(householdId);
  if (!sockets) return;
  const message = JSON.stringify(payload);
  for (const client of sockets) {
    if (client.readyState === WebSocket.OPEN) client.send(message);
  }
};

wss.on('connection', (ws) => {
  ws.householdId = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (e) {
      return;
    }
    if (msg.type !== 'join' || !msg.token || !msg.householdId) return;

    try {
      const payload = jwt.verify(msg.token, JWT_SECRET);
      if (!isMember(msg.householdId, payload.sub)) throw new Error('not a member');
      ws.householdId = msg.householdId;
      if (!householdSockets.has(msg.householdId)) householdSockets.set(msg.householdId, new Set());
      householdSockets.get(msg.householdId).add(ws);
      ws.send(JSON.stringify({ type: 'joined' }));
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', error: '認証に失敗しました' }));
    }
  });

  ws.on('close', () => {
    if (ws.householdId) householdSockets.get(ws.householdId)?.delete(ws);
  });
});

// Only bind a port when this file is run directly (`node index.js`). When it's
// imported by a test, the test controls if/when the server listens (usually on
// an ephemeral port), so importing this module must never have that side effect.
const isMainModule = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  server.listen(PORT, () => {
    console.log(`MediMate push server listening on http://localhost:${PORT}`);
  });
}

export { app, server, wss, cronTask };

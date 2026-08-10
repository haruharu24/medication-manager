import 'dotenv/config';
import http from 'http';
import crypto from 'crypto';
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
  markReminderSent,
  setReminderSnooze,
} from './store.js';
import { hashPassword, verifyPassword, signToken, requireAuth } from './auth.js';
import {
  findUserByEmail,
  findUserById,
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
  getMemberRole,
  setMemberRole,
  transferOwnership,
  deleteUser,
  updateSubscriptionFromWebhook,
} from './accountStore.js';
import { requireActiveSubscription, requireHouseholdOwnerActiveSubscription } from './subscription.js';

const PORT = process.env.PORT || 8787;
const PUBLIC_SERVER_URL = process.env.PUBLIC_SERVER_URL || `http://localhost:${PORT}`;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:example@example.com';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET;
const REVENUECAT_WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;

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

if (!REVENUECAT_WEBHOOK_SECRET) {
  console.error(
    'REVENUECAT_WEBHOOK_SECRET is not set.\n' +
    'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n' +
    'and set the same value in the RevenueCat dashboard webhook config (see .env.example).'
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

// A subscription can carry several reminders: one global daily reminder (id
// 'ALL') plus one per medication that has its own notification time set, so a
// single device can be pushed at multiple times a day.
app.post('/api/subscribe', (req, res) => {
  const { subscription, reminders, timezoneOffsetMinutes } = req.body || {};
  const validReminders = Array.isArray(reminders)
    ? reminders.filter((r) => r && r.id && r.time)
    : [];
  if (!subscription?.endpoint || validReminders.length === 0) {
    return res.status(400).json({ error: 'subscription and at least one reminder are required' });
  }
  upsertSubscription({ subscription, reminders: validReminders, timezoneOffsetMinutes: timezoneOffsetMinutes ?? 0 });
  res.json({ ok: true });
});

app.post('/api/unsubscribe', (req, res) => {
  const { endpoint } = req.body || {};
  if (!endpoint) return res.status(400).json({ error: 'endpoint is required' });
  removeSubscription(endpoint);
  res.json({ ok: true });
});

app.post('/api/snooze', (req, res) => {
  const { endpoint, reminderId, minutes } = req.body || {};
  if (!endpoint || !reminderId) return res.status(400).json({ error: 'endpoint and reminderId are required' });
  setReminderSnooze(endpoint, reminderId, Date.now() + (Number(minutes) || 15) * 60 * 1000);
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
  const user = findUserById(req.user.id);
  res.json({
    user: req.user,
    households,
    subscription: {
      status: user.subscriptionStatus,
      productId: user.subscriptionProductId,
      currentPeriodEnd: user.currentPeriodEnd,
    },
  });
});

// Irreversible, so the password is re-verified server-side even though the
// request already carries a valid JWT (the client also asks for a typed
// confirmation before sending this, but that's a UX gate, not a security one).
app.delete('/api/auth/me', requireAuth, async (req, res) => {
  const { password } = req.body || {};
  const user = findUserById(req.user.id);
  if (!user || !password || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ error: 'パスワードが正しくありません' });
  }
  try {
    deleteUser(req.user.id);
    res.json({ ok: true });
  } catch (e) {
    if (e.message === 'OWNER_MUST_TRANSFER_OWNERSHIP') {
      return res.status(409).json({ error: '他のメンバーがいる世帯のオーナー権限を先に移譲してください', code: e.message, households: e.households });
    }
    res.status(500).json({ error: 'アカウントの削除に失敗しました' });
  }
});

app.post('/api/households', requireAuth, requireActiveSubscription, (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: '世帯名を入力してください' });
  const household = createHousehold({ name, ownerId: req.user.id });
  res.json({ household });
});

app.post('/api/households/join', requireAuth, requireActiveSubscription, (req, res) => {
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

// 'viewer' members can read shared data but not write it — used on the data PUT
// and on the role-management endpoint (only the owner may change roles).
const requireEditor = (req, res, next) => {
  const role = getMemberRole(req.params.id, req.user.id);
  if (role === 'viewer') return res.status(403).json({ error: '閲覧のみのメンバーは変更できません' });
  next();
};

const requireOwner = (req, res, next) => {
  const household = getHouseholdById(req.params.id);
  if (household?.ownerId !== req.user.id) return res.status(403).json({ error: 'オーナーのみ操作できます' });
  next();
};

app.get('/api/households/:id/members', requireAuth, requireMembership, (req, res) => {
  res.json({ members: getHouseholdMembers(req.params.id) });
});

app.post('/api/households/:id/members/:userId/role', requireAuth, requireMembership, requireOwner, (req, res) => {
  const { role } = req.body || {};
  try {
    setMemberRole({ householdId: req.params.id, userId: req.params.userId, role });
    const members = getHouseholdMembers(req.params.id);
    // Role changes (unlike ordinary data edits) should take effect immediately for
    // the affected member — e.g. a demotion to viewer should disable their write
    // access right away, not just on their next reload.
    broadcastToHousehold(req.params.id, { type: 'members-updated' });
    res.json({ members });
  } catch (e) {
    if (e.message === 'INVALID_ROLE') return res.status(400).json({ error: 'roleは editor か viewer を指定してください' });
    if (e.message === 'NOT_A_MEMBER') return res.status(404).json({ error: 'そのメンバーは見つかりません' });
    if (e.message === 'CANNOT_CHANGE_OWNER_ROLE') return res.status(400).json({ error: 'オーナーの権限は変更できません' });
    res.status(500).json({ error: '権限の変更に失敗しました' });
  }
});

app.post('/api/households/:id/transfer-ownership', requireAuth, requireMembership, requireOwner, (req, res) => {
  const { newOwnerId } = req.body || {};
  if (!newOwnerId) return res.status(400).json({ error: 'newOwnerIdを指定してください' });
  try {
    transferOwnership({ householdId: req.params.id, currentOwnerId: req.user.id, newOwnerId });
    const members = getHouseholdMembers(req.params.id);
    // Like a role change, ownership transfer should take effect immediately for
    // every connected member (their own role display changes too).
    broadcastToHousehold(req.params.id, { type: 'members-updated' });
    res.json({ members });
  } catch (e) {
    if (e.message === 'NOT_A_MEMBER') return res.status(404).json({ error: '指定されたユーザーはこの世帯のメンバーではありません' });
    if (e.message === 'NOT_OWNER') return res.status(403).json({ error: 'オーナーのみ操作できます' });
    res.status(500).json({ error: 'オーナー権限の移譲に失敗しました' });
  }
});

app.post('/api/households/:id/leave', requireAuth, requireMembership, (req, res) => {
  leaveHousehold({ householdId: req.params.id, userId: req.user.id });
  res.json({ ok: true });
});

app.get('/api/households/:id/data', requireAuth, requireMembership, (req, res) => {
  res.json(getHouseholdData(req.params.id) || { data: null, updatedAt: null });
});

app.put('/api/households/:id/data', requireAuth, requireMembership, requireEditor, requireHouseholdOwnerActiveSubscription, (req, res) => {
  const { data } = req.body || {};
  if (!data) return res.status(400).json({ error: 'data is required' });
  const entry = setHouseholdData(req.params.id, data);
  broadcastToHousehold(req.params.id, { type: 'data-updated', updatedAt: entry.updatedAt });
  res.json({ updatedAt: entry.updatedAt });
});

// --- RevenueCat webhook: sole source of truth for subscription status. Never
// trust client-reported entitlement for server-side gating — only this route
// writes subscriptionStatus. Always responds 2xx (even for unknown event types
// or an unrecognized app_user_id) so RevenueCat doesn't retry-storm us. ---

const REVENUECAT_EVENT_STATUS = {
  INITIAL_PURCHASE: 'active',
  RENEWAL: 'active',
  UNCANCELLATION: 'active',
  PRODUCT_CHANGE: 'active',
  EXPIRATION: 'expired',
  BILLING_ISSUE: 'billing_issue',
};

app.post('/api/webhooks/revenuecat', (req, res) => {
  const header = req.headers.authorization || '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
  const expected = REVENUECAT_WEBHOOK_SECRET;
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  const authorized =
    providedBuf.length === expectedBuf.length && crypto.timingSafeEqual(providedBuf, expectedBuf);
  if (!authorized) return res.status(401).json({ error: 'unauthorized' });

  const event = req.body?.event || {};
  const userId = event.app_user_id;
  if (!userId || !findUserById(userId)) {
    return res.json({ ok: true, ignored: true });
  }

  // CANCELLATION means auto-renew was turned off but the current period is
  // still paid for — access continues until EXPIRATION arrives at period end.
  if (event.type === 'CANCELLATION') {
    updateSubscriptionFromWebhook({ userId, status: findUserById(userId).subscriptionStatus });
    return res.json({ ok: true });
  }

  const status = REVENUECAT_EVENT_STATUS[event.type];
  if (!status) {
    console.log(`RevenueCat webhook: ignoring unhandled event type "${event.type}"`);
    return res.json({ ok: true, ignored: true });
  }

  updateSubscriptionFromWebhook({
    userId,
    status,
    productId: event.product_id,
    periodEnd: event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : undefined,
  });
  res.json({ ok: true });
});

const buildPayload = (endpoint, reminder) => ({
  title: reminder.medicationId === 'ALL' ? '服薬リマインダー' : reminder.title,
  body: reminder.medicationId === 'ALL'
    ? 'お薬を飲む時間です。通知から記録できます。'
    : `「${reminder.title}」を飲む時間です。通知から記録できます。`,
  dateStr: new Date().toISOString().slice(0, 10),
  medicationId: reminder.medicationId,
  reminderId: reminder.id,
  endpoint,
  snoozeUrl: `${PUBLIC_SERVER_URL}/api/snooze`,
});

const sendReminder = async (sub, reminder) => {
  try {
    await webpush.sendNotification(sub.subscription, JSON.stringify(buildPayload(sub.subscription.endpoint, reminder)));
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      // Subscription is gone (browser data cleared, uninstalled, etc.) — stop tracking it.
      removeSubscription(sub.subscription.endpoint);
    } else {
      console.error('Failed to send push notification:', err.message);
    }
  }
};

// Every minute: fire each reminder on each subscription whose local time matches
// its configured time, and deliver any snooze that just came due. A subscription
// can hold several reminders (the daily catch-all plus per-medication times), so
// each is tracked and fired independently.
const cronTask = cron.schedule('* * * * *', async () => {
  const now = Date.now();
  const subs = getAllSubscriptions();

  for (const sub of subs) {
    // subscription.timezoneOffsetMinutes follows Date.prototype.getTimezoneOffset():
    // localMs = utcMs - offsetMinutes * 60000
    const localDate = new Date(now - sub.timezoneOffsetMinutes * 60 * 1000);
    const localTime = `${String(localDate.getUTCHours()).padStart(2, '0')}:${String(localDate.getUTCMinutes()).padStart(2, '0')}`;
    const localDateStr = localDate.toISOString().slice(0, 10);

    for (const reminder of sub.reminders) {
      if (reminder.snoozeUntil) {
        if (reminder.snoozeUntil <= now) {
          markReminderSent(sub.subscription.endpoint, reminder.id, localDateStr);
          await sendReminder(sub, reminder);
        }
        continue;
      }

      if (localTime === reminder.time && reminder.lastSentDate !== localDateStr) {
        markReminderSent(sub.subscription.endpoint, reminder.id, localDateStr);
        await sendReminder(sub, reminder);
      }
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

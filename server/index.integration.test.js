// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import webpush from 'web-push';
import { WebSocket } from 'ws';

let baseUrl;
let wsUrl;
let serverModule;

beforeAll(async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'medimate-server-'));
  process.env.MEDIMATE_DATA_DIR = tmpDir;
  process.env.JWT_SECRET = 'integration-test-secret';
  const vapid = webpush.generateVAPIDKeys();
  process.env.VAPID_PUBLIC_KEY = vapid.publicKey;
  process.env.VAPID_PRIVATE_KEY = vapid.privateKey;
  process.env.VAPID_SUBJECT = 'mailto:test@example.com';
  process.env.CORS_ORIGIN = 'http://localhost:5173';
  process.env.PUBLIC_SERVER_URL = 'http://localhost:0';

  serverModule = await import('./index.js');
  await new Promise(resolve => serverModule.server.listen(0, resolve));
  const port = serverModule.server.address().port;
  baseUrl = `http://localhost:${port}`;
  wsUrl = `ws://localhost:${port}/ws`;
});

afterAll(async () => {
  serverModule.cronTask.stop();
  await new Promise(resolve => serverModule.server.close(resolve));
});

const postJson = (path, body, token) =>
  fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });

const getJson = (path, token) =>
  fetch(`${baseUrl}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

const putJson = (path, body, token) =>
  fetch(`${baseUrl}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });

const deleteJson = (path, body, token) =>
  fetch(`${baseUrl}${path}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body ?? {}),
  });

describe('auth API', () => {
  it('registers a new account and returns a usable token', async () => {
    const res = await postJson('/api/auth/register', { email: 'alice@example.com', password: 'password123' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeTruthy();
    expect(body.user.email).toBe('alice@example.com');
  });

  it('rejects registering the same email twice', async () => {
    await postJson('/api/auth/register', { email: 'dup@example.com', password: 'password123' });
    const res = await postJson('/api/auth/register', { email: 'dup@example.com', password: 'password123' });
    expect(res.status).toBe(409);
  });

  it('rejects a short password', async () => {
    const res = await postJson('/api/auth/register', { email: 'short@example.com', password: '123' });
    expect(res.status).toBe(400);
  });

  it('logs in with correct credentials and rejects incorrect ones', async () => {
    await postJson('/api/auth/register', { email: 'login@example.com', password: 'password123' });

    const good = await postJson('/api/auth/login', { email: 'login@example.com', password: 'password123' });
    expect(good.status).toBe(200);

    const bad = await postJson('/api/auth/login', { email: 'login@example.com', password: 'wrong' });
    expect(bad.status).toBe(401);
  });

  it('rejects unauthenticated access to /api/auth/me', async () => {
    const res = await getJson('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('household lifecycle + data sync', () => {
  it('lets an owner create a household, a second user join by invite code, and both read/write shared data', async () => {
    const ownerReg = await postJson('/api/auth/register', { email: 'owner@example.com', password: 'password123' });
    const { token: ownerToken } = await ownerReg.json();

    const createRes = await postJson('/api/households', { name: 'テスト家族' }, ownerToken);
    expect(createRes.status).toBe(200);
    const { household } = await createRes.json();
    expect(household.inviteCode).toMatch(/^[0-9A-F]{8}$/);

    const memberReg = await postJson('/api/auth/register', { email: 'member@example.com', password: 'password123' });
    const { token: memberToken } = await memberReg.json();

    const joinRes = await postJson('/api/households/join', { inviteCode: household.inviteCode }, memberToken);
    expect(joinRes.status).toBe(200);

    const membersRes = await getJson(`/api/households/${household.id}/members`, ownerToken);
    const { members } = await membersRes.json();
    expect(members.map(m => m.email).sort()).toEqual(['member@example.com', 'owner@example.com']);

    // No data yet.
    const initialData = await (await getJson(`/api/households/${household.id}/data`, memberToken)).json();
    expect(initialData.updatedAt).toBeNull();

    // Owner pushes data; member reads the same data back.
    const putRes = await putJson(
      `/api/households/${household.id}/data`,
      { data: { medications: [{ id: 'm1', title: 'テスト薬' }], logs: [], globalLogs: [], conditions: [] } },
      ownerToken
    );
    expect(putRes.status).toBe(200);

    const fetched = await (await getJson(`/api/households/${household.id}/data`, memberToken)).json();
    expect(fetched.data.medications).toEqual([{ id: 'm1', title: 'テスト薬' }]);
  });

  it('blocks a non-member from reading household data', async () => {
    const ownerReg = await postJson('/api/auth/register', { email: 'owner2@example.com', password: 'password123' });
    const { token: ownerToken } = await ownerReg.json();
    const { household } = await (await postJson('/api/households', { name: '世帯2' }, ownerToken)).json();

    const outsiderReg = await postJson('/api/auth/register', { email: 'outsider@example.com', password: 'password123' });
    const { token: outsiderToken } = await outsiderReg.json();

    const res = await getJson(`/api/households/${household.id}/data`, outsiderToken);
    expect(res.status).toBe(403);
  });

  it('rejects an unknown invite code', async () => {
    const reg = await postJson('/api/auth/register', { email: 'joiner-fail@example.com', password: 'password123' });
    const { token } = await reg.json();
    const res = await postJson('/api/households/join', { inviteCode: 'NOPE0000' }, token);
    expect(res.status).toBe(404);
  });

  it('the owner can demote a member to viewer, which blocks that member from writing shared data', async () => {
    const ownerReg = await postJson('/api/auth/register', { email: 'role-owner@example.com', password: 'password123' });
    const { token: ownerToken } = await ownerReg.json();
    const { household } = await (await postJson('/api/households', { name: '権限テスト世帯' }, ownerToken)).json();

    const memberReg = await postJson('/api/auth/register', { email: 'role-member@example.com', password: 'password123' });
    const { token: memberToken, user: member } = await memberReg.json();
    await postJson('/api/households/join', { inviteCode: household.inviteCode }, memberToken);

    // Before demotion: member can write.
    const beforeRes = await putJson(
      `/api/households/${household.id}/data`,
      { data: { medications: [], logs: [], globalLogs: [], conditions: [] } },
      memberToken
    );
    expect(beforeRes.status).toBe(200);

    const demoteRes = await postJson(`/api/households/${household.id}/members/${member.id}/role`, { role: 'viewer' }, ownerToken);
    expect(demoteRes.status).toBe(200);
    const { members } = await demoteRes.json();
    expect(members.find(m => m.userId === member.id).role).toBe('viewer');

    // After demotion: member can still read...
    const readRes = await getJson(`/api/households/${household.id}/data`, memberToken);
    expect(readRes.status).toBe(200);

    // ...but not write.
    const writeRes = await putJson(
      `/api/households/${household.id}/data`,
      { data: { medications: [{ id: 'should-be-rejected' }], logs: [], globalLogs: [], conditions: [] } },
      memberToken
    );
    expect(writeRes.status).toBe(403);

    // Owner can promote them back to editor.
    const promoteRes = await postJson(`/api/households/${household.id}/members/${member.id}/role`, { role: 'editor' }, ownerToken);
    expect(promoteRes.status).toBe(200);
    const afterPromote = await putJson(
      `/api/households/${household.id}/data`,
      { data: { medications: [], logs: [], globalLogs: [], conditions: [] } },
      memberToken
    );
    expect(afterPromote.status).toBe(200);
  });

  it('only the owner can change member roles, and the owner\'s own role can\'t be changed', async () => {
    const ownerReg = await postJson('/api/auth/register', { email: 'role-owner2@example.com', password: 'password123' });
    const { token: ownerToken, user: owner } = await ownerReg.json();
    const { household } = await (await postJson('/api/households', { name: '世帯', ownerId: owner.id } , ownerToken)).json();

    const memberReg = await postJson('/api/auth/register', { email: 'role-member2@example.com', password: 'password123' });
    const { token: memberToken, user: member } = await memberReg.json();
    await postJson('/api/households/join', { inviteCode: household.inviteCode }, memberToken);

    // A non-owner member can't change anyone's role.
    const forbiddenRes = await postJson(`/api/households/${household.id}/members/${member.id}/role`, { role: 'viewer' }, memberToken);
    expect(forbiddenRes.status).toBe(403);

    // The owner can't demote themselves.
    const ownerDemoteRes = await postJson(`/api/households/${household.id}/members/${owner.id}/role`, { role: 'viewer' }, ownerToken);
    expect(ownerDemoteRes.status).toBe(400);

    // An invalid role value is rejected.
    const invalidRes = await postJson(`/api/households/${household.id}/members/${member.id}/role`, { role: 'admin' }, ownerToken);
    expect(invalidRes.status).toBe(400);
  });

  it('broadcasts a data-updated event over WebSocket to other members in real time', async () => {
    const ownerReg = await postJson('/api/auth/register', { email: 'ws-owner@example.com', password: 'password123' });
    const { token: ownerToken } = await ownerReg.json();
    const { household } = await (await postJson('/api/households', { name: 'WS世帯' }, ownerToken)).json();

    const memberReg = await postJson('/api/auth/register', { email: 'ws-member@example.com', password: 'password123' });
    const { token: memberToken } = await memberReg.json();
    await postJson('/api/households/join', { inviteCode: household.inviteCode }, memberToken);

    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = reject;
    });
    ws.send(JSON.stringify({ type: 'join', token: memberToken, householdId: household.id }));

    const updatePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('timed out waiting for data-updated')), 5000);
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'data-updated') {
          clearTimeout(timeout);
          resolve(msg);
        }
      };
    });

    // Give the server a moment to register the join before pushing an update.
    await new Promise(r => setTimeout(r, 200));
    await putJson(`/api/households/${household.id}/data`, { data: { medications: [], logs: [], globalLogs: [], conditions: [] } }, ownerToken);

    const msg = await updatePromise;
    expect(msg.type).toBe('data-updated');
    ws.close();
  });
});

describe('ownership transfer + account deletion', () => {
  it('lets the owner transfer ownership to another member', async () => {
    const ownerReg = await postJson('/api/auth/register', { email: 'xfer-owner@example.com', password: 'password123' });
    const { token: ownerToken } = await ownerReg.json();
    const { household } = await (await postJson('/api/households', { name: '世帯' }, ownerToken)).json();

    const memberReg = await postJson('/api/auth/register', { email: 'xfer-member@example.com', password: 'password123' });
    const { token: memberToken, user: member } = await memberReg.json();
    await postJson('/api/households/join', { inviteCode: household.inviteCode }, memberToken);

    const res = await postJson(`/api/households/${household.id}/transfer-ownership`, { newOwnerId: member.id }, ownerToken);
    expect(res.status).toBe(200);
    const { members } = await res.json();
    expect(members.find(m => m.userId === member.id).role).toBe('owner');
  });

  it('rejects a transfer attempted by a non-owner, or to a non-member', async () => {
    const ownerReg = await postJson('/api/auth/register', { email: 'xfer-owner2@example.com', password: 'password123' });
    const { token: ownerToken } = await ownerReg.json();
    const { household } = await (await postJson('/api/households', { name: '世帯' }, ownerToken)).json();

    const memberReg = await postJson('/api/auth/register', { email: 'xfer-member2@example.com', password: 'password123' });
    const { token: memberToken, user: member } = await memberReg.json();
    await postJson('/api/households/join', { inviteCode: household.inviteCode }, memberToken);

    const forbiddenRes = await postJson(`/api/households/${household.id}/transfer-ownership`, { newOwnerId: member.id }, memberToken);
    expect(forbiddenRes.status).toBe(403);

    const notMemberRes = await postJson(`/api/households/${household.id}/transfer-ownership`, { newOwnerId: 'nobody' }, ownerToken);
    expect(notMemberRes.status).toBe(404);
  });

  it('rejects deletion with the wrong password', async () => {
    await postJson('/api/auth/register', { email: 'del-wrongpw@example.com', password: 'password123' });
    const { token } = await (await postJson('/api/auth/login', { email: 'del-wrongpw@example.com', password: 'password123' })).json();

    const res = await deleteJson('/api/auth/me', { password: 'not-the-password' }, token);
    expect(res.status).toBe(401);
  });

  it('deletes the account with the correct password, invalidating the old token afterwards', async () => {
    await postJson('/api/auth/register', { email: 'del-ok@example.com', password: 'password123' });
    const { token } = await (await postJson('/api/auth/login', { email: 'del-ok@example.com', password: 'password123' })).json();

    const res = await deleteJson('/api/auth/me', { password: 'password123' }, token);
    expect(res.status).toBe(200);

    // The JWT is still cryptographically valid for 30 days, but requireAuth
    // re-looks-up the user on every request, so a deleted account's old token
    // naturally stops working without any separate revocation list.
    const afterRes = await getJson('/api/auth/me', token);
    expect(afterRes.status).toBe(401);
  });

  it('blocks deleting an owner of a household with other members, and unblocks after transferring ownership', async () => {
    const ownerReg = await postJson('/api/auth/register', { email: 'del-blocked-owner@example.com', password: 'password123' });
    const { token: ownerToken } = await ownerReg.json();
    const { household } = await (await postJson('/api/households', { name: '削除ブロック世帯' }, ownerToken)).json();

    const memberReg = await postJson('/api/auth/register', { email: 'del-blocked-member@example.com', password: 'password123' });
    const { token: memberToken, user: member } = await memberReg.json();
    await postJson('/api/households/join', { inviteCode: household.inviteCode }, memberToken);

    const blockedRes = await deleteJson('/api/auth/me', { password: 'password123' }, ownerToken);
    expect(blockedRes.status).toBe(409);
    const blockedBody = await blockedRes.json();
    expect(blockedBody.code).toBe('OWNER_MUST_TRANSFER_OWNERSHIP');
    expect(blockedBody.households).toEqual([{ id: household.id, name: household.name }]);

    // Still logged in and the household untouched after the blocked attempt.
    expect((await getJson('/api/auth/me', ownerToken)).status).toBe(200);

    await postJson(`/api/households/${household.id}/transfer-ownership`, { newOwnerId: member.id }, ownerToken);
    const okRes = await deleteJson('/api/auth/me', { password: 'password123' }, ownerToken);
    expect(okRes.status).toBe(200);
  });
});

describe('push subscription endpoints', () => {
  it('exposes the VAPID public key', async () => {
    const res = await getJson('/api/vapid-public-key');
    const body = await res.json();
    expect(body.publicKey).toBe(process.env.VAPID_PUBLIC_KEY);
  });

  it('accepts a subscription with multiple reminders and a snooze request', async () => {
    const subRes = await postJson('/api/subscribe', {
      subscription: { endpoint: 'https://example.com/push/abc', keys: { p256dh: 'x', auth: 'y' } },
      reminders: [
        { id: 'ALL', medicationId: 'ALL', title: '服薬リマインダー', time: '08:00' },
        { id: 'med-1', medicationId: 'med-1', title: 'テスト薬', time: '09:00' },
      ],
      timezoneOffsetMinutes: -540,
    });
    expect(subRes.status).toBe(200);

    const snoozeRes = await postJson('/api/snooze', { endpoint: 'https://example.com/push/abc', reminderId: 'med-1', minutes: 15 });
    expect(snoozeRes.status).toBe(200);

    const unsubRes = await postJson('/api/unsubscribe', { endpoint: 'https://example.com/push/abc' });
    expect(unsubRes.status).toBe(200);
  });

  it('rejects a subscribe request missing required fields', async () => {
    const res = await postJson('/api/subscribe', { reminders: [{ id: 'ALL', time: '08:00' }] });
    expect(res.status).toBe(400);
  });

  it('rejects a subscribe request with no valid reminders', async () => {
    const res = await postJson('/api/subscribe', {
      subscription: { endpoint: 'https://example.com/push/no-reminders', keys: { p256dh: 'x', auth: 'y' } },
      reminders: [],
    });
    expect(res.status).toBe(400);
  });

  it('rejects a snooze request missing reminderId', async () => {
    const res = await postJson('/api/snooze', { endpoint: 'https://example.com/push/abc' });
    expect(res.status).toBe(400);
  });
});

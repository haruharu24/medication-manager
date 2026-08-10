// @vitest-environment node
import { describe, it, expect, beforeAll, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

let subscription;
let store;

beforeAll(async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'medimate-subscription-'));
  process.env.MEDIMATE_DATA_DIR = tmpDir;
  subscription = await import('./subscription.js');
  store = await import('./accountStore.js');
});

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('requireActiveSubscription', () => {
  it('rejects with 402 SUBSCRIPTION_REQUIRED when the caller has no subscription', () => {
    const user = store.createUser({ email: 'gate-none@example.com', passwordHash: 'hash' });
    const req = { user: { id: user.id } };
    const res = mockRes();
    const next = vi.fn();

    subscription.requireActiveSubscription(req, res, next);

    expect(res.status).toHaveBeenCalledWith(402);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'SUBSCRIPTION_REQUIRED' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when the caller has an active subscription', () => {
    const user = store.createUser({ email: 'gate-active@example.com', passwordHash: 'hash' });
    store.updateSubscriptionFromWebhook({ userId: user.id, status: 'active' });
    const req = { user: { id: user.id } };
    const res = mockRes();
    const next = vi.fn();

    subscription.requireActiveSubscription(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next() for grace_period (Apple still retrying the charge)', () => {
    const user = store.createUser({ email: 'gate-grace@example.com', passwordHash: 'hash' });
    store.updateSubscriptionFromWebhook({ userId: user.id, status: 'grace_period' });
    const req = { user: { id: user.id } };
    const res = mockRes();
    const next = vi.fn();

    subscription.requireActiveSubscription(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it.each(['expired', 'billing_issue', 'cancelled'])('rejects status "%s"', (status) => {
    const user = store.createUser({ email: `gate-${status}@example.com`, passwordHash: 'hash' });
    store.updateSubscriptionFromWebhook({ userId: user.id, status });
    const req = { user: { id: user.id } };
    const res = mockRes();
    const next = vi.fn();

    subscription.requireActiveSubscription(req, res, next);

    expect(res.status).toHaveBeenCalledWith(402);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireHouseholdOwnerActiveSubscription', () => {
  it('returns 404 when the household does not exist', () => {
    const req = { params: { id: 'missing-household' } };
    const res = mockRes();
    const next = vi.fn();

    subscription.requireHouseholdOwnerActiveSubscription(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects with 402 when the OWNER has no active subscription, even if the caller is a subscribed editor', () => {
    const owner = store.createUser({ email: 'owner-nosub@example.com', passwordHash: 'hash' });
    const household = store.createHousehold({ name: '世帯', ownerId: owner.id });
    const editor = store.createUser({ email: 'editor-sub@example.com', passwordHash: 'hash' });
    store.updateSubscriptionFromWebhook({ userId: editor.id, status: 'active' });

    const req = { params: { id: household.id }, user: { id: editor.id } };
    const res = mockRes();
    const next = vi.fn();

    subscription.requireHouseholdOwnerActiveSubscription(req, res, next);

    expect(res.status).toHaveBeenCalledWith(402);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when the owner has an active subscription, even if the calling member does not', () => {
    const owner = store.createUser({ email: 'owner-sub@example.com', passwordHash: 'hash' });
    store.updateSubscriptionFromWebhook({ userId: owner.id, status: 'active' });
    const household = store.createHousehold({ name: '世帯', ownerId: owner.id });
    const editor = store.createUser({ email: 'editor-nosub@example.com', passwordHash: 'hash' });

    const req = { params: { id: household.id }, user: { id: editor.id } };
    const res = mockRes();
    const next = vi.fn();

    subscription.requireHouseholdOwnerActiveSubscription(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});

// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

let store;

beforeAll(async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'medimate-store-'));
  process.env.MEDIMATE_DATA_DIR = tmpDir;
  store = await import('./store.js');
});

const subscription = { endpoint: 'https://example.com/push/store-test', keys: { p256dh: 'x', auth: 'y' } };

describe('store: multi-reminder subscriptions', () => {
  it('upserts a subscription with several reminders', () => {
    const entry = store.upsertSubscription({
      subscription,
      reminders: [
        { id: 'ALL', medicationId: 'ALL', title: '服薬リマインダー', time: '08:00' },
        { id: 'med-1', medicationId: 'med-1', title: '薬A', time: '09:00' },
      ],
      timezoneOffsetMinutes: -540,
    });

    expect(entry.reminders).toHaveLength(2);
    expect(entry.reminders[0]).toMatchObject({ id: 'ALL', time: '08:00', lastSentDate: null, snoozeUntil: null });
    expect(entry.reminders[1]).toMatchObject({ id: 'med-1', time: '09:00', lastSentDate: null, snoozeUntil: null });
  });

  it('preserves lastSentDate/snoozeUntil for reminders that still exist on re-subscribe, and drops the rest', () => {
    store.markReminderSent(subscription.endpoint, 'med-1', '2026-08-07');
    store.setReminderSnooze(subscription.endpoint, 'ALL', 1234567890);

    const entry = store.upsertSubscription({
      subscription,
      reminders: [
        { id: 'ALL', medicationId: 'ALL', title: '服薬リマインダー', time: '08:00' },
        { id: 'med-1', medicationId: 'med-1', title: '薬A', time: '10:00' }, // time changed
        { id: 'med-2', medicationId: 'med-2', title: '薬B', time: '12:00' }, // newly added
      ],
      timezoneOffsetMinutes: -540,
    });

    const all = entry.reminders.find((r) => r.id === 'ALL');
    const med1 = entry.reminders.find((r) => r.id === 'med-1');
    const med2 = entry.reminders.find((r) => r.id === 'med-2');

    expect(all.snoozeUntil).toBe(1234567890);
    expect(med1.time).toBe('10:00');
    expect(med1.lastSentDate).toBe('2026-08-07');
    expect(med2.lastSentDate).toBeNull();
  });

  it('a reminder removed from the reminders array on re-subscribe disappears entirely', () => {
    const entry = store.upsertSubscription({
      subscription,
      reminders: [{ id: 'ALL', medicationId: 'ALL', title: '服薬リマインダー', time: '08:00' }],
      timezoneOffsetMinutes: -540,
    });
    expect(entry.reminders.map((r) => r.id)).toEqual(['ALL']);
  });

  it('markReminderSent and setReminderSnooze only affect the targeted reminder', () => {
    store.upsertSubscription({
      subscription,
      reminders: [
        { id: 'ALL', medicationId: 'ALL', title: '服薬リマインダー', time: '08:00' },
        { id: 'med-1', medicationId: 'med-1', title: '薬A', time: '09:00' },
      ],
      timezoneOffsetMinutes: -540,
    });

    store.markReminderSent(subscription.endpoint, 'med-1', '2026-08-07');
    store.setReminderSnooze(subscription.endpoint, 'med-1', 999);

    const [sub] = store.getAllSubscriptions().filter((s) => s.subscription.endpoint === subscription.endpoint);
    const all = sub.reminders.find((r) => r.id === 'ALL');
    const med1 = sub.reminders.find((r) => r.id === 'med-1');

    // 'ALL' was never removed across the earlier re-subscribes in this suite, so its
    // snoozeUntil from an earlier test is still carried forward — untouched by the
    // markReminderSent/setReminderSnooze calls above, which only targeted 'med-1'.
    expect(all.lastSentDate).toBeNull();
    expect(all.snoozeUntil).toBe(1234567890);
    expect(med1.lastSentDate).toBe('2026-08-07');
    expect(med1.snoozeUntil).toBe(999);
  });

  it('removeSubscription removes the whole entry', () => {
    store.removeSubscription(subscription.endpoint);
    const remaining = store.getAllSubscriptions().filter((s) => s.subscription.endpoint === subscription.endpoint);
    expect(remaining).toHaveLength(0);
  });
});

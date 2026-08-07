// Minimal JSON-file persistence for push subscriptions. Good enough for a single
// small deployment; swap for a real database if this needs to scale beyond that.
//
// Each subscription can carry multiple reminders — one global daily reminder
// (id 'ALL') plus one per medication that has its own notification time set —
// so a single push subscription fires at several different times a day.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Overridable so tests can point this at an isolated temp directory instead of
// the real server/data/ folder.
const DATA_DIR = process.env.MEDIMATE_DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'subscriptions.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');

const read = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
const write = (subs) => fs.writeFileSync(DATA_FILE, JSON.stringify(subs, null, 2));

export const upsertSubscription = ({ subscription, reminders, timezoneOffsetMinutes }) => {
  const subs = read();
  const idx = subs.findIndex((s) => s.subscription.endpoint === subscription.endpoint);
  const prevReminders = idx >= 0 ? subs[idx].reminders : [];
  const nextReminders = reminders.map((r) => {
    const prev = prevReminders.find((p) => p.id === r.id);
    return {
      id: r.id,
      medicationId: r.medicationId,
      title: r.title,
      time: r.time,
      lastSentDate: prev ? prev.lastSentDate : null,
      snoozeUntil: prev ? prev.snoozeUntil : null,
    };
  });
  const entry = { subscription, timezoneOffsetMinutes, reminders: nextReminders };
  if (idx >= 0) subs[idx] = entry; else subs.push(entry);
  write(subs);
  return entry;
};

export const removeSubscription = (endpoint) => {
  write(read().filter((s) => s.subscription.endpoint !== endpoint));
};

export const getAllSubscriptions = () => read();

export const markReminderSent = (endpoint, reminderId, dateStr) => {
  const subs = read();
  const sub = subs.find((s) => s.subscription.endpoint === endpoint);
  const reminder = sub?.reminders.find((r) => r.id === reminderId);
  if (!reminder) return;
  reminder.lastSentDate = dateStr;
  reminder.snoozeUntil = null;
  write(subs);
};

export const setReminderSnooze = (endpoint, reminderId, untilTimestampOrNull) => {
  const subs = read();
  const sub = subs.find((s) => s.subscription.endpoint === endpoint);
  const reminder = sub?.reminders.find((r) => r.id === reminderId);
  if (!reminder) return;
  reminder.snoozeUntil = untilTimestampOrNull;
  write(subs);
};

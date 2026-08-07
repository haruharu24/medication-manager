// Minimal JSON-file persistence for push subscriptions. Good enough for a single
// small deployment; swap for a real database if this needs to scale beyond that.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'subscriptions.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');

const read = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
const write = (subs) => fs.writeFileSync(DATA_FILE, JSON.stringify(subs, null, 2));

export const upsertSubscription = ({ subscription, reminderTime, timezoneOffsetMinutes }) => {
  const subs = read();
  const idx = subs.findIndex((s) => s.subscription.endpoint === subscription.endpoint);
  const entry = {
    subscription,
    reminderTime,
    timezoneOffsetMinutes,
    lastSentDate: idx >= 0 ? subs[idx].lastSentDate : null,
    snoozeUntil: idx >= 0 ? subs[idx].snoozeUntil : null,
  };
  if (idx >= 0) subs[idx] = entry; else subs.push(entry);
  write(subs);
  return entry;
};

export const removeSubscription = (endpoint) => {
  write(read().filter((s) => s.subscription.endpoint !== endpoint));
};

export const getAllSubscriptions = () => read();

export const markSent = (endpoint, dateStr) => {
  const subs = read();
  const idx = subs.findIndex((s) => s.subscription.endpoint === endpoint);
  if (idx >= 0) {
    subs[idx].lastSentDate = dateStr;
    subs[idx].snoozeUntil = null;
    write(subs);
  }
};

export const setSnooze = (endpoint, untilTimestampOrNull) => {
  const subs = read();
  const idx = subs.findIndex((s) => s.subscription.endpoint === endpoint);
  if (idx >= 0) {
    subs[idx].snoozeUntil = untilTimestampOrNull;
    write(subs);
  }
};

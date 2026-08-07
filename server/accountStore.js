// JSON-file persistence for accounts, households (family/caregiver sharing groups),
// and the synced app data blob. Same pattern as store.js — fine for a small
// self-hosted family deployment; swap for a real database if this needs to scale.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Overridable so tests can point this at an isolated temp directory instead of
// the real server/data/ folder.
const DATA_DIR = process.env.MEDIMATE_DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'accounts.json');

const EMPTY = { users: [], households: [], householdMembers: [], householdData: [] };

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(EMPTY, null, 2));

const read = () => ({ ...EMPTY, ...JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) });
const write = (db) => fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));

const genId = () => crypto.randomUUID();
const genInviteCode = () => crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g. "A1B2C3D4"

// --- users ---

export const findUserByEmail = (email) => {
  const db = read();
  return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
};

export const findUserById = (id) => {
  const db = read();
  return db.users.find((u) => u.id === id) || null;
};

export const createUser = ({ email, passwordHash }) => {
  const db = read();
  if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('EMAIL_TAKEN');
  }
  const user = { id: genId(), email, passwordHash, createdAt: new Date().toISOString() };
  db.users.push(user);
  write(db);
  return user;
};

// --- households ---

export const getHouseholdsForUser = (userId) => {
  const db = read();
  const membershipIds = db.householdMembers.filter((m) => m.userId === userId).map((m) => m.householdId);
  return db.households.filter((h) => membershipIds.includes(h.id));
};

export const getHouseholdById = (id) => {
  const db = read();
  return db.households.find((h) => h.id === id) || null;
};

export const isMember = (householdId, userId) => {
  const db = read();
  return db.householdMembers.some((m) => m.householdId === householdId && m.userId === userId);
};

export const createHousehold = ({ name, ownerId }) => {
  const db = read();
  const household = {
    id: genId(),
    name,
    ownerId,
    inviteCode: genInviteCode(),
    createdAt: new Date().toISOString(),
  };
  db.households.push(household);
  db.householdMembers.push({ householdId: household.id, userId: ownerId, joinedAt: new Date().toISOString() });
  write(db);
  return household;
};

export const joinHouseholdByInviteCode = ({ inviteCode, userId }) => {
  const db = read();
  const household = db.households.find((h) => h.inviteCode === inviteCode.toUpperCase());
  if (!household) throw new Error('INVALID_INVITE_CODE');
  const alreadyMember = db.householdMembers.some((m) => m.householdId === household.id && m.userId === userId);
  if (!alreadyMember) {
    db.householdMembers.push({ householdId: household.id, userId, joinedAt: new Date().toISOString() });
    write(db);
  }
  return household;
};

export const leaveHousehold = ({ householdId, userId }) => {
  const db = read();
  db.householdMembers = db.householdMembers.filter(
    (m) => !(m.householdId === householdId && m.userId === userId)
  );
  write(db);
};

export const getHouseholdMembers = (householdId) => {
  const db = read();
  return db.householdMembers
    .filter((m) => m.householdId === householdId)
    .map((m) => {
      const user = db.users.find((u) => u.id === m.userId);
      return { userId: m.userId, email: user?.email || '(unknown)', joinedAt: m.joinedAt };
    });
};

// --- synced app data ---

export const getHouseholdData = (householdId) => {
  const db = read();
  return db.householdData.find((d) => d.householdId === householdId) || null;
};

export const setHouseholdData = (householdId, data) => {
  const db = read();
  const idx = db.householdData.findIndex((d) => d.householdId === householdId);
  const entry = { householdId, data, updatedAt: new Date().toISOString() };
  if (idx >= 0) db.householdData[idx] = entry; else db.householdData.push(entry);
  write(db);
  return entry;
};

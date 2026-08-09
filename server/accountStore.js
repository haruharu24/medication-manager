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
  db.householdMembers.push({ householdId: household.id, userId: ownerId, role: 'owner', joinedAt: new Date().toISOString() });
  write(db);
  return household;
};

// New members default to 'editor' (full read/write, matching the app's original
// behavior before per-member roles existed). The owner can downgrade a member to
// 'viewer' (read-only) afterwards via setMemberRole.
export const joinHouseholdByInviteCode = ({ inviteCode, userId }) => {
  const db = read();
  const household = db.households.find((h) => h.inviteCode === inviteCode.toUpperCase());
  if (!household) throw new Error('INVALID_INVITE_CODE');
  const alreadyMember = db.householdMembers.some((m) => m.householdId === household.id && m.userId === userId);
  if (!alreadyMember) {
    db.householdMembers.push({ householdId: household.id, userId, role: 'editor', joinedAt: new Date().toISOString() });
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
      return { userId: m.userId, email: user?.email || '(unknown)', role: m.role || 'editor', joinedAt: m.joinedAt };
    });
};

export const getMemberRole = (householdId, userId) => {
  const db = read();
  const member = db.householdMembers.find((m) => m.householdId === householdId && m.userId === userId);
  return member ? (member.role || 'editor') : null;
};

// Only 'editor'/'viewer' are assignable via this function — the owner's role
// can only change via transferOwnership below, which also demotes the
// previous owner in the same write (a household always needs exactly one owner).
export const setMemberRole = ({ householdId, userId, role }) => {
  if (role !== 'editor' && role !== 'viewer') throw new Error('INVALID_ROLE');
  const db = read();
  const member = db.householdMembers.find((m) => m.householdId === householdId && m.userId === userId);
  if (!member) throw new Error('NOT_A_MEMBER');
  if (member.role === 'owner') throw new Error('CANNOT_CHANGE_OWNER_ROLE');
  member.role = role;
  write(db);
  return member;
};

// Hands ownership of a household to another existing member, demoting the
// current owner to 'editor' in the same write. This is the only way a
// household's ownerId/owner-role member ever changes after creation — it
// exists specifically to unblock deleteUser below for an owner who wants to
// delete their account but still has other members in the household.
export const transferOwnership = ({ householdId, currentOwnerId, newOwnerId }) => {
  const db = read();
  const household = db.households.find((h) => h.id === householdId);
  if (!household) throw new Error('HOUSEHOLD_NOT_FOUND');
  if (household.ownerId !== currentOwnerId) throw new Error('NOT_OWNER');
  const newOwnerMember = db.householdMembers.find((m) => m.householdId === householdId && m.userId === newOwnerId);
  if (!newOwnerMember) throw new Error('NOT_A_MEMBER');

  household.ownerId = newOwnerId;
  newOwnerMember.role = 'owner';
  const oldOwnerMember = db.householdMembers.find((m) => m.householdId === householdId && m.userId === currentOwnerId);
  if (oldOwnerMember) oldOwnerMember.role = 'editor';

  write(db);
  return household;
};

// Deletes a user account. If the user solely owns a household (no other
// members), that household and its shared data are deleted along with it —
// there's no one else who could lose access. If the user owns a household
// that has OTHER members, the whole deletion is refused (no writes happen)
// so a family's shared data is never destroyed by one member's account
// deletion; the caller must transferOwnership first. Plain (non-owner)
// memberships are simply dropped, mirroring leaveHousehold.
export const deleteUser = (userId) => {
  const db = read();
  if (!db.users.some((u) => u.id === userId)) throw new Error('USER_NOT_FOUND');

  const ownedHouseholds = db.households.filter((h) => h.ownerId === userId);
  const blocking = ownedHouseholds.filter(
    (h) => db.householdMembers.filter((m) => m.householdId === h.id).length > 1
  );
  if (blocking.length > 0) {
    const err = new Error('OWNER_MUST_TRANSFER_OWNERSHIP');
    err.households = blocking.map((h) => ({ id: h.id, name: h.name }));
    throw err;
  }

  const soloOwnedIds = ownedHouseholds.map((h) => h.id);
  db.households = db.households.filter((h) => !soloOwnedIds.includes(h.id));
  db.householdData = db.householdData.filter((d) => !soloOwnedIds.includes(d.householdId));
  db.householdMembers = db.householdMembers.filter(
    (m) => m.userId !== userId && !soloOwnedIds.includes(m.householdId)
  );
  db.users = db.users.filter((u) => u.id !== userId);
  write(db);
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

// @vitest-environment node
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

// accountStore.js resolves its data directory from MEDIMATE_DATA_DIR at import
// time, so that must be set before the (dynamic) import happens.
let store;

beforeAll(async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'medimate-account-store-'));
  process.env.MEDIMATE_DATA_DIR = tmpDir;
  store = await import('./accountStore.js');
});

beforeEach(() => {
  // Reset the JSON file between tests so each test starts from a clean slate.
  const dataFile = path.join(process.env.MEDIMATE_DATA_DIR, 'accounts.json');
  fs.writeFileSync(dataFile, JSON.stringify({ users: [], households: [], householdMembers: [], householdData: [] }, null, 2));
});

describe('users', () => {
  it('creates a user and finds it by email (case-insensitive)', () => {
    const user = store.createUser({ email: 'Alice@Example.com', passwordHash: 'hash' });
    expect(store.findUserByEmail('alice@example.com')).toMatchObject({ id: user.id });
    expect(store.findUserById(user.id)).toMatchObject({ email: 'Alice@Example.com' });
  });

  it('refuses to create a second user with the same email', () => {
    store.createUser({ email: 'dup@example.com', passwordHash: 'hash' });
    expect(() => store.createUser({ email: 'dup@example.com', passwordHash: 'hash2' })).toThrow('EMAIL_TAKEN');
  });

  it('returns null for an unknown user', () => {
    expect(store.findUserByEmail('nobody@example.com')).toBeNull();
    expect(store.findUserById('missing')).toBeNull();
  });
});

describe('households', () => {
  it('creating a household makes the owner its first member', () => {
    const owner = store.createUser({ email: 'owner@example.com', passwordHash: 'hash' });
    const household = store.createHousehold({ name: 'テスト家族', ownerId: owner.id });

    expect(household.inviteCode).toMatch(/^[0-9A-F]{8}$/);
    expect(store.isMember(household.id, owner.id)).toBe(true);
    expect(store.getHouseholdsForUser(owner.id)).toEqual([household]);
  });

  it('joining by invite code adds the joiner as a member without duplicating', () => {
    const owner = store.createUser({ email: 'owner2@example.com', passwordHash: 'hash' });
    const household = store.createHousehold({ name: '世帯', ownerId: owner.id });
    const joiner = store.createUser({ email: 'joiner@example.com', passwordHash: 'hash' });

    store.joinHouseholdByInviteCode({ inviteCode: household.inviteCode, userId: joiner.id });
    store.joinHouseholdByInviteCode({ inviteCode: household.inviteCode, userId: joiner.id }); // idempotent

    const members = store.getHouseholdMembers(household.id);
    expect(members).toHaveLength(2);
    expect(members.map(m => m.email).sort()).toEqual(['joiner@example.com', 'owner2@example.com']);
  });

  it('rejects an unknown invite code', () => {
    expect(() => store.joinHouseholdByInviteCode({ inviteCode: 'NOPE0000', userId: 'x' })).toThrow('INVALID_INVITE_CODE');
  });

  it('leaveHousehold removes only that membership', () => {
    const owner = store.createUser({ email: 'owner3@example.com', passwordHash: 'hash' });
    const other = store.createUser({ email: 'other3@example.com', passwordHash: 'hash' });
    const household = store.createHousehold({ name: '世帯3', ownerId: owner.id });
    store.joinHouseholdByInviteCode({ inviteCode: household.inviteCode, userId: other.id });

    store.leaveHousehold({ householdId: household.id, userId: other.id });

    expect(store.isMember(household.id, other.id)).toBe(false);
    expect(store.isMember(household.id, owner.id)).toBe(true);
  });
});

describe('member roles', () => {
  it('the creator is "owner" and a joiner defaults to "editor"', () => {
    const owner = store.createUser({ email: 'role-owner@example.com', passwordHash: 'hash' });
    const joiner = store.createUser({ email: 'role-joiner@example.com', passwordHash: 'hash' });
    const household = store.createHousehold({ name: '世帯', ownerId: owner.id });
    store.joinHouseholdByInviteCode({ inviteCode: household.inviteCode, userId: joiner.id });

    expect(store.getMemberRole(household.id, owner.id)).toBe('owner');
    expect(store.getMemberRole(household.id, joiner.id)).toBe('editor');

    const members = store.getHouseholdMembers(household.id);
    expect(members.find(m => m.userId === owner.id).role).toBe('owner');
    expect(members.find(m => m.userId === joiner.id).role).toBe('editor');
  });

  it('setMemberRole changes a non-owner member to viewer and back', () => {
    const owner = store.createUser({ email: 'role-owner2@example.com', passwordHash: 'hash' });
    const joiner = store.createUser({ email: 'role-joiner2@example.com', passwordHash: 'hash' });
    const household = store.createHousehold({ name: '世帯', ownerId: owner.id });
    store.joinHouseholdByInviteCode({ inviteCode: household.inviteCode, userId: joiner.id });

    store.setMemberRole({ householdId: household.id, userId: joiner.id, role: 'viewer' });
    expect(store.getMemberRole(household.id, joiner.id)).toBe('viewer');

    store.setMemberRole({ householdId: household.id, userId: joiner.id, role: 'editor' });
    expect(store.getMemberRole(household.id, joiner.id)).toBe('editor');
  });

  it('refuses to change the owner\'s role', () => {
    const owner = store.createUser({ email: 'role-owner3@example.com', passwordHash: 'hash' });
    const household = store.createHousehold({ name: '世帯', ownerId: owner.id });

    expect(() => store.setMemberRole({ householdId: household.id, userId: owner.id, role: 'viewer' }))
      .toThrow('CANNOT_CHANGE_OWNER_ROLE');
  });

  it('rejects an invalid role value', () => {
    const owner = store.createUser({ email: 'role-owner4@example.com', passwordHash: 'hash' });
    const joiner = store.createUser({ email: 'role-joiner4@example.com', passwordHash: 'hash' });
    const household = store.createHousehold({ name: '世帯', ownerId: owner.id });
    store.joinHouseholdByInviteCode({ inviteCode: household.inviteCode, userId: joiner.id });

    expect(() => store.setMemberRole({ householdId: household.id, userId: joiner.id, role: 'admin' }))
      .toThrow('INVALID_ROLE');
  });

  it('getMemberRole returns null for a non-member', () => {
    const owner = store.createUser({ email: 'role-owner5@example.com', passwordHash: 'hash' });
    const household = store.createHousehold({ name: '世帯', ownerId: owner.id });
    expect(store.getMemberRole(household.id, 'nobody')).toBeNull();
  });
});

describe('transferOwnership', () => {
  it('makes the target member the new owner and demotes the previous owner to editor', () => {
    const owner = store.createUser({ email: 'transfer-owner@example.com', passwordHash: 'hash' });
    const joiner = store.createUser({ email: 'transfer-joiner@example.com', passwordHash: 'hash' });
    const household = store.createHousehold({ name: '世帯', ownerId: owner.id });
    store.joinHouseholdByInviteCode({ inviteCode: household.inviteCode, userId: joiner.id });

    const updated = store.transferOwnership({ householdId: household.id, currentOwnerId: owner.id, newOwnerId: joiner.id });

    expect(updated.ownerId).toBe(joiner.id);
    expect(store.getMemberRole(household.id, joiner.id)).toBe('owner');
    expect(store.getMemberRole(household.id, owner.id)).toBe('editor');
  });

  it('refuses when the caller is not the current owner', () => {
    const owner = store.createUser({ email: 'transfer-owner2@example.com', passwordHash: 'hash' });
    const joiner = store.createUser({ email: 'transfer-joiner2@example.com', passwordHash: 'hash' });
    const household = store.createHousehold({ name: '世帯', ownerId: owner.id });
    store.joinHouseholdByInviteCode({ inviteCode: household.inviteCode, userId: joiner.id });

    expect(() => store.transferOwnership({ householdId: household.id, currentOwnerId: joiner.id, newOwnerId: joiner.id }))
      .toThrow('NOT_OWNER');
  });

  it('refuses when the target is not a member of the household', () => {
    const owner = store.createUser({ email: 'transfer-owner3@example.com', passwordHash: 'hash' });
    const household = store.createHousehold({ name: '世帯', ownerId: owner.id });

    expect(() => store.transferOwnership({ householdId: household.id, currentOwnerId: owner.id, newOwnerId: 'nobody' }))
      .toThrow('NOT_A_MEMBER');
  });
});

describe('deleteUser', () => {
  it('deletes a user with no household memberships', () => {
    const user = store.createUser({ email: 'delete-plain@example.com', passwordHash: 'hash' });
    store.deleteUser(user.id);
    expect(store.findUserById(user.id)).toBeNull();
  });

  it('deletes the household too when the user is its sole member/owner', () => {
    const owner = store.createUser({ email: 'delete-solo-owner@example.com', passwordHash: 'hash' });
    const household = store.createHousehold({ name: '一人世帯', ownerId: owner.id });
    store.setHouseholdData(household.id, { medications: [] });

    store.deleteUser(owner.id);

    expect(store.findUserById(owner.id)).toBeNull();
    expect(store.getHouseholdById(household.id)).toBeNull();
    expect(store.getHouseholdData(household.id)).toBeNull();
  });

  it('refuses to delete an owner of a household that still has other members, without writing anything', () => {
    const owner = store.createUser({ email: 'delete-blocked-owner@example.com', passwordHash: 'hash' });
    const joiner = store.createUser({ email: 'delete-blocked-joiner@example.com', passwordHash: 'hash' });
    const household = store.createHousehold({ name: '複数人世帯', ownerId: owner.id });
    store.joinHouseholdByInviteCode({ inviteCode: household.inviteCode, userId: joiner.id });

    expect(() => store.deleteUser(owner.id)).toThrow('OWNER_MUST_TRANSFER_OWNERSHIP');

    // Nothing should have been deleted by the failed attempt.
    expect(store.findUserById(owner.id)).not.toBeNull();
    expect(store.getHouseholdById(household.id)).not.toBeNull();
    expect(store.isMember(household.id, joiner.id)).toBe(true);
  });

  it('deleting a plain (non-owner) member only removes their membership, not the household', () => {
    const owner = store.createUser({ email: 'delete-member-owner@example.com', passwordHash: 'hash' });
    const joiner = store.createUser({ email: 'delete-member-joiner@example.com', passwordHash: 'hash' });
    const household = store.createHousehold({ name: '世帯', ownerId: owner.id });
    store.joinHouseholdByInviteCode({ inviteCode: household.inviteCode, userId: joiner.id });

    store.deleteUser(joiner.id);

    expect(store.findUserById(joiner.id)).toBeNull();
    expect(store.getHouseholdById(household.id)).not.toBeNull();
    expect(store.isMember(household.id, owner.id)).toBe(true);
  });

  it('deleting an owner who has already transferred ownership succeeds and only drops their membership', () => {
    const owner = store.createUser({ email: 'delete-transferred-owner@example.com', passwordHash: 'hash' });
    const joiner = store.createUser({ email: 'delete-transferred-joiner@example.com', passwordHash: 'hash' });
    const household = store.createHousehold({ name: '世帯', ownerId: owner.id });
    store.joinHouseholdByInviteCode({ inviteCode: household.inviteCode, userId: joiner.id });
    store.transferOwnership({ householdId: household.id, currentOwnerId: owner.id, newOwnerId: joiner.id });

    store.deleteUser(owner.id);

    expect(store.findUserById(owner.id)).toBeNull();
    expect(store.getHouseholdById(household.id)).not.toBeNull();
    expect(store.getMemberRole(household.id, joiner.id)).toBe('owner');
  });

  it('throws for an unknown user id', () => {
    expect(() => store.deleteUser('nobody')).toThrow('USER_NOT_FOUND');
  });
});

describe('household data sync', () => {
  it('returns null before any data has been pushed', () => {
    const owner = store.createUser({ email: 'sync-owner@example.com', passwordHash: 'hash' });
    const household = store.createHousehold({ name: '世帯', ownerId: owner.id });
    expect(store.getHouseholdData(household.id)).toBeNull();
  });

  it('stores data and stamps an updatedAt timestamp on every write', () => {
    const owner = store.createUser({ email: 'sync-owner2@example.com', passwordHash: 'hash' });
    const household = store.createHousehold({ name: '世帯', ownerId: owner.id });

    const first = store.setHouseholdData(household.id, { medications: [{ id: 'm1' }] });
    expect(first.data.medications).toHaveLength(1);

    const second = store.setHouseholdData(household.id, { medications: [] });
    expect(store.getHouseholdData(household.id).data.medications).toHaveLength(0);
    expect(second.updatedAt).toBeTruthy();
  });
});

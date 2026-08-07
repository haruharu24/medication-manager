// @vitest-environment node
import { describe, it, expect, beforeAll, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import jwt from 'jsonwebtoken';

let auth;
let store;
const JWT_SECRET = 'test-secret-do-not-use-in-prod';

beforeAll(async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'medimate-auth-'));
  process.env.MEDIMATE_DATA_DIR = tmpDir;
  process.env.JWT_SECRET = JWT_SECRET;
  auth = await import('./auth.js');
  store = await import('./accountStore.js');
});

describe('password hashing', () => {
  it('hashes a password and verifies the same password against it', async () => {
    const hash = await auth.hashPassword('password123');
    expect(hash).not.toBe('password123');
    await expect(auth.verifyPassword('password123', hash)).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await auth.hashPassword('password123');
    await expect(auth.verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });
});

describe('signToken', () => {
  it('produces a JWT that verifies with the configured secret and carries the user id/email', async () => {
    const user = store.createUser({ email: 'signtoken@example.com', passwordHash: 'hash' });
    const token = auth.signToken(user);
    const payload = jwt.verify(token, JWT_SECRET);
    expect(payload.sub).toBe(user.id);
    expect(payload.email).toBe('signtoken@example.com');
  });
});

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('requireAuth middleware', () => {
  it('rejects a request with no Authorization header', () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = vi.fn();

    auth.requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a malformed/invalid token', () => {
    const req = { headers: { authorization: 'Bearer not-a-real-token' } };
    const res = mockRes();
    const next = vi.fn();

    auth.requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches req.user and calls next() for a valid token', () => {
    const user = store.createUser({ email: 'middleware@example.com', passwordHash: 'hash' });
    const token = auth.signToken(user);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = vi.fn();

    auth.requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual({ id: user.id, email: 'middleware@example.com' });
  });

  it('rejects a token signed for a user that no longer exists', () => {
    const token = jwt.sign({ sub: 'deleted-user-id', email: 'ghost@example.com' }, JWT_SECRET, { expiresIn: '1h' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = vi.fn();

    auth.requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

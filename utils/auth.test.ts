import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiRequest } from './api';

vi.mock('./api', () => ({
  apiRequest: vi.fn(),
}));

import { getStoredAuth, clearStoredAuth, register, login, deleteAccount } from './auth';

const mockedApiRequest = vi.mocked(apiRequest);

describe('auth storage + API helpers', () => {
  beforeEach(() => {
    localStorage.clear();
    mockedApiRequest.mockReset();
  });

  it('getStoredAuth returns null when nothing is stored', () => {
    expect(getStoredAuth()).toBeNull();
  });

  it('getStoredAuth returns null for corrupted JSON instead of throwing', () => {
    localStorage.setItem('medimateAuth', '{not json');
    expect(getStoredAuth()).toBeNull();
  });

  it('register stores the returned auth and returns it', async () => {
    const auth = { token: 't1', user: { id: 'u1', email: 'a@example.com' } };
    mockedApiRequest.mockResolvedValue(auth);

    const result = await register('a@example.com', 'password123');

    expect(mockedApiRequest).toHaveBeenCalledWith('/api/auth/register', {
      method: 'POST',
      body: { email: 'a@example.com', password: 'password123' },
    });
    expect(result).toEqual(auth);
    expect(getStoredAuth()).toEqual(auth);
  });

  it('login stores the returned auth and returns it', async () => {
    const auth = { token: 't2', user: { id: 'u2', email: 'b@example.com' } };
    mockedApiRequest.mockResolvedValue(auth);

    const result = await login('b@example.com', 'password123');

    expect(mockedApiRequest).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      body: { email: 'b@example.com', password: 'password123' },
    });
    expect(result).toEqual(auth);
    expect(getStoredAuth()).toEqual(auth);
  });

  it('deleteAccount DELETEs /api/auth/me with the token and password', async () => {
    mockedApiRequest.mockResolvedValue({ ok: true });

    const result = await deleteAccount('tok', 'password123');

    expect(mockedApiRequest).toHaveBeenCalledWith('/api/auth/me', {
      method: 'DELETE',
      token: 'tok',
      body: { password: 'password123' },
    });
    expect(result).toEqual({ ok: true });
  });

  it('clearStoredAuth removes the stored session', async () => {
    mockedApiRequest.mockResolvedValue({ token: 't3', user: { id: 'u3', email: 'c@example.com' } });
    await login('c@example.com', 'password123');
    expect(getStoredAuth()).not.toBeNull();

    clearStoredAuth();
    expect(getStoredAuth()).toBeNull();
  });
});

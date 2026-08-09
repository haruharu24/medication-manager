import { apiRequest } from './api';

export interface AuthUser {
  id: string;
  email: string;
}

export interface StoredAuth {
  token: string;
  user: AuthUser;
}

const STORAGE_KEY = 'medimateAuth';

export const getStoredAuth = (): StoredAuth | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const storeAuth = (auth: StoredAuth) => localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
export const clearStoredAuth = () => localStorage.removeItem(STORAGE_KEY);

export const register = async (email: string, password: string): Promise<StoredAuth> => {
  const auth = await apiRequest<StoredAuth>('/api/auth/register', { method: 'POST', body: { email, password } });
  storeAuth(auth);
  return auth;
};

export const login = async (email: string, password: string): Promise<StoredAuth> => {
  const auth = await apiRequest<StoredAuth>('/api/auth/login', { method: 'POST', body: { email, password } });
  storeAuth(auth);
  return auth;
};

// Throws ApiError with data.code === 'OWNER_MUST_TRANSFER_OWNERSHIP' and
// data.households when the account owns a household that has other members —
// the caller must transferOwnership (utils/household.ts) for each of those
// first. Does not clear the stored auth on success; callers should do that
// themselves (mirrors how login/register don't handle logout either).
export const deleteAccount = (token: string, password: string): Promise<{ ok: true }> =>
  apiRequest<{ ok: true }>('/api/auth/me', { method: 'DELETE', token, body: { password } });

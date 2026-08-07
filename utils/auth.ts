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

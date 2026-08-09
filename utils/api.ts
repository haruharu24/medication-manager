const API_BASE = (import.meta as any).env?.VITE_PUSH_SERVER_URL || 'http://localhost:8787';

export class ApiError extends Error {
  // Carries any extra JSON fields the server sent alongside `error` (e.g. the
  // {code, households} payload on a blocked account-deletion response), so
  // callers that need more than a message can still get at it.
  data?: Record<string, unknown>;
}

export const apiRequest = async <T = any>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null } = {}
): Promise<T> => {
  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new ApiError(json.error || `リクエストに失敗しました(${res.status})`);
    err.data = json;
    throw err;
  }
  return json as T;
};

export const getWsUrl = (): string => `${API_BASE.replace(/^http/, 'ws')}/ws`;

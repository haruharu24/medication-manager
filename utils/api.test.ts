import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiRequest, ApiError, getWsUrl } from './api';

describe('apiRequest', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends a JSON GET by default and returns the parsed body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ hello: 'world' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiRequest('/api/ping');

    expect(result).toEqual({ hello: 'world' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/ping');
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('attaches an Authorization header when a token is passed', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/api/me', { token: 'abc123' });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer abc123');
  });

  it('serializes the body and sets the method for POST/PUT calls', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/api/households', { method: 'POST', body: { name: 'テスト家族' } });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ name: 'テスト家族' }));
  });

  it('throws an ApiError with the server-provided message on failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'メールアドレスまたはパスワードが違います' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest('/api/auth/login', { method: 'POST' })).rejects.toThrow(
      'メールアドレスまたはパスワードが違います'
    );
    await expect(apiRequest('/api/auth/login', { method: 'POST' })).rejects.toBeInstanceOf(ApiError);
  });

  it('attaches the full parsed error body as .data, for callers that need more than the message', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: '先に権限を移譲してください', code: 'OWNER_MUST_TRANSFER_OWNERSHIP', households: [{ id: 'h1', name: '世帯' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    try {
      await apiRequest('/api/auth/me', { method: 'DELETE' });
      expect.unreachable('apiRequest should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).data).toEqual({
        error: '先に権限を移譲してください',
        code: 'OWNER_MUST_TRANSFER_OWNERSHIP',
        households: [{ id: 'h1', name: '世帯' }],
      });
    }
  });

  it('falls back to a generic message when the error body cannot be parsed', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => { throw new Error('not json'); },
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest('/api/x')).rejects.toThrow('500');
  });
});

describe('getWsUrl', () => {
  it('converts the http(s) API base into a ws(s) URL under /ws', () => {
    expect(getWsUrl()).toMatch(/^ws:\/\/.*\/ws$/);
  });
});

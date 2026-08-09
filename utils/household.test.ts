import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest } from './api';

vi.mock('./api', () => ({
  apiRequest: vi.fn(),
  getWsUrl: () => 'ws://localhost:8787/ws',
}));

import {
  fetchMe,
  createHousehold,
  joinHousehold,
  leaveHousehold,
  fetchMembers,
  fetchHouseholdData,
  pushHouseholdData,
  updateMemberRole,
  transferOwnership,
  connectHouseholdSocket,
} from './household';

const mockedApiRequest = vi.mocked(apiRequest);

describe('household API wrappers', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
  });

  it('fetchMe calls GET /api/auth/me with the token', async () => {
    mockedApiRequest.mockResolvedValue({ user: { id: 'u1', email: 'a@example.com' }, households: [] });
    await fetchMe('tok');
    expect(mockedApiRequest).toHaveBeenCalledWith('/api/auth/me', { token: 'tok' });
  });

  it('createHousehold POSTs the household name', async () => {
    mockedApiRequest.mockResolvedValue({ household: { id: 'h1' } });
    await createHousehold('tok', 'テスト家族');
    expect(mockedApiRequest).toHaveBeenCalledWith('/api/households', {
      method: 'POST',
      token: 'tok',
      body: { name: 'テスト家族' },
    });
  });

  it('joinHousehold POSTs the invite code', async () => {
    mockedApiRequest.mockResolvedValue({ household: { id: 'h1' } });
    await joinHousehold('tok', 'ABC12345');
    expect(mockedApiRequest).toHaveBeenCalledWith('/api/households/join', {
      method: 'POST',
      token: 'tok',
      body: { inviteCode: 'ABC12345' },
    });
  });

  it('leaveHousehold, fetchMembers, fetchHouseholdData, pushHouseholdData target the right household URL', async () => {
    mockedApiRequest.mockResolvedValue({});
    await leaveHousehold('tok', 'h1');
    await fetchMembers('tok', 'h1');
    await fetchHouseholdData('tok', 'h1');
    await pushHouseholdData('tok', 'h1', { medications: [], logs: [], globalLogs: [], conditions: [], vitals: [], medicalRecords: [], medicalContacts: {} });

    const paths = mockedApiRequest.mock.calls.map(call => call[0]);
    expect(paths).toEqual([
      '/api/households/h1/leave',
      '/api/households/h1/members',
      '/api/households/h1/data',
      '/api/households/h1/data',
    ]);
  });

  it('updateMemberRole POSTs the new role to the member-specific URL', async () => {
    mockedApiRequest.mockResolvedValue({ members: [] });
    await updateMemberRole('tok', 'h1', 'u2', 'viewer');
    expect(mockedApiRequest).toHaveBeenCalledWith('/api/households/h1/members/u2/role', {
      method: 'POST',
      token: 'tok',
      body: { role: 'viewer' },
    });
  });

  it('transferOwnership POSTs the new owner id to the transfer-ownership URL', async () => {
    mockedApiRequest.mockResolvedValue({ members: [] });
    await transferOwnership('tok', 'h1', 'u2');
    expect(mockedApiRequest).toHaveBeenCalledWith('/api/households/h1/transfer-ownership', {
      method: 'POST',
      token: 'tok',
      body: { newOwnerId: 'u2' },
    });
  });
});

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  send = vi.fn();
  close = vi.fn(() => { this.onclose?.(); });

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }
}

describe('connectHouseholdSocket', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket as any);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('sends a join message once connected', () => {
    connectHouseholdSocket('tok', 'h1', { onDataUpdated: vi.fn(), onMembersUpdated: vi.fn() });
    const ws = MockWebSocket.instances[0];
    ws.onopen?.();
    expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'join', token: 'tok', householdId: 'h1' }));
  });

  it('invokes onDataUpdated when a data-updated message arrives', () => {
    const onDataUpdated = vi.fn();
    const onMembersUpdated = vi.fn();
    connectHouseholdSocket('tok', 'h1', { onDataUpdated, onMembersUpdated });
    const ws = MockWebSocket.instances[0];

    ws.onmessage?.({ data: JSON.stringify({ type: 'data-updated', updatedAt: 'now' }) });
    expect(onDataUpdated).toHaveBeenCalledTimes(1);
    expect(onMembersUpdated).not.toHaveBeenCalled();

    ws.onmessage?.({ data: JSON.stringify({ type: 'joined' }) });
    expect(onDataUpdated).toHaveBeenCalledTimes(1); // unrelated message types are ignored
  });

  it('invokes onMembersUpdated when a members-updated message arrives', () => {
    const onDataUpdated = vi.fn();
    const onMembersUpdated = vi.fn();
    connectHouseholdSocket('tok', 'h1', { onDataUpdated, onMembersUpdated });
    const ws = MockWebSocket.instances[0];

    ws.onmessage?.({ data: JSON.stringify({ type: 'members-updated' }) });
    expect(onMembersUpdated).toHaveBeenCalledTimes(1);
    expect(onDataUpdated).not.toHaveBeenCalled();
  });

  it('reconnects after an unexpected close, but stops once the cleanup function is called', () => {
    const disconnect = connectHouseholdSocket('tok', 'h1', { onDataUpdated: vi.fn(), onMembersUpdated: vi.fn() });
    expect(MockWebSocket.instances).toHaveLength(1);

    // Unexpected close (server restart, network blip) -> auto-reconnect after 3s.
    MockWebSocket.instances[0].onclose?.();
    vi.advanceTimersByTime(3000);
    expect(MockWebSocket.instances).toHaveLength(2);

    // Caller explicitly disconnects -> no further reconnect should be scheduled.
    disconnect();
    vi.advanceTimersByTime(5000);
    expect(MockWebSocket.instances).toHaveLength(2);
  });
});

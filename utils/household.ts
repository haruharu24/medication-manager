import { apiRequest, getWsUrl } from './api';
import { Medication, MedicationLog, GlobalActionLog, DailyCondition } from '../types';

export interface Household {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
}

export interface HouseholdMember {
  userId: string;
  email: string;
  joinedAt: string;
}

// The subset of app data that's shared across a household. reminderSettings (and
// the push subscription) stay per-device on purpose — each family member may want
// a different reminder time on their own phone.
export interface SyncedData {
  medications: Medication[];
  logs: MedicationLog[];
  globalLogs: GlobalActionLog[];
  conditions: DailyCondition[];
}

export const fetchMe = (token: string) =>
  apiRequest<{ user: { id: string; email: string }; households: Household[] }>('/api/auth/me', { token });

export const createHousehold = (token: string, name: string) =>
  apiRequest<{ household: Household }>('/api/households', { method: 'POST', token, body: { name } });

export const joinHousehold = (token: string, inviteCode: string) =>
  apiRequest<{ household: Household }>('/api/households/join', { method: 'POST', token, body: { inviteCode } });

export const leaveHousehold = (token: string, householdId: string) =>
  apiRequest<{ ok: true }>(`/api/households/${householdId}/leave`, { method: 'POST', token });

export const fetchMembers = (token: string, householdId: string) =>
  apiRequest<{ members: HouseholdMember[] }>(`/api/households/${householdId}/members`, { token });

export const fetchHouseholdData = (token: string, householdId: string) =>
  apiRequest<{ data: SyncedData | null; updatedAt: string | null }>(`/api/households/${householdId}/data`, { token });

export const pushHouseholdData = (token: string, householdId: string, data: SyncedData) =>
  apiRequest<{ updatedAt: string }>(`/api/households/${householdId}/data`, { method: 'PUT', token, body: { data } });

// Keeps other devices in the same household in sync in near-real-time: the server
// pings every connected member's socket whenever anyone PUTs new data, and we just
// refetch on that signal rather than trying to diff/merge on the wire.
export const connectHouseholdSocket = (token: string, householdId: string, onUpdate: () => void): (() => void) => {
  let closed = false;
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const connect = () => {
    if (closed) return;
    ws = new WebSocket(getWsUrl());
    ws.onopen = () => ws?.send(JSON.stringify({ type: 'join', token, householdId }));
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'data-updated') onUpdate();
      } catch {
        // ignore malformed messages
      }
    };
    ws.onclose = () => {
      if (!closed) reconnectTimer = setTimeout(connect, 3000);
    };
  };
  connect();

  return () => {
    closed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    ws?.close();
  };
};

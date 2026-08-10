import { apiRequest, getWsUrl } from './api';
import { Medication, MedicationLog, GlobalActionLog, DailyCondition, VitalRecord, MedicalRecord, MedicalContacts } from '../types';
import { SubscriptionInfo } from './subscription';

export interface Household {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
}

export type HouseholdRole = 'owner' | 'editor' | 'viewer';

export interface HouseholdMember {
  userId: string;
  email: string;
  role: HouseholdRole;
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
  vitals: VitalRecord[];
  medicalRecords: MedicalRecord[];
  medicalContacts: MedicalContacts;
}

export const fetchMe = (token: string) =>
  apiRequest<{ user: { id: string; email: string }; households: Household[]; subscription: SubscriptionInfo }>('/api/auth/me', { token });

export const createHousehold = (token: string, name: string) =>
  apiRequest<{ household: Household }>('/api/households', { method: 'POST', token, body: { name } });

export const joinHousehold = (token: string, inviteCode: string) =>
  apiRequest<{ household: Household }>('/api/households/join', { method: 'POST', token, body: { inviteCode } });

export const leaveHousehold = (token: string, householdId: string) =>
  apiRequest<{ ok: true }>(`/api/households/${householdId}/leave`, { method: 'POST', token });

export const fetchMembers = (token: string, householdId: string) =>
  apiRequest<{ members: HouseholdMember[] }>(`/api/households/${householdId}/members`, { token });

export const updateMemberRole = (token: string, householdId: string, userId: string, role: 'editor' | 'viewer') =>
  apiRequest<{ members: HouseholdMember[] }>(`/api/households/${householdId}/members/${userId}/role`, {
    method: 'POST',
    token,
    body: { role },
  });

export const transferOwnership = (token: string, householdId: string, newOwnerId: string) =>
  apiRequest<{ members: HouseholdMember[] }>(`/api/households/${householdId}/transfer-ownership`, {
    method: 'POST',
    token,
    body: { newOwnerId },
  });

export const fetchHouseholdData = (token: string, householdId: string) =>
  apiRequest<{ data: SyncedData | null; updatedAt: string | null }>(`/api/households/${householdId}/data`, { token });

export const pushHouseholdData = (token: string, householdId: string, data: SyncedData) =>
  apiRequest<{ updatedAt: string }>(`/api/households/${householdId}/data`, { method: 'PUT', token, body: { data } });

export interface HouseholdSocketHandlers {
  // Someone PUT new shared data (medications/logs/etc).
  onDataUpdated: () => void;
  // The owner changed a member's role. Broadcast separately from data updates so a
  // demotion to viewer (or promotion back) takes effect immediately for the
  // affected member, rather than waiting for their next reload.
  onMembersUpdated: () => void;
}

// Keeps other devices in the same household in sync in near-real-time: the server
// pings every connected member's socket whenever anyone PUTs new data or a role
// changes, and we just refetch on that signal rather than trying to diff/merge on
// the wire.
export const connectHouseholdSocket = (token: string, householdId: string, handlers: HouseholdSocketHandlers): (() => void) => {
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
        if (msg.type === 'data-updated') handlers.onDataUpdated();
        else if (msg.type === 'members-updated') handlers.onMembersUpdated();
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

import { describe, it, expect } from 'vitest';
import { addPendingAction, drainPendingActions, PendingAction } from './pendingActionsDb';

const action = (overrides: Partial<PendingAction> = {}): PendingAction => ({
  id: crypto.randomUUID(),
  type: 'take',
  medicationId: 'ALL',
  dateStr: '2026-08-07',
  timestamp: Date.now(),
  source: 'notification',
  ...overrides,
});

describe('pendingActionsDb', () => {
  it('drains to an empty array when nothing has been queued', async () => {
    await expect(drainPendingActions()).resolves.toEqual([]);
  });

  it('returns a previously added action and then clears the queue', async () => {
    const a = action({ medicationId: 'm1' });
    await addPendingAction(a);

    const drained = await drainPendingActions();
    expect(drained).toEqual([a]);

    // The queue should now be empty — this is what lets the app apply each
    // notification/shortcut action exactly once.
    await expect(drainPendingActions()).resolves.toEqual([]);
  });

  it('accumulates multiple queued actions before draining', async () => {
    const a = action({ id: 'a', medicationId: 'm1' });
    const b = action({ id: 'b', medicationId: 'm2' });
    await addPendingAction(a);
    await addPendingAction(b);

    const drained = await drainPendingActions();
    expect(drained).toHaveLength(2);
    expect(drained.map(x => x.id).sort()).toEqual(['a', 'b']);
  });
});

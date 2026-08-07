import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickLogSheet } from './QuickLogSheet';
import { Medication, MedicationLog } from '../types';

const med = (overrides: Partial<Medication> = {}): Medication => ({
  id: 'm1',
  title: '薬A',
  unit: '錠',
  dosage: 1,
  label: '朝食後',
  stock: 10,
  memo: '',
  color: 'emerald',
  startDate: Date.now(),
  isFolder: false,
  ...overrides,
});

describe('QuickLogSheet', () => {
  it('shows an empty state when no medications are registered', () => {
    render(<QuickLogSheet medications={[]} logs={[]} dateStr="2026-08-07" onTake={vi.fn()} onTakeAll={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('お薬未登録')).toBeInTheDocument();
  });

  it('shows a completion message once everything for the day is logged', () => {
    const medications = [med()];
    const logs: MedicationLog[] = [{ id: 'l1', medicationId: 'm1', timestamp: 1, dateStr: '2026-08-07' }];
    render(<QuickLogSheet medications={medications} logs={logs} dateStr="2026-08-07" onTake={vi.fn()} onTakeAll={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('今日の分はすべて記録済みです')).toBeInTheDocument();
  });

  it('lists only not-yet-taken medications and calls onTake with the right id', async () => {
    const user = userEvent.setup();
    const medications = [med({ id: 'a', title: '薬A' }), med({ id: 'b', title: '薬B' })];
    const logs: MedicationLog[] = [{ id: 'l1', medicationId: 'a', timestamp: 1, dateStr: '2026-08-07' }];
    const onTake = vi.fn();

    render(<QuickLogSheet medications={medications} logs={logs} dateStr="2026-08-07" onTake={onTake} onTakeAll={vi.fn()} onClose={vi.fn()} />);

    expect(screen.queryByText('薬A')).not.toBeInTheDocument();
    await user.click(screen.getByText('薬B'));

    expect(onTake).toHaveBeenCalledWith('b');
  });

  it('calls onTakeAll when the bulk button is pressed', async () => {
    const user = userEvent.setup();
    const onTakeAll = vi.fn();
    render(<QuickLogSheet medications={[med()]} logs={[]} dateStr="2026-08-07" onTake={vi.fn()} onTakeAll={onTakeAll} onClose={vi.fn()} />);

    await user.click(screen.getByText('全部飲んだ'));
    expect(onTakeAll).toHaveBeenCalledTimes(1);
  });

  it('calls onClose from the close button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<QuickLogSheet medications={[]} logs={[]} dateStr="2026-08-07" onTake={vi.fn()} onTakeAll={vi.fn()} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: '閉じる' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VitalsView } from './VitalsView';
import type { VitalRecord } from '../../types';

const weight = (overrides: Partial<VitalRecord> = {}): VitalRecord => ({
  id: 'v1',
  type: 'weight',
  value: 60,
  timestamp: new Date('2026-08-01').getTime(),
  dateStr: '2026-08-01',
  ...overrides,
} as VitalRecord);

describe('VitalsView', () => {
  it('shows an empty state when there are no records', () => {
    render(<VitalsView vitals={[]} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('まだ記録がありません')).toBeInTheDocument();
  });

  it('groups records by type and shows their values', () => {
    render(
      <VitalsView
        vitals={[weight({ id: 'v1', value: 60 }), weight({ id: 'v2', value: 61 })]}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('体重')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'この記録を削除' })).toHaveLength(2);
  });

  it('calls onDelete with the right id', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<VitalsView vitals={[weight({ id: 'v1' })]} onSave={vi.fn()} onDelete={onDelete} onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'この記録を削除' }));
    expect(onDelete).toHaveBeenCalledWith('v1');
  });

  it('opens the add-record form and calls onSave', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<VitalsView vitals={[]} onSave={onSave} onDelete={vi.fn()} onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /記録を追加/ }));
    expect(screen.getByRole('dialog', { name: 'バイタルを記録' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '体重' }));
    await user.type(screen.getByLabelText('体重(kg)'), '65');
    await user.click(screen.getByRole('button', { name: '記録する' }));

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('hides the add button and delete controls in readOnly mode', () => {
    render(<VitalsView vitals={[weight()]} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} readOnly />);
    expect(screen.queryByRole('button', { name: /記録を追加/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'この記録を削除' })).not.toBeInTheDocument();
  });

  it('calls onClose from the back button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<VitalsView vitals={[]} onSave={vi.fn()} onDelete={vi.fn()} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: '戻る' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

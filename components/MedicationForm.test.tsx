import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MedicationForm } from './MedicationForm';
import { UNITS, LABELS } from '../constants';

describe('MedicationForm', () => {
  it('does not submit without a title', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<MedicationForm onSave={onSave} onCancel={vi.fn()} visibleUnits={UNITS} visibleLabels={LABELS} />);

    await user.click(screen.getByText('変更を保存'));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves a new medication with the entered title', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<MedicationForm onSave={onSave} onCancel={vi.fn()} visibleUnits={UNITS} visibleLabels={LABELS} />);

    await user.type(screen.getByPlaceholderText('名称を入力...'), 'テスト薬');
    await user.click(screen.getByText('変更を保存'));

    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0];
    expect(saved.title).toBe('テスト薬');
    expect(saved.isFolder).toBe(false);
    expect(typeof saved.id).toBe('string');
  });

  it('pre-fills fields from initialData when editing', () => {
    render(
      <MedicationForm
        initialData={{
          id: 'm1',
          title: '既存薬',
          unit: '錠',
          dosage: 2,
          label: '朝食後',
          stock: 5,
          memo: 'メモ',
          color: 'emerald',
          startDate: Date.now(),
          isFolder: false,
        }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        visibleUnits={UNITS}
        visibleLabels={LABELS}
      />
    );

    expect(screen.getByDisplayValue('既存薬')).toBeInTheDocument();
    expect(screen.getByDisplayValue('メモ')).toBeInTheDocument();
  });

  it('asks for confirmation before deleting, then calls onDelete', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <MedicationForm
        initialData={{
          id: 'm1',
          title: '既存薬',
          unit: '錠',
          dosage: 2,
          label: '朝食後',
          stock: 5,
          memo: '',
          color: 'emerald',
          startDate: Date.now(),
          isFolder: false,
        }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        onDelete={onDelete}
        visibleUnits={UNITS}
        visibleLabels={LABELS}
      />
    );

    await user.click(screen.getByText('この情報を削除'));
    expect(screen.getByText('削除しますか？')).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByText('削除する'));
    expect(onDelete).toHaveBeenCalledWith('m1');
  });
});

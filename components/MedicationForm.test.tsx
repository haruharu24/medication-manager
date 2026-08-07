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

  it('creates a new folder with the selected folder type', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <MedicationForm
        initialData={{
          id: '',
          title: '',
          unit: '錠',
          dosage: 0,
          label: '',
          stock: 0,
          memo: '',
          color: 'emerald',
          startDate: Date.now(),
          isFolder: true,
          folderType: 'multi-dose',
        }}
        isNew
        onSave={onSave}
        onCancel={vi.fn()}
        visibleUnits={UNITS}
        visibleLabels={LABELS}
      />
    );

    expect(screen.getByText('グループを作成')).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('名称を入力...'), '朝の一包化');
    await user.click(screen.getByText('一包化'));
    await user.click(screen.getByText('変更を保存'));

    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0];
    expect(saved.title).toBe('朝の一包化');
    expect(saved.isFolder).toBe(true);
    expect(saved.folderType).toBe('one-pack');
  });

  it('assigns a medication to an existing group via the group selector', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const group = {
      id: 'g1',
      title: '朝の一包化',
      unit: '包' as const,
      dosage: 1,
      label: '',
      stock: 0,
      memo: '',
      color: 'emerald',
      startDate: Date.now(),
      isFolder: true,
      folderType: 'one-pack' as const,
    };
    render(
      <MedicationForm
        onSave={onSave}
        onCancel={vi.fn()}
        visibleUnits={UNITS}
        visibleLabels={LABELS}
        availableGroups={[group]}
        isNew
      />
    );

    await user.type(screen.getByPlaceholderText('名称を入力...'), 'テスト薬');
    await user.selectOptions(screen.getByLabelText('グループ'), 'g1');
    await user.click(screen.getByText('変更を保存'));

    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0];
    expect(saved.parentId).toBe('g1');
  });
});

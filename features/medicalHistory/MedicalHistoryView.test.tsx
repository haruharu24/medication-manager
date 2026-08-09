import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MedicalHistoryView } from './MedicalHistoryView';
import type { MedicalRecord } from '../../types';

const allergy = (overrides: Partial<MedicalRecord> = {}): MedicalRecord => ({
  id: 'a1',
  type: 'allergy',
  title: 'ペニシリン',
  severity: 'severe',
  createdAt: 1,
  ...overrides,
});

const history = (overrides: Partial<MedicalRecord> = {}): MedicalRecord => ({
  id: 'h1',
  type: 'history',
  title: '高血圧',
  createdAt: 1,
  ...overrides,
});

describe('MedicalHistoryView', () => {
  it('shows empty states for both sections when there are no records', () => {
    render(<MedicalHistoryView records={[]} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('アレルギーの記録はありません')).toBeInTheDocument();
    expect(screen.getByText('既往歴の記録はありません')).toBeInTheDocument();
  });

  it('splits records into allergy and history sections', () => {
    render(<MedicalHistoryView records={[allergy(), history()]} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('ペニシリン')).toBeInTheDocument();
    expect(screen.getByText('高血圧')).toBeInTheDocument();
    expect(screen.getByText('重度')).toBeInTheDocument();
  });

  it('calls onDelete with the right id', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<MedicalHistoryView records={[allergy()]} onSave={vi.fn()} onDelete={onDelete} onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'ペニシリンを削除' }));
    expect(onDelete).toHaveBeenCalledWith('a1');
  });

  it('opens the add form pre-set to the allergy type from the allergy section', async () => {
    const user = userEvent.setup();
    render(<MedicalHistoryView records={[]} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'アレルギーを追加' }));
    expect(screen.getByRole('button', { name: 'アレルギー', pressed: true })).toBeInTheDocument();
  });

  it('opens the edit form pre-filled for an existing record', async () => {
    const user = userEvent.setup();
    render(<MedicalHistoryView records={[allergy()]} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'ペニシリンを編集' }));
    expect(screen.getByLabelText('アレルギーの原因')).toHaveValue('ペニシリン');
  });

  it('hides add/edit/delete controls in readOnly mode', () => {
    render(<MedicalHistoryView records={[allergy()]} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} readOnly />);
    expect(screen.queryByRole('button', { name: 'アレルギーを追加' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ペニシリンを編集' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ペニシリンを削除' })).not.toBeInTheDocument();
  });

  it('calls onClose from the back button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<MedicalHistoryView records={[]} onSave={vi.fn()} onDelete={vi.fn()} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: '戻る' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MedicalRecordForm } from './MedicalRecordForm';
import type { MedicalRecord } from '../../types';

describe('MedicalRecordForm', () => {
  it('disables save until a title is entered', async () => {
    const user = userEvent.setup();
    render(<MedicalRecordForm defaultType="allergy" onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole('button', { name: '保存する' })).toBeDisabled();
    await user.type(screen.getByLabelText('アレルギーの原因'), 'ペニシリン');
    expect(screen.getByRole('button', { name: '保存する' })).toBeEnabled();
  });

  it('saves an allergy record with the entered severity', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<MedicalRecordForm defaultType="allergy" onSave={onSave} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('アレルギーの原因'), 'ペニシリン');
    await user.click(screen.getByRole('button', { name: '重度' }));
    await user.click(screen.getByRole('button', { name: '保存する' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const record = onSave.mock.calls[0][0];
    expect(record.type).toBe('allergy');
    expect(record.title).toBe('ペニシリン');
    expect(record.severity).toBe('severe');
  });

  it('switches to the history type and hides the severity picker', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<MedicalRecordForm defaultType="allergy" onSave={onSave} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '既往歴' }));
    expect(screen.queryByRole('button', { name: '重度' })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('病名・症状'), '高血圧');
    await user.click(screen.getByRole('button', { name: '保存する' }));

    const record = onSave.mock.calls[0][0];
    expect(record.type).toBe('history');
    expect(record.severity).toBeUndefined();
  });

  it('pre-fills fields from initialData when editing', () => {
    const initialData: MedicalRecord = { id: 'r1', type: 'allergy', title: 'ペニシリン', severity: 'mild', createdAt: 1 };
    render(<MedicalRecordForm defaultType="allergy" initialData={initialData} onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText('アレルギーの原因')).toHaveValue('ペニシリン');
    expect(screen.getByRole('button', { name: '軽度' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onCancel from the close button', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<MedicalRecordForm defaultType="allergy" onSave={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: '閉じる' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

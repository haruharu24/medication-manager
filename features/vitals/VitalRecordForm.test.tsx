import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VitalRecordForm } from './VitalRecordForm';

describe('VitalRecordForm', () => {
  it('disables the save button until the selected type\'s required fields are filled', async () => {
    const user = userEvent.setup();
    render(<VitalRecordForm onSave={vi.fn()} onCancel={vi.fn()} />);

    // Blood pressure is the default type and needs both systolic and diastolic.
    expect(screen.getByRole('button', { name: '記録する' })).toBeDisabled();
    await user.type(screen.getByLabelText('最高(上)'), '120');
    await user.type(screen.getByLabelText('最低(下)'), '80');
    expect(screen.getByRole('button', { name: '記録する' })).toBeEnabled();
  });

  it('saves a blood pressure record with the entered values', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<VitalRecordForm onSave={onSave} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('最高(上)'), '120');
    await user.type(screen.getByLabelText('最低(下)'), '80');
    await user.type(screen.getByLabelText('脈拍'), '70');
    await user.click(screen.getByRole('button', { name: '記録する' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const record = onSave.mock.calls[0][0];
    expect(record.type).toBe('bloodPressure');
    expect(record.systolic).toBe(120);
    expect(record.diastolic).toBe(80);
    expect(record.pulse).toBe(70);
  });

  it('switches to a single-value field for weight and saves it', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<VitalRecordForm onSave={onSave} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '体重' }));
    await user.type(screen.getByLabelText('体重(kg)'), '62.5');
    await user.click(screen.getByRole('button', { name: '記録する' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const record = onSave.mock.calls[0][0];
    expect(record.type).toBe('weight');
    expect(record.value).toBe(62.5);
  });

  it('calls onCancel from the close button', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<VitalRecordForm onSave={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: '閉じる' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

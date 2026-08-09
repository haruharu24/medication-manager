import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MedicalContactsView } from './MedicalContactsView';

describe('MedicalContactsView', () => {
  it('pre-fills fields from the given contacts', () => {
    render(
      <MedicalContactsView
        contacts={{ pharmacyName: 'さくら薬局', hospitalName: 'さくら病院' }}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByLabelText('薬局名')).toHaveValue('さくら薬局');
    expect(screen.getByLabelText('病院名')).toHaveValue('さくら病院');
  });

  it('saves the edited contacts and closes', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(<MedicalContactsView contacts={{}} onSave={onSave} onClose={onClose} />);

    await user.type(screen.getByLabelText('薬局名'), 'さくら薬局');
    await user.type(screen.getByLabelText('電話番号', { selector: '#contact-pharmacy-phone' }), '03-1234-5678');
    await user.click(screen.getByRole('button', { name: '保存する' }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ pharmacyName: 'さくら薬局', pharmacyPhone: '03-1234-5678' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('disables all fields and hides the save button in readOnly mode', () => {
    render(<MedicalContactsView contacts={{ pharmacyName: 'さくら薬局' }} onSave={vi.fn()} onClose={vi.fn()} readOnly />);
    expect(screen.getByLabelText('薬局名')).toBeDisabled();
    expect(screen.queryByRole('button', { name: '保存する' })).not.toBeInTheDocument();
  });

  it('calls onClose from the back button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<MedicalContactsView contacts={{}} onSave={vi.fn()} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: '戻る' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BottomNav } from './BottomNav';

describe('BottomNav', () => {
  it('calls onChange with the tapped view', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BottomNav currentView="home" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'お薬' }));
    expect(onChange).toHaveBeenCalledWith('meds');

    await user.click(screen.getByRole('button', { name: '設定' }));
    expect(onChange).toHaveBeenCalledWith('settings');
  });

  it('renders all three destinations', () => {
    render(<BottomNav currentView="home" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'ホーム' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'お薬' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '設定' })).toBeInTheDocument();
  });
});

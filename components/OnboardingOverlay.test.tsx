import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingOverlay } from './OnboardingOverlay';

describe('OnboardingOverlay', () => {
  it('shows the first step and calls onFinish when skipped', async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<OnboardingOverlay onFinish={onFinish} />);

    expect(screen.getByText('MediMateへようこそ')).toBeInTheDocument();
    await user.click(screen.getByText('スキップ'));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('advances through every step and finishes on the last one', async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<OnboardingOverlay onFinish={onFinish} />);

    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByText('次へ'));
    }

    expect(screen.getByText('家族と共有する')).toBeInTheDocument();
    expect(screen.queryByText('スキップ')).not.toBeInTheDocument();

    await user.click(screen.getByText('はじめる'));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('closes via the close button', async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<OnboardingOverlay onFinish={onFinish} />);

    await user.click(screen.getByLabelText('スキップして閉じる'));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});

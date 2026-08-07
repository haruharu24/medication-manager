import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HealthCard } from './HealthCard';
import { DailyCondition } from '../types';

const condition = (overrides: Partial<DailyCondition> = {}): DailyCondition => ({
  dateStr: '2026-08-07',
  score: 0,
  memo: '',
  ...overrides,
});

describe('HealthCard', () => {
  it('shows "記録なし" when there is no score or memo and not in edit mode', () => {
    render(<HealthCard condition={condition()} onUpdate={vi.fn()} selectedDate={new Date()} isEditMode={false} />);
    expect(screen.getByText('記録なし')).toBeInTheDocument();
  });

  it('shows the saved memo when present and not in edit mode', () => {
    render(<HealthCard condition={condition({ score: 5, memo: '頭痛あり' })} onUpdate={vi.fn()} selectedDate={new Date()} isEditMode={false} />);
    expect(screen.getByText('頭痛あり')).toBeInTheDocument();
  });

  it('calls onUpdate with the tapped score while in edit mode', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<HealthCard condition={condition()} onUpdate={onUpdate} selectedDate={new Date()} isEditMode={true} />);

    await user.click(screen.getByText('7'));
    expect(onUpdate).toHaveBeenCalledWith({ score: 7 });
  });

  it('calls onUpdate with the typed memo while in edit mode', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<HealthCard condition={condition()} onUpdate={onUpdate} selectedDate={new Date()} isEditMode={true} />);

    const textarea = screen.getByPlaceholderText('症状や気分のメモ...');
    await user.type(textarea, 'x');
    expect(onUpdate).toHaveBeenCalledWith({ memo: 'x' });
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { getStoredTheme, applyTheme } from './theme';

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('defaults to light when nothing is stored', () => {
    expect(getStoredTheme()).toBe('light');
  });

  it('reads a stored dark preference', () => {
    localStorage.setItem('theme', 'dark');
    expect(getStoredTheme()).toBe('dark');
  });

  it('treats any non-"dark" stored value as light', () => {
    localStorage.setItem('theme', 'sepia');
    expect(getStoredTheme()).toBe('light');
  });

  it('applyTheme("dark") adds the dark class and persists the choice', () => {
    applyTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('applyTheme("light") removes the dark class and persists the choice', () => {
    document.documentElement.classList.add('dark');
    applyTheme('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
  });
});

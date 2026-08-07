import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider, useI18n } from './index';

const LanguageProbe: React.FC = () => {
  const { language, setLanguage, t } = useI18n();
  return (
    <div>
      <p data-testid="lang">{language}</p>
      <p data-testid="nav-home">{t.nav.home}</p>
      <button onClick={() => setLanguage('en')}>switch to en</button>
      <button onClick={() => setLanguage('ja')}>switch to ja</button>
    </div>
  );
};

describe('I18nProvider / useI18n', () => {
  it('defaults to Japanese when nothing is stored', () => {
    localStorage.removeItem('language');
    render(<I18nProvider><LanguageProbe /></I18nProvider>);
    expect(screen.getByTestId('lang')).toHaveTextContent('ja');
    expect(screen.getByTestId('nav-home')).toHaveTextContent('ホーム');
  });

  it('switches languages and persists the choice to localStorage', async () => {
    const user = userEvent.setup();
    localStorage.removeItem('language');
    render(<I18nProvider><LanguageProbe /></I18nProvider>);

    await user.click(screen.getByText('switch to en'));
    expect(screen.getByTestId('lang')).toHaveTextContent('en');
    expect(screen.getByTestId('nav-home')).toHaveTextContent('Home');
    expect(localStorage.getItem('language')).toBe('en');

    await user.click(screen.getByText('switch to ja'));
    expect(screen.getByTestId('lang')).toHaveTextContent('ja');
    expect(localStorage.getItem('language')).toBe('ja');
  });

  it('picks up a previously stored language on mount', () => {
    localStorage.setItem('language', 'en');
    render(<I18nProvider><LanguageProbe /></I18nProvider>);
    expect(screen.getByTestId('lang')).toHaveTextContent('en');
    localStorage.removeItem('language');
  });

  it('useI18n falls back to Japanese defaults when used without a provider', () => {
    render(<LanguageProbe />);
    expect(screen.getByTestId('lang')).toHaveTextContent('ja');
    expect(screen.getByTestId('nav-home')).toHaveTextContent('ホーム');
  });
});

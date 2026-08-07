export type Theme = 'light' | 'dark';

// index.html applies this same 'theme' key before first paint (see the inline
// <script> there) to avoid a light-mode flash; keep both in sync.
export const getStoredTheme = (): Theme => (localStorage.getItem('theme') === 'dark' ? 'dark' : 'light');

export const applyTheme = (theme: Theme): void => {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  localStorage.setItem('theme', theme);
};

export type Theme = 'light' | 'dark';

export function getTheme(): Theme {
  return (document.documentElement.dataset.theme as Theme) ?? 'light';
}

export function setTheme(t: Theme): void {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem('theme', t);
  } catch (e) {}
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

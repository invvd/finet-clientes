'use client';

import { Sun, Moon } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { toggleTheme, getTheme } from '../theme/theme';

function subscribeToTheme(callback: () => void) {
  const observer = new MutationObserver(() => callback());
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  return () => observer.disconnect();
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToTheme, getTheme, () => 'light');

  function handleClick() {
    toggleTheme();
  }

  return (
    <button
      onClick={handleClick}
      suppressHydrationWarning
      aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="flex items-center justify-center w-9 h-9 rounded-md text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
    >
      <Sun size={18} className={theme === 'dark' ? 'hidden' : 'block'} aria-hidden />
      <Moon size={18} className={theme === 'dark' ? 'block' : 'hidden'} aria-hidden />
    </button>
  );
}

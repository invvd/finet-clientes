'use client';

import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toggleTheme, getTheme, type Theme } from '../theme/theme';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    setTheme(getTheme());
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9" />;
  }

  function handleClick() {
    const next = toggleTheme();
    setTheme(next);
  }

  return (
    <button
      onClick={handleClick}
      aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="flex items-center justify-center w-9 h-9 rounded-md text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

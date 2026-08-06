'use client';
import { useEffect, useState } from 'react';
import { SunIcon, MoonIcon } from './icons';
import { C } from './ui';
import { getTheme, setTheme, type Theme } from '@/lib/theme';

/**
 * The theme is already on <html> before this mounts (see THEME_BOOT_SCRIPT), so
 * the initial state is read from the DOM rather than from storage — that keeps
 * the button in sync with what the user is actually looking at, with no flash
 * and no hydration mismatch.
 */
export default function ThemeToggle({ size = 34 }: { size?: number }) {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    setThemeState(getTheme());
    const onChange = (e: Event) => setThemeState((e as CustomEvent<Theme>).detail);
    window.addEventListener('themechange', onChange);
    return () => window.removeEventListener('themechange', onChange);
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setThemeState(next);
  }

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'روشن کردن تم' : 'تاریک کردن تم'}
      title={isDark ? 'تم روشن' : 'تم تاریک'}
      style={{
        width: size, height: size, borderRadius: 11,
        background: C.surface2,
        border: `1px solid ${C.border}`,
        color: C.muted,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, transition: 'color 0.15s, background 0.15s',
      }}
    >
      {isDark ? <SunIcon size={17} /> : <MoonIcon size={17} />}
    </button>
  );
}

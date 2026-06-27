'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

/**
 * Theme system (crew theme-system mission, RAG MEM 50). Themes are values maps for the CSS-variable
 * token contract in globals.css — selected by setting [data-theme] on <html> and persisted to
 * localStorage. Adding a theme = a new [data-theme] block in globals.css + an entry here. No component
 * changes. An inline pre-paint script (THEME_INIT_SCRIPT, injected in layout) avoids a flash.
 */
export type ThemeId = 'lcars' | 'dark' | 'light';

export const THEMES: { id: ThemeId; label: string }[] = [
  { id: 'lcars', label: 'LCARS' },
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
];

const STORAGE_KEY = 'sa-theme';
const DEFAULT_THEME: ThemeId = 'lcars';

/** Pre-paint script: set [data-theme] from localStorage before React hydrates (no FOUC). */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}')||'${DEFAULT_THEME}';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','${DEFAULT_THEME}');}})();`;

interface ThemeCtx { theme: ThemeId; setTheme: (t: ThemeId) => void; }
const Ctx = createContext<ThemeCtx>({ theme: DEFAULT_THEME, setTheme: () => {} });

export function useTheme(): ThemeCtx {
  return useContext(Ctx);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);

  useEffect(() => {
    const stored = (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)) as ThemeId | null;
    if (stored && THEMES.some((t) => t.id === stored)) setThemeState(stored);
  }, []);

  function setTheme(t: ThemeId) {
    setThemeState(t);
    try { localStorage.setItem(STORAGE_KEY, t); } catch { /* ignore */ }
    document.documentElement.setAttribute('data-theme', t);
  }

  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}

/** Compact theme switcher for the NavBar. */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }} title="UI theme">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setTheme(t.id)}
          aria-pressed={theme === t.id}
          style={{
            background: theme === t.id ? 'var(--accent1)' : 'var(--surface-2)',
            color: theme === t.id ? 'var(--on-accent)' : 'var(--text-dim)',
            border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px',
            fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer',
          }}
        >
          {t.label}
        </button>
      ))}
    </span>
  );
}

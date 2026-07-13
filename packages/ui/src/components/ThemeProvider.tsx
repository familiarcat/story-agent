'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

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
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const applyPreview = (t: ThemeId) => {
    document.documentElement.setAttribute('data-theme', t);
  };

  const restoreTheme = () => {
    document.documentElement.setAttribute('data-theme', theme);
  };

  useEffect(() => {
    const onDocClick = (ev: MouseEvent) => {
      if (!wrapRef.current) return;
      if (wrapRef.current.contains(ev.target as Node)) return;
      setOpen(false);
      restoreTheme();
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [theme]);

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      title="UI theme"
      onMouseLeave={() => {
        if (open) restoreTheme();
      }}
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (!next) restoreTheme();
        }}
        style={{
          background: 'var(--surface-2)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '4px 9px',
          fontSize: '0.68rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          cursor: 'pointer',
          minWidth: 88,
          textAlign: 'left',
        }}
      >
        Theme: {THEMES.find((t) => t.id === theme)?.label ?? 'Theme'} ▾
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Theme selection"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            minWidth: 140,
            overflow: 'hidden',
            zIndex: 200,
          }}
        >
          {THEMES.map((t) => (
            <button
              key={t.id}
              role="option"
              aria-selected={theme === t.id}
              type="button"
              onMouseEnter={() => applyPreview(t.id)}
              onFocus={() => applyPreview(t.id)}
              onClick={() => {
                setTheme(t.id);
                setOpen(false);
              }}
              style={{
                width: '100%',
                border: 'none',
                borderTop: '1px solid var(--border)',
                background: theme === t.id ? 'var(--surface-2)' : 'var(--surface)',
                color: theme === t.id ? 'var(--text)' : 'var(--text-dim)',
                textAlign: 'left',
                padding: '7px 10px',
                fontSize: '0.73rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

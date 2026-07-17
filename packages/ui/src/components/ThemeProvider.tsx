'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  type AspectThemeId,
  type ClientThemeId,
  type ProjectThemeId,
  composeThemeLayerOverrides,
  toCssVarName,
} from '@story-agent/shared/design-theme-layers';

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
const CLIENT_STORAGE_KEY = 'sa-client-theme';
const PROJECT_STORAGE_KEY = 'sa-project-theme';
const ASPECT_STORAGE_KEY = 'sa-aspect-theme';
const DEFAULT_THEME: ThemeId = 'lcars';
const DEFAULT_CLIENT_THEME: ClientThemeId = 'none';
const DEFAULT_PROJECT_THEME: ProjectThemeId = 'none';
const DEFAULT_ASPECT_THEME: AspectThemeId = 'none';

/** Pre-paint script: set [data-theme] from localStorage before React hydrates (no FOUC). */
export const THEME_INIT_SCRIPT = `(function(){try{var qp=(new URLSearchParams(location.search)).get('theme');var q=(qp==='lcars'||qp==='dark'||qp==='light')?qp:null;var t=q||localStorage.getItem('${STORAGE_KEY}')||'${DEFAULT_THEME}';if(q){localStorage.setItem('${STORAGE_KEY}',q);}var c=localStorage.getItem('${CLIENT_STORAGE_KEY}')||'${DEFAULT_CLIENT_THEME}';var p=localStorage.getItem('${PROJECT_STORAGE_KEY}')||'${DEFAULT_PROJECT_THEME}';var a=localStorage.getItem('${ASPECT_STORAGE_KEY}')||'${DEFAULT_ASPECT_THEME}';document.documentElement.setAttribute('data-theme',t);document.documentElement.setAttribute('data-client-theme',c);document.documentElement.setAttribute('data-project-theme',p);document.documentElement.setAttribute('data-aspect-theme',a);}catch(e){document.documentElement.setAttribute('data-theme','${DEFAULT_THEME}');document.documentElement.setAttribute('data-client-theme','${DEFAULT_CLIENT_THEME}');document.documentElement.setAttribute('data-project-theme','${DEFAULT_PROJECT_THEME}');document.documentElement.setAttribute('data-aspect-theme','${DEFAULT_ASPECT_THEME}');}})();`;

interface ThemeCtx {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  clientTheme: ClientThemeId;
  setClientTheme: (t: ClientThemeId) => void;
  projectTheme: ProjectThemeId;
  setProjectTheme: (t: ProjectThemeId) => void;
  aspectTheme: AspectThemeId;
  setAspectTheme: (t: AspectThemeId) => void;
}
const Ctx = createContext<ThemeCtx>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  clientTheme: DEFAULT_CLIENT_THEME,
  setClientTheme: () => {},
  projectTheme: DEFAULT_PROJECT_THEME,
  setProjectTheme: () => {},
  aspectTheme: DEFAULT_ASPECT_THEME,
  setAspectTheme: () => {},
});

export function useTheme(): ThemeCtx {
  return useContext(Ctx);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);
  const [clientTheme, setClientThemeState] = useState<ClientThemeId>(DEFAULT_CLIENT_THEME);
  const [projectTheme, setProjectThemeState] = useState<ProjectThemeId>(DEFAULT_PROJECT_THEME);
  const [aspectTheme, setAspectThemeState] = useState<AspectThemeId>(DEFAULT_ASPECT_THEME);

  function applyLayerOverrides(nextClient: ClientThemeId, nextProject: ProjectThemeId, nextAspect: AspectThemeId) {
    const root = document.documentElement;
    const merged = composeThemeLayerOverrides({
      clientTheme: nextClient,
      projectTheme: nextProject,
      aspectTheme: nextAspect,
    });
    const keys = [
      'bg', 'surface', 'surface-2', 'text', 'text-dim', 'border', 'accent1', 'accent2', 'accent3', 'accent4',
      'danger', 'ok', 'warn', 'on-accent', 'radius', 'radius-elbow', 'font', 'uppercase',
    ] as const;
    for (const key of keys) {
      root.style.removeProperty(toCssVarName(key));
    }
    for (const [k, v] of Object.entries(merged)) {
      if (!v) continue;
      root.style.setProperty(`--${k}`, v);
    }
  }

  useEffect(() => {
    const stored = (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)) as ThemeId | null;
    if (stored && THEMES.some((t) => t.id === stored)) setThemeState(stored);

    const c = (typeof localStorage !== 'undefined' && localStorage.getItem(CLIENT_STORAGE_KEY)) as ClientThemeId | null;
    const p = (typeof localStorage !== 'undefined' && localStorage.getItem(PROJECT_STORAGE_KEY)) as ProjectThemeId | null;
    const a = (typeof localStorage !== 'undefined' && localStorage.getItem(ASPECT_STORAGE_KEY)) as AspectThemeId | null;
    setClientThemeState(c ?? DEFAULT_CLIENT_THEME);
    setProjectThemeState(p ?? DEFAULT_PROJECT_THEME);
    setAspectThemeState(a ?? DEFAULT_ASPECT_THEME);
    applyLayerOverrides(c ?? DEFAULT_CLIENT_THEME, p ?? DEFAULT_PROJECT_THEME, a ?? DEFAULT_ASPECT_THEME);
  }, []);

  function setTheme(t: ThemeId) {
    setThemeState(t);
    try { localStorage.setItem(STORAGE_KEY, t); } catch { /* ignore */ }
    document.documentElement.setAttribute('data-theme', t);
    applyLayerOverrides(clientTheme, projectTheme, aspectTheme);
  }

  function setClientTheme(t: ClientThemeId) {
    setClientThemeState(t);
    try { localStorage.setItem(CLIENT_STORAGE_KEY, t); } catch { /* ignore */ }
    document.documentElement.setAttribute('data-client-theme', t);
    applyLayerOverrides(t, projectTheme, aspectTheme);
  }

  function setProjectTheme(t: ProjectThemeId) {
    setProjectThemeState(t);
    try { localStorage.setItem(PROJECT_STORAGE_KEY, t); } catch { /* ignore */ }
    document.documentElement.setAttribute('data-project-theme', t);
    applyLayerOverrides(clientTheme, t, aspectTheme);
  }

  function setAspectTheme(t: AspectThemeId) {
    setAspectThemeState(t);
    try { localStorage.setItem(ASPECT_STORAGE_KEY, t); } catch { /* ignore */ }
    document.documentElement.setAttribute('data-aspect-theme', t);
    applyLayerOverrides(clientTheme, projectTheme, t);
  }

  return (
    <Ctx.Provider
      value={{
        theme,
        setTheme,
        clientTheme,
        setClientTheme,
        projectTheme,
        setProjectTheme,
        aspectTheme,
        setAspectTheme,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

/** Compact theme switcher for the NavBar. */
export function ThemeSwitcher() {
  const {
    theme,
    setTheme,
    clientTheme,
    setClientTheme,
    projectTheme,
    setProjectTheme,
    aspectTheme,
    setAspectTheme,
  } = useTheme();
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
        data-testid="theme-toggle"
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
          <div style={{ padding: '7px 10px', fontSize: '0.67rem', color: 'var(--text-dim)', borderBottom: '1px solid var(--border)' }}>
            Control Layer: core → client → project → aspect
          </div>
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
          <div style={{ borderTop: '1px solid var(--border)', padding: '8px 10px', display: 'grid', gap: 6 }}>
            <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
              Client Theme
              <select value={clientTheme} onChange={(e) => setClientTheme(e.target.value as ClientThemeId)} style={{ width: '100%', marginTop: 3 }}>
                <option value="none">none</option>
                <option value="regulated">regulated</option>
                <option value="executive">executive</option>
                <option value="consumer">consumer</option>
              </select>
            </label>
            <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
              Project Theme
              <select value={projectTheme} onChange={(e) => setProjectTheme(e.target.value as ProjectThemeId)} style={{ width: '100%', marginTop: 3 }}>
                <option value="none">none</option>
                <option value="operations">operations</option>
                <option value="research">research</option>
                <option value="delivery">delivery</option>
              </select>
            </label>
            <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
              Aspect Variant
              <select value={aspectTheme} onChange={(e) => setAspectTheme(e.target.value as AspectThemeId)} style={{ width: '100%', marginTop: 3 }}>
                <option value="none">none</option>
                <option value="telemetry">telemetry</option>
                <option value="planning">planning</option>
                <option value="analysis">analysis</option>
              </select>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

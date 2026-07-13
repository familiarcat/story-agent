'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'sa-sidebar-collapsed';
const DEFAULT_COLLAPSED = false;

/** Pre-paint script: set [data-sidebar-collapsed] from localStorage before React hydrates (no flash). */
export const SIDEBAR_INIT_SCRIPT = `(function(){try{var c=localStorage.getItem('${STORAGE_KEY}');if(c==='true')document.documentElement.setAttribute('data-sidebar-collapsed','true');}catch(e){}})();`;

interface SidebarCtx { isCollapsed: boolean; toggleCollapse: () => void; }
const Ctx = createContext<SidebarCtx>({ isCollapsed: DEFAULT_COLLAPSED, toggleCollapse: () => {} });

export function useSidebar(): SidebarCtx {
  return useContext(Ctx);
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsedState] = useState<boolean>(DEFAULT_COLLAPSED);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'true';
    if (stored) setIsCollapsedState(true);
  }, []);

  function toggleCollapse() {
    const newState = !isCollapsed;
    setIsCollapsedState(newState);
    try { localStorage.setItem(STORAGE_KEY, newState ? 'true' : 'false'); } catch { /* ignore */ }
    document.documentElement.setAttribute('data-sidebar-collapsed', newState ? 'true' : 'false');
  }

  return <Ctx.Provider value={{ isCollapsed: mounted ? isCollapsed : DEFAULT_COLLAPSED, toggleCollapse }}>{children}</Ctx.Provider>;
}

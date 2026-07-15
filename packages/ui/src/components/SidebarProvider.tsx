'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const DEFAULT_COLLAPSED = false;
const SIDEBAR_STORAGE_KEY = 'story-agent-sidebar-collapsed';

/** Pre-paint script: apply persisted collapse state before hydration to avoid layout jump. */
export const SIDEBAR_INIT_SCRIPT = `(function(){try{var raw=localStorage.getItem('${SIDEBAR_STORAGE_KEY}');var collapsed=raw==='true';document.documentElement.setAttribute('data-sidebar-collapsed',collapsed?'true':'false');}catch(_){document.documentElement.setAttribute('data-sidebar-collapsed','false');}})();`;

interface SidebarCtx {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  setCollapsed: (next: boolean) => void;
}
const Ctx = createContext<SidebarCtx>({ isCollapsed: DEFAULT_COLLAPSED, toggleCollapse: () => {}, setCollapsed: () => {} });

export function useSidebar(): SidebarCtx {
  return useContext(Ctx);
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsedState] = useState<boolean>(DEFAULT_COLLAPSED);

  useEffect(() => {
    const fromDom = document.documentElement.getAttribute('data-sidebar-collapsed') === 'true';
    setIsCollapsedState(fromDom);
    document.documentElement.setAttribute('data-sidebar-collapsed', fromDom ? 'true' : 'false');
  }, []);

  function setCollapsed(next: boolean) {
    setIsCollapsedState(next);
    document.documentElement.setAttribute('data-sidebar-collapsed', next ? 'true' : 'false');
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? 'true' : 'false');
    } catch {
      // Best-effort persistence only.
    }
  }

  function toggleCollapse() {
    setCollapsed(!isCollapsed);
  }

  return <Ctx.Provider value={{ isCollapsed, toggleCollapse, setCollapsed }}>{children}</Ctx.Provider>;
}

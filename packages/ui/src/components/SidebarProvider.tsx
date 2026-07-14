'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const DEFAULT_COLLAPSED = false;

/** Pre-paint script: keep nav expanded by default on each page load. */
export const SIDEBAR_INIT_SCRIPT = `(function(){document.documentElement.setAttribute('data-sidebar-collapsed','false');})();`;

interface SidebarCtx { isCollapsed: boolean; toggleCollapse: () => void; }
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
    document.documentElement.setAttribute('data-sidebar-collapsed', 'false');
  }, []);

  function setCollapsed(next: boolean) {
    setIsCollapsedState(next);
    document.documentElement.setAttribute('data-sidebar-collapsed', next ? 'true' : 'false');
  }

  function toggleCollapse() {
    setCollapsed(!isCollapsed);
  }

  return <Ctx.Provider value={{ isCollapsed, toggleCollapse, setCollapsed }}>{children}</Ctx.Provider>;
}

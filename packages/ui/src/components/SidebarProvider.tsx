'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const DEFAULT_COLLAPSED = false;

/** Pre-paint script: keep nav expanded by default on each page load. */
export const SIDEBAR_INIT_SCRIPT = `(function(){document.documentElement.setAttribute('data-sidebar-collapsed','false');})();`;

interface SidebarCtx { isCollapsed: boolean; toggleCollapse: () => void; }
const Ctx = createContext<SidebarCtx>({ isCollapsed: DEFAULT_COLLAPSED, toggleCollapse: () => {} });

export function useSidebar(): SidebarCtx {
  return useContext(Ctx);
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsedState] = useState<boolean>(DEFAULT_COLLAPSED);

  useEffect(() => {
    document.documentElement.setAttribute('data-sidebar-collapsed', 'false');
  }, []);

  function toggleCollapse() {
    const newState = !isCollapsed;
    setIsCollapsedState(newState);
    document.documentElement.setAttribute('data-sidebar-collapsed', newState ? 'true' : 'false');
  }

  return <Ctx.Provider value={{ isCollapsed, toggleCollapse }}>{children}</Ctx.Provider>;
}

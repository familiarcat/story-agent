'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { LcarsLoading } from './LcarsLoading';

type LoadingScope = 'screen' | 'component';

interface LoadingRequest {
  scope: LoadingScope;
  source: string;
  destination?: string;
  summary?: string;
}

interface LoadingEntry extends LoadingRequest {
  id: string;
}

interface LoadingStateContextValue {
  isLoading: boolean;
  beginNavigationLoading: (destination: string, source?: string) => void;
  runWithLoading: <T>(request: LoadingRequest, task: () => Promise<T>) => Promise<T>;
}

const LoadingStateContext = createContext<LoadingStateContextValue>({
  isLoading: false,
  beginNavigationLoading: () => {},
  runWithLoading: async (_request, task) => task(),
});

export function useLoadingState(): LoadingStateContextValue {
  return useContext(LoadingStateContext);
}

export function LoadingStateProvider({ children }: { children: ReactNode }) {
  const idCounter = useRef(0);
  const navTimers = useRef<number[]>([]);
  const [entries, setEntries] = useState<LoadingEntry[]>([]);

  const addEntry = useCallback((request: LoadingRequest): string => {
    const id = `load-${Date.now()}-${idCounter.current++}`;
    setEntries((prev) => [...prev, { id, ...request }]);
    return id;
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const beginNavigationLoading = useCallback((destination: string, source = 'Side Navigation') => {
    const id = `nav-${Date.now()}-${idCounter.current++}`;
    setEntries((prev) => {
      const withoutScreen = prev.filter((entry) => entry.scope !== 'screen');
      return [...withoutScreen, { id, scope: 'screen', source, destination }];
    });

    const timer = window.setTimeout(() => {
      setEntries((prev) => prev.filter((entry) => entry.id !== id));
    }, 900);
    navTimers.current.push(timer);
  }, []);

  const runWithLoading = useCallback(async <T,>(request: LoadingRequest, task: () => Promise<T>) => {
    const id = addEntry(request);
    try {
      return await task();
    } finally {
      removeEntry(id);
    }
  }, [addEntry, removeEntry]);

  useEffect(() => {
    return () => {
      navTimers.current.forEach((timer) => window.clearTimeout(timer));
      navTimers.current = [];
    };
  }, []);

  const activeScreen = useMemo(
    () => [...entries].reverse().find((entry) => entry.scope === 'screen') ?? null,
    [entries],
  );
  const activeComponent = useMemo(
    () => [...entries].reverse().find((entry) => entry.scope === 'component') ?? null,
    [entries],
  );

  const value = useMemo<LoadingStateContextValue>(() => ({
    isLoading: entries.length > 0,
    beginNavigationLoading,
    runWithLoading,
  }), [entries.length, beginNavigationLoading, runWithLoading]);

  return (
    <LoadingStateContext.Provider value={value}>
      <div className="app-loading-viewport">
        {children}

        {activeScreen ? (
          <div className="app-loading-overlay" aria-hidden={false}>
            <LcarsLoading
              scope="screen"
              source={activeScreen.source}
              destination={activeScreen.destination}
              summary={activeScreen.summary}
            />
          </div>
        ) : null}

        {!activeScreen && activeComponent ? (
          <div className="app-loading-inline" aria-hidden={false}>
            <LcarsLoading
              scope="component"
              source={activeComponent.source}
              destination={activeComponent.destination}
              summary={activeComponent.summary}
            />
          </div>
        ) : null}
      </div>
    </LoadingStateContext.Provider>
  );
}

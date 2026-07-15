'use client';

import type { ReactNode } from 'react';
import { LcarsLoading } from './LcarsLoading';

interface ComponentLoadingRegionProps {
  loading: boolean;
  source: string;
  summary?: string;
  children: ReactNode;
  minHeight?: number;
}

export function ComponentLoadingRegion({
  loading,
  source,
  summary,
  children,
  minHeight = 180,
}: ComponentLoadingRegionProps) {
  return (
    <section
      className={`component-loading-region${loading ? ' component-loading-region--loading' : ''}`}
      style={{ minHeight }}
      aria-busy={loading}
    >
      <div className="component-loading-region__content">{children}</div>
      {loading ? (
        <div className="component-loading-region__overlay">
          <LcarsLoading scope="component" source={source} summary={summary} />
        </div>
      ) : null}
    </section>
  );
}

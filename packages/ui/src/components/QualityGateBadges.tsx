'use client';

import React from 'react';
import { space } from '@/lib/tokens';
import StatusBadge from './StatusBadge';

/**
 * QualityGateBadges — Quality metrics display
 *
 * Shows test coverage, security status, and deployment readiness through
 * a collection of status badges.
 *
 * @example
 * ```tsx
 * <QualityGateBadges
 *   unitTests={true}
 *   integrationTests={true}
 *   coverage={85}
 *   security="passed"
 * />
 * ```
 */

export interface QualityGateBadgesProps {
  /** Unit test pass status */
  unitTests: boolean;
  /** Integration test pass status */
  integrationTests: boolean;
  /** Code coverage percentage (0-100) */
  coverage: number;
  /** Security audit status */
  security: 'passed' | 'warning' | 'failed';
  /** Optional lint status */
  linting?: boolean;
  /** Optional type check status */
  typeChecking?: boolean;
}

function getCoverageStatus(coverage: number): string {
  if (coverage >= 80) return '🟢';
  if (coverage >= 60) return '🟡';
  return '🔴';
}

export function QualityGateBadges({
  unitTests,
  integrationTests,
  coverage,
  security,
  linting,
  typeChecking,
}: QualityGateBadgesProps): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: space(2),
        alignItems: 'center',
      }}
    >
      <StatusBadge
        variant="test"
        status={unitTests ? 'passed' : 'failed'}
        label="Unit Tests"
        icon={unitTests ? '✅' : '❌'}
      />

      <StatusBadge
        variant="test"
        status={integrationTests ? 'passed' : 'failed'}
        label="Integration Tests"
        icon={integrationTests ? '✅' : '❌'}
      />

      <StatusBadge
        variant="test"
        status={coverage >= 80 ? 'good' : coverage >= 60 ? 'fair' : 'poor'}
        label={`Coverage: ${coverage}%`}
        icon={getCoverageStatus(coverage)}
      />

      <StatusBadge
        variant="test"
        status={security}
        label="Security Audit"
        icon={security === 'passed' ? '🛡️' : security === 'warning' ? '⚠️' : '❌'}
      />

      {linting !== undefined && (
        <StatusBadge
          variant="test"
          status={linting ? 'passed' : 'failed'}
          label="Linting"
          icon={linting ? '✅' : '❌'}
        />
      )}

      {typeChecking !== undefined && (
        <StatusBadge
          variant="test"
          status={typeChecking ? 'passed' : 'failed'}
          label="Type Checking"
          icon={typeChecking ? '✅' : '❌'}
        />
      )}
    </div>
  );
}

export default QualityGateBadges;

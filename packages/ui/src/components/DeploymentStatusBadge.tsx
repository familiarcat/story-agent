'use client';

import React from 'react';
import { color, space } from '@/lib/tokens';
import StatusBadge from './StatusBadge';

/**
 * DeploymentStatusBadge — Deployment readiness indicator
 *
 * Shows CI status, target environment, and deployment readiness.
 *
 * @example
 * ```tsx
 * <DeploymentStatusBadge
 *   ciStatus="passed"
 *   environment="staging"
 *   deployed={false}
 * />
 * ```
 */

export type DeploymentEnvironment = 'dev' | 'staging' | 'prod';

export interface DeploymentStatusBadgeProps {
  /** CI pipeline status */
  ciStatus: 'passed' | 'failed';
  /** Target environment */
  environment: DeploymentEnvironment;
  /** Whether deployed to target environment */
  deployed: boolean;
}

const ENVIRONMENT_LABELS: Record<DeploymentEnvironment, string> = {
  dev: 'Development',
  staging: 'Staging',
  prod: 'Production',
};

export function DeploymentStatusBadge({
  ciStatus,
  environment,
  deployed,
}: DeploymentStatusBadgeProps): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        gap: space(2),
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <StatusBadge
        variant="deployment"
        status={ciStatus}
        label="CI Status"
        icon={ciStatus === 'passed' ? '✅' : '❌'}
      />

      <StatusBadge
        variant="deployment"
        status={environment}
        label={ENVIRONMENT_LABELS[environment]}
        icon={
          environment === 'prod'
            ? '🚀'
            : environment === 'staging'
              ? '🧪'
              : '🔨'
        }
      />

      {deployed && (
        <StatusBadge
          variant="deployment"
          status="deployed"
          label="Deployed"
          icon="🟢"
        />
      )}
    </div>
  );
}

export default DeploymentStatusBadge;

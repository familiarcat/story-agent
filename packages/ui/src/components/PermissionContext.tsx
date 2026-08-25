'use client';

import React from 'react';
import { color, space } from '@/lib/tokens';
import StatusBadge from './StatusBadge';

/**
 * PermissionContext — Access level and reason display
 *
 * Shows why a user can access content (Owner, Editor, Viewer, Shared Link, etc.)
 * with detailed context and reasoning.
 *
 * @example
 * ```tsx
 * <PermissionContext
 *   accessLevel="viewer"
 *   reason="Shared via project team link"
 * />
 * ```
 */

export type AccessLevel = 'owner' | 'editor' | 'viewer' | 'shared-link' | 'team' | 'inherited';

export interface PermissionContextProps {
  /** The user's access level */
  accessLevel: AccessLevel;
  /** Explanation of why user has this access */
  reason: string;
  /** Optional expiration date */
  expiresAt?: Date;
  /** Optional granted by information */
  grantedBy?: string;
  /** Optional click handler */
  onClick?: () => void;
}

const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
  'shared-link': 'Shared Link',
  team: 'Team Member',
  inherited: 'Inherited',
};

const ACCESS_LEVEL_ICONS: Record<AccessLevel, string> = {
  owner: '👤',
  editor: '✏️',
  viewer: '👁️',
  'shared-link': '🔗',
  team: '👥',
  inherited: '⬇️',
};

export function PermissionContext({
  accessLevel,
  reason,
  expiresAt,
  grantedBy,
  onClick,
}: PermissionContextProps): React.ReactElement {
  const expirationText = expiresAt ? ` · Expires ${expiresAt.toLocaleDateString()}` : '';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: space(2),
      }}
    >
      <StatusBadge
        variant="permission"
        status={accessLevel}
        label={ACCESS_LEVEL_LABELS[accessLevel]}
        icon={ACCESS_LEVEL_ICONS[accessLevel]}
        detail={reason}
        onClick={onClick}
        ariaLabel={`Access level: ${accessLevel}`}
      />
      <div style={{ fontSize: '0.875rem', color: color.text, lineHeight: 1.5 }}>
        <p style={{ margin: 0, marginBottom: space(1) }}>{reason}</p>
        {grantedBy && (
          <p style={{ margin: 0, color: color.muted, fontSize: '0.8rem' }}>
            Granted by: {grantedBy}
            {expirationText}
          </p>
        )}
      </div>
    </div>
  );
}

export default PermissionContext;

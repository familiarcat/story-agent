import { NextApiRequest, NextApiResponse } from 'next';
import { RBACPermission } from '@story-agent/shared/pm-contracts';

export const requireRole = (requiredRole: string) => {
  return (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      const userRole = req.headers['x-user-role'] as string;

      if (!userRole || userRole !== requiredRole) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          details: `Requires role: ${requiredRole}`,
        });
      }

      return handler(req, res);
    };
  };
};

export const checkPermission = (entityType: string, field: string, action: 'read' | 'write' | 'delete') => {
  return (permissions: RBACPermission[]) => {
    const permission = permissions.find(
      (p) => p.entityType === entityType && p.field === field,
    );

    const actionKey = `can_${action}`;

    if (!permission || !permission[actionKey as keyof RBACPermission]) {
      return false;
    }

    return true;
  };
};
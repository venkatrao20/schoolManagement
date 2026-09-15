import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'STAFF' | 'FINANCE';

export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
      });
      return;
    }

    const userRole = req.user.role as UserRole;
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        error: {
          message: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]. Current role: ${userRole}`,
          code: 'FORBIDDEN',
        },
      });
      return;
    }

    next();
  };
}

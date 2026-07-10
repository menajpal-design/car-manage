import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@fleetmaster/shared';

/**
 * Middleware to restrict access to endpoints based on user roles.
 * @param allowedRoles List of roles permitted to access the route.
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized. Authentication is required.' });
    }

    if (req.user.role === UserRole.ADMIN) {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden. You do not have permission to access this resource. Required role(s): [${allowedRoles.join(', ')}]`,
      });
    }

    next();
  };
};

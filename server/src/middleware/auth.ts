import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { IJWTPayload } from '@fleetmaster/shared';
import { User } from '../models/User';

// Extend Express Request interface to include the user payload
declare global {
  namespace Express {
    interface Request {
      user?: IJWTPayload;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  // Extract token from HTTP-only cookies or Authorization header
  let token = req.cookies?.accessToken;

  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Authentication required. Access token is missing.' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'super_secret_jwt_signing_key_change_me_in_production';
    const decoded = jwt.verify(token, secret) as IJWTPayload;

    // Check database to ensure user still exists and is active
    const existingUser = await User.findById(decoded.userId);
    if (!existingUser) {
      return res.status(401).json({ message: 'The user belonging to this token no longer exists.' });
    }

    if (!existingUser.isActive) {
      return res.status(403).json({ message: 'User account is deactivated.' });
    }

    // Attach decoded user info to request
    req.user = {
      userId: existingUser.id,
      phone: existingUser.phone,
      role: existingUser.role,
      name: existingUser.name,
      companyId: existingUser.companyId.toString(),
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Authentication token has expired.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ message: 'Authentication token is invalid.' });
  }
};

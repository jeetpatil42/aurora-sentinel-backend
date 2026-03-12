import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { getUserById } from '../services/auth';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    name?: string;
    security_approved?: boolean;
  };
}

export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = (() => {
      if (!authHeader) return null;
      const trimmed = authHeader.trim();
      if (!trimmed) return null;
      const parts = trimmed.split(/\s+/);
      if (parts.length === 1) return parts[0];
      if (/^Bearer$/i.test(parts[0]) && parts[1]) return parts[1];
      return parts[parts.length - 1];
    })();

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const payload = verifyAccessToken(token);
    
    // Verify user still exists
    const user = await getUserById(payload.userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    if (user.role === 'security' && !user.security_approved) {
      res.status(403).json({ error: 'Security account pending admin approval' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      security_approved: user.security_approved,
    };

    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

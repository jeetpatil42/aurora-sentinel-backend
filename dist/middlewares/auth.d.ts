import { Request, Response, NextFunction } from 'express';
import type { AuthenticatedUser } from '../types/express';
export interface AuthRequest extends Request {
    user?: AuthenticatedUser;
}
export declare function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function requireRole(roles: string[]): (req: AuthRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map
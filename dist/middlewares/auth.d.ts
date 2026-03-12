import { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
        name?: string;
        security_approved?: boolean;
    };
}
export declare function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function requireRole(roles: string[]): (req: AuthRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map
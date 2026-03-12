import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
export declare const listSecurityUsers: (req: AuthRequest, res: Response) => Promise<void>;
export declare const approveSecurityUser: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteSecurityUser: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=admin.controller.d.ts.map
import { Request, Response } from 'express';
export declare const register: (import("express-validator").ValidationChain | ((req: Request, res: Response) => Promise<void>))[];
export declare const verify: (import("express-validator").ValidationChain | ((req: Request, res: Response) => Promise<void>))[];
export declare const createLocalUser: (import("express-validator").ValidationChain | ((req: Request, res: Response) => Promise<void>))[];
export declare const login: (import("express-validator").ValidationChain | ((req: Request, res: Response) => Promise<void>))[];
export declare const me: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=auth.controller.d.ts.map
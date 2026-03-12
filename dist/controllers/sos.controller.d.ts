import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
export declare const createSOS: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getRecentSOSChat: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getSOSChatById: (req: AuthRequest, res: Response) => Promise<void>;
export declare const sendSOSChatMessage: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getSOS: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getSOSById: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateStatus: (req: AuthRequest, res: Response) => Promise<void>;
export declare const clearHistory: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * GET /api/sos/:id/events
 * Returns all events for a specific SOS
 */
export declare const getSOSEventHistoryController: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=sos.controller.d.ts.map
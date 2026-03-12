import { Server, Socket } from 'socket.io';
export interface AuthenticatedSocket extends Socket {
    userId?: string;
    userRole?: string;
}
export declare function setupSocketHandlers(io: Server): void;
//# sourceMappingURL=handlers.d.ts.map
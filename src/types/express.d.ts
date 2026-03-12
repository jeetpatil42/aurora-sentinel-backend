import type { Server as SocketIOServer } from 'socket.io';
import type { BeaconDevice } from '../services/beacons';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  name?: string;
  security_approved?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      beacon?: BeaconDevice;
      io?: SocketIOServer;
    }
  }
}

export {};


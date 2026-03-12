import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.routes';
import sosRoutes from './routes/sos.routes';
import presentationRoutes from './routes/presentation.routes';
import riskZonesRoutes from './routes/risk-zones.routes';
import analyticsRoutes from './routes/analytics.routes';
import adminRoutes from './routes/admin.routes';
import beaconRoutes from './routes/beacon.routes';
import { setupSocketHandlers } from './sockets/handlers';

dotenv.config();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowVercelPreviews = process.env.CORS_ALLOW_VERCEL_PREVIEWS === 'true';
const uploadDir = process.env.UPLOAD_DIR || './uploads';

function isAllowedOrigin(origin: string): boolean {
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  if (allowVercelPreviews && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) {
    return true;
  }

  return false;
}

const corsOrigin: cors.CorsOptions['origin'] = (origin, callback) => {
  if (!origin || isAllowedOrigin(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`CORS blocked for origin: ${origin}`));
};

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    credentials: true,
  },
});

const PORT = Number(process.env.PORT || 3001);
const resolvedUploadDir = path.resolve(uploadDir);

fs.mkdirSync(resolvedUploadDir, { recursive: true });
app.set('trust proxy', 1);

app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(resolvedUploadDir));

app.use((req: Request, _res: Response, next: NextFunction) => {
  req.io = io;
  next();
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/beacon', beaconRoutes);
app.use('/api/presentation', presentationRoutes);
app.use('/api/risk-zones', riskZonesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

setupSocketHandlers(io);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Aurora Sentinel Backend running on port ${PORT}`);
  console.log('WebSocket server ready');
  console.log(`CORS enabled for: ${allowedOrigins.join(', ')}`);
  console.log(`Uploads directory: ${resolvedUploadDir}`);
});


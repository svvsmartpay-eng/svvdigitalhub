import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { env } from './config/env';
import { logger } from './config/logger';
import { errorHandler } from './middleware/error.middleware';
import { requestId } from './middleware/requestId.middleware';
import router from './routes';

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Body parsing
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) },
}));

// Request ID
app.use(requestId);

// Static files (uploads) with CORS enabled
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const candidateUploadDirs = [
  path.join(process.cwd(), 'apps', 'api', 'uploads'),
  path.join(process.cwd(), 'uploads'),
  path.join(__dirname, '..', 'uploads'),
  path.join(__dirname, '..', '..', 'uploads'),
];

candidateUploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}
  }
  const waDir = path.join(dir, 'whatsapp');
  if (!fs.existsSync(waDir)) {
    try { fs.mkdirSync(waDir, { recursive: true }); } catch (_) {}
  }
  app.use('/uploads', express.static(dir));
});

// Routes
app.use(env.API_PREFIX, router);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'svv-ams-api' });
});

// Error handler
app.use(errorHandler);

import { autoResumeAllActiveBranchSessions } from './modules/print-hub/whatsappGateway.service';

const PORT = env.PORT;
app.listen(PORT, () => {
  logger.info(`SVV AMS API running on port ${PORT} [${env.NODE_ENV}]`);
  autoResumeAllActiveBranchSessions().catch((err) => {
    logger.error('Failed to auto-resume WhatsApp sessions', err);
  });
});

export default app;

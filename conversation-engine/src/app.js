import express from 'express';
import cors from 'cors';
import conversationRoutes from './routes/conversation.routes.js';
import { logger } from './config/logger.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - start,
    }, 'request');
  });
  next();
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'conversation-engine' }));

// Conversation routes
app.use('/api/conversation', conversationRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, _next) => {
  logger.error({ err, path: req.path }, 'unhandled error');
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV !== 'production' ? err.message : undefined,
  });
});

export default app;

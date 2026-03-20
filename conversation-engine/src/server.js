import app from './app.js';
import { config } from './config/index.js';
import { logger } from './config/logger.js';
import { connectRedis } from './config/redis.js';
import { pool } from './config/db.js';

async function start() {
  // Connect Redis
  try {
    await connectRedis();
  } catch (err) {
    logger.warn({ err: err.message }, 'Redis connection failed — context manager will error');
  }

  // Verify database
  try {
    const result = await pool.query('SELECT 1');
    logger.info('Database connected');
  } catch (err) {
    logger.error({ err: err.message }, 'Database connection failed');
    process.exit(1);
  }

  // Start server
  app.listen(config.port, () => {
    logger.info({ port: config.port }, 'Conversation engine started');
  });
}

start().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});

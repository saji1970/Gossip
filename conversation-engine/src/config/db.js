import pg from 'pg';
import { config } from './index.js';
import { logger } from './logger.js';

const pool = new pg.Pool({ connectionString: config.databaseUrl });

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected database pool error');
});

export async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  logger.debug({ text: text.slice(0, 80), duration, rows: result.rowCount }, 'db query');
  return result;
}

export async function getClient() {
  return pool.connect();
}

export async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export { pool };

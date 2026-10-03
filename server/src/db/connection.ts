import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });   // local dev (CWD = server/)
dotenv.config({ path: '.env' });      // Docker or project root CWD

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

const { Pool } = pg;

let pool: pg.Pool;

export const getDb = () => {
  if (!pool) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return drizzle(pool, { schema });
};

export async function connectDB(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set in environment variables');
    process.exit(1);
  }

  try {
    pool = new Pool({ connectionString });

    // Test the connection
    const client = await pool.connect();
    client.release();
    console.log('[DB] Connected to PostgreSQL');
  } catch (error) {
    console.error('[DB] Connection failed:', error);
    process.exit(1);
  }

  pool.on('error', (err) => {
    console.error('[DB] Pool error:', err);
  });
}

/**
 * Initialize tables by running CREATE TABLE IF NOT EXISTS.
 * This replaces Mongoose's auto-schema creation.
 */
export async function initTables(): Promise<void> {
  if (!pool) throw new Error('Database not connected');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      phone VARCHAR(20) UNIQUE NOT NULL,
      name VARCHAR(255) DEFAULT '',
      balance NUMERIC(12,2) NOT NULL DEFAULT 10000,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      tx_id VARCHAR(64) UNIQUE NOT NULL,
      sender VARCHAR(20) NOT NULL,
      receiver VARCHAR(20) NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'completed',
      time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      fraud_score NUMERIC(5,4),
      fraud_decision VARCHAR(20),
      ojuri_audit_id VARCHAR(255),
      reason_codes JSONB,
      model_version VARCHAR(100)
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_sender_time ON transactions(sender, time DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_receiver_time ON transactions(receiver, time DESC);

    CREATE TABLE IF NOT EXISTS tickets (
      id SERIAL PRIMARY KEY,
      token VARCHAR(20) UNIQUE NOT NULL,
      phone VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'open',
      category VARCHAR(50) NOT NULL DEFAULT 'general',
      messages JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_phone ON tickets(phone);

    CREATE TABLE IF NOT EXISTS counters (
      name VARCHAR(50) PRIMARY KEY,
      value INTEGER NOT NULL DEFAULT 0
    );
  `);
  console.log('[DB] Tables initialized');
}

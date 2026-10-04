import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { connectDB, initTables } from '../server/src/db/connection';
import authRoutes from '../server/src/routes/auth';
import transactionRoutes from '../server/src/routes/transactions';
import ticketRoutes from '../server/src/routes/tickets';
import ojuriWebhookRoutes from '../server/src/routes/ojuri-webhooks';
import fraudRulesRoutes from '../server/src/routes/fraud-rules';
import fraudModelsRoutes from '../server/src/routes/fraud-models';
import fraudAuditRoutes from '../server/src/routes/fraud-audit';
import fraudTrainingRoutes from '../server/src/routes/fraud-training';
import { checkOjuriHealth } from '../server/src/services/ojuri';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Lazy DB initialization (connection pooling for serverless) ──
let dbInitialized = false;
async function ensureDB() {
  if (!dbInitialized) {
    await connectDB();
    await initTables();
    dbInitialized = true;
  }
}

app.use(async (_req, _res, next) => {
  try {
    await ensureDB();
    next();
  } catch (error) {
    console.error('[DB] Initialization error:', error);
    next(error);
  }
});

// ── Core Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/tickets', ticketRoutes);

// ── Ojuri Integration Routes ──
app.use('/api/ojuri/webhooks', ojuriWebhookRoutes);
app.use('/api/fraud/rules', fraudRulesRoutes);
app.use('/api/fraud/models', fraudModelsRoutes);
app.use('/api/fraud/audit', fraudAuditRoutes);
app.use('/api/fraud/training', fraudTrainingRoutes);

// Health check (includes Ojuri status)
app.get('/api/health', async (_req, res) => {
  const ojuriHealthy = await checkOjuriHealth();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ojuri: {
      enabled: process.env.OJURI_ENABLED === 'true',
      healthy: ojuriHealthy,
    },
  });
});

// Export the Express app for Vercel serverless
export default app;

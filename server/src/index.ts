import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });   // local dev (CWD = server/)
dotenv.config({ path: '.env' });      // Docker or project root CWD

import express from 'express';
import cors from 'cors';
import { connectDB, initTables } from './db/connection';
import authRoutes from './routes/auth';
import transactionRoutes from './routes/transactions';
import ticketRoutes from './routes/tickets';
import ojuriWebhookRoutes from './routes/ojuri-webhooks';
import fraudRulesRoutes from './routes/fraud-rules';
import fraudModelsRoutes from './routes/fraud-models';
import fraudAuditRoutes from './routes/fraud-audit';
import fraudTrainingRoutes from './routes/fraud-training';
import { checkOjuriHealth } from './services/ojuri';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
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

// ── Serve built client in production ──
import path from 'path';
import fs from 'fs';
const clientDir = path.join(__dirname, '..', 'public');
if (fs.existsSync(clientDir)) {
  app.use(express.static(clientDir));
  // SPA fallback — serve index.html for non-API routes
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDir, 'index.html'));
  });
  console.log('[Server] Serving static client from', clientDir);
}

// Start
async function start() {
  await connectDB();
  await initTables();
  app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
    console.log(`[Server] LLM provider: ${process.env.LLM_PROVIDER || 'groq'}`);
    console.log(`[Server] Ojuri: ${process.env.OJURI_ENABLED === 'true' ? 'ENABLED' : 'DISABLED'}`);
  });
}

start().catch((error) => {
  console.error('[Server] Failed to start:', error);
  process.exit(1);
});

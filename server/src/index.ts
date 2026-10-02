import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import express from 'express';
import cors from 'cors';
import { connectDB } from './db/connection';
import authRoutes from './routes/auth';
import transactionRoutes from './routes/transactions';
import ticketRoutes from './routes/tickets';

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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/tickets', ticketRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start
async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
    console.log(`[Server] LLM provider: ${process.env.LLM_PROVIDER || 'groq'}`);
  });
}

start().catch((error) => {
  console.error('[Server] Failed to start:', error);
  process.exit(1);
});

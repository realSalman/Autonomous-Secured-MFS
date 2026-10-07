import type { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from 'dotenv';
dotenv.config();

import { connectDB, initTables, getDb } from '../server/src/db/connection';
import { users, transactions, tickets, counters } from '../server/src/db/schema';
import fs from 'fs';
import path from 'path';

/**
 * POST /api/seed
 * Seeds the database with sample data.
 * Protected by SEED_SECRET env var in production.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Protect seeding in production
  const seedSecret = process.env.SEED_SECRET;
  if (seedSecret && req.body?.secret !== seedSecret) {
    return res.status(403).json({ error: 'Invalid seed secret' });
  }

  try {
    await connectDB();
    await initTables();

    const db = getDb();
    console.log('[Seed] Clearing existing data...');

    await db.delete(tickets);
    await db.delete(transactions);
    await db.delete(users);
    await db.delete(counters);

    // ── Users ──
    console.log('[Seed] Creating users...');
    const usersPath = path.join(__dirname, '../server/data/users.json');
    const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    const insertedUsers = await db.insert(users).values(usersData).returning();

    // ── Transactions ──
    console.log('[Seed] Creating transactions...');
    const now = new Date();
    
    const txPath = path.join(__dirname, '../server/data/transactions.json');
    const txDataRaw = JSON.parse(fs.readFileSync(txPath, 'utf8'));
    const txData = txDataRaw.map((tx: any) => ({
      txId: tx.txId,
      sender: tx.sender,
      receiver: tx.receiver,
      amount: tx.amount,
      status: tx.status,
      time: new Date(now.getTime() + (tx.timeOffsetMinutes * 60000))
    }));

    const insertedTx = await db.insert(transactions).values(txData).returning();

    // ── Tickets ──
    console.log('[Seed] Creating tickets...');
    await db.insert(counters).values({ name: 'ticket', value: 6 });

    const ticketsPath = path.join(__dirname, '../server/data/tickets.json');
    const ticketsDataRaw = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
    const ticketsData = ticketsDataRaw.map((t: any) => ({
      token: t.token,
      phone: t.phone,
      status: t.status,
      category: t.category,
      createdAt: new Date(now.getTime() + (t.timeOffsetMinutes * 60000)),
      updatedAt: new Date(now.getTime() + (t.updatedOffsetMinutes * 60000)),
      messages: t.messages.map((m: any) => ({
        role: m.role,
        content: m.content,
        timestamp: new Date(now.getTime() + (m.timeOffsetMinutes * 60000))
      }))
    }));

    const insertedTickets = await db.insert(tickets).values(ticketsData).returning();

    return res.json({
      success: true,
      seeded: {
        users: insertedUsers.length,
        transactions: insertedTx.length,
        tickets: insertedTickets.length,
      },
    });
  } catch (error) {
    console.error('[Seed] Error:', error);
    return res.status(500).json({
      error: 'Seed failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

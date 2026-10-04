import type { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from 'dotenv';
dotenv.config();

import { connectDB, initTables, getDb } from '../server/src/db/connection';
import { users, transactions, tickets, counters } from '../server/src/db/schema';

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
    const insertedUsers = await db.insert(users).values([
      { phone: '01712345678', name: 'Rahim Ahmed', balance: '15000' },
      { phone: '01812345678', name: 'Karim Hassan', balance: '8500' },
      { phone: '01912345678', name: 'Fatima Khan', balance: '22000' },
      { phone: '01612345678', name: 'Nusrat Jahan', balance: '5200' },
      { phone: '01512345678', name: 'Tanvir Rahman', balance: '31000' },
      { phone: '01412345678', name: 'Ayesha Siddiqui', balance: '12700' },
      { phone: '01312345678', name: 'Imran Hossain', balance: '900' },
      { phone: '01112345678', name: 'Sabrina Akter', balance: '44000' },
    ]).returning();

    // ── Transactions ──
    console.log('[Seed] Creating transactions...');
    const now = new Date();
    const hour = 3600000;

    const insertedTx = await db.insert(transactions).values([
      {
        txId: 'TX-1001',
        sender: '01712345678',
        receiver: '01812345678',
        amount: '2500',
        status: 'completed',
        time: new Date(now.getTime() - 2 * hour),
      },
      {
        txId: 'TX-1002',
        sender: '01912345678',
        receiver: '01712345678',
        amount: '5000',
        status: 'completed',
        time: new Date(now.getTime() - 5 * hour),
      },
      {
        txId: 'TX-1003',
        sender: '01712345678',
        receiver: '01612345678',
        amount: '1000',
        status: 'completed',
        time: new Date(now.getTime() - 8 * hour),
      },
      {
        txId: 'TX-1004',
        sender: '01512345678',
        receiver: '01412345678',
        amount: '7500',
        status: 'completed',
        time: new Date(now.getTime() - 12 * hour),
      },
      {
        txId: 'TX-1005',
        sender: '01312345678',
        receiver: '01812345678',
        amount: '3000',
        status: 'failed',
        time: new Date(now.getTime() - 1 * hour),
      },
      {
        txId: 'TX-1006',
        sender: '01812345678',
        receiver: '01112345678',
        amount: '1500',
        status: 'completed',
        time: new Date(now.getTime() - 3 * hour),
      },
      {
        txId: 'TX-1007',
        sender: '01612345678',
        receiver: '01912345678',
        amount: '800',
        status: 'completed',
        time: new Date(now.getTime() - 24 * hour),
      },
    ]).returning();

    // ── Tickets ──
    console.log('[Seed] Creating tickets...');
    await db.insert(counters).values({ name: 'ticket', value: 3 });

    const insertedTickets = await db.insert(tickets).values([
      {
        token: 'TKT-0001',
        phone: '01712345678',
        status: 'open',
        category: 'payment_failure',
        messages: [
          {
            role: 'customer',
            content: 'I tried to send money to 01612345678 but the transaction failed. The money was deducted from my account but the receiver says they didn\'t get it.',
            timestamp: new Date(now.getTime() - 45 * 60000),
          },
          {
            role: 'ai',
            content: 'I can see you have a recent transaction (TX-1003) to 01612345678 for ৳1,000 that shows as completed. Could you provide more details about when this happened? If this is a different transaction, I\'ll look into it further. Failed transactions typically auto-reverse within 24-72 hours.',
            timestamp: new Date(now.getTime() - 44 * 60000),
          },
          {
            role: 'customer',
            content: 'It happened about 30 minutes ago. I sent ৳3000 but it is not showing in my history.',
            timestamp: new Date(now.getTime() - 30 * 60000),
          },
        ],
        createdAt: new Date(now.getTime() - 45 * 60000),
        updatedAt: new Date(now.getTime() - 30 * 60000),
      },
      {
        token: 'TKT-0002',
        phone: '01312345678',
        status: 'open',
        category: 'payment_failure',
        messages: [
          {
            role: 'customer',
            content: 'My transaction TX-1005 failed but the money was deducted. I only have ৳900 left. Please help!',
            timestamp: new Date(now.getTime() - 20 * 60000),
          },
          {
            role: 'ai',
            content: 'I can see your transaction TX-1005 for ৳3,000 to 01812345678 has a "failed" status. Your current balance is ৳900. For failed transactions, the amount is typically auto-reversed within 24-72 hours. I\'m flagging this for priority review. Is there anything else I can help with?',
            timestamp: new Date(now.getTime() - 19 * 60000),
          },
        ],
        createdAt: new Date(now.getTime() - 20 * 60000),
        updatedAt: new Date(now.getTime() - 19 * 60000),
      },
      {
        token: 'TKT-0003',
        phone: '01812345678',
        status: 'in_progress',
        category: 'wrong_recipient',
        messages: [
          {
            role: 'customer',
            content: 'I sent ৳1500 to 01112345678 but I meant to send it to 01912345678. Can you reverse it?',
            timestamp: new Date(now.getTime() - 3 * hour),
          },
          {
            role: 'ai',
            content: 'I can see your transaction TX-1006 for ৳1,500 sent to 01112345678. I understand you meant to send it to 01912345678. I\'ll initiate a reversal request. This typically takes 24-48 hours. Could you confirm the correct recipient number one more time?',
            timestamp: new Date(now.getTime() - 3 * hour + 60000),
          },
          {
            role: 'customer',
            content: 'Yes, it should have gone to 01912345678. Please reverse it.',
            timestamp: new Date(now.getTime() - 2.5 * hour),
          },
          {
            role: 'agent',
            content: 'Hi Karim, I\'ve reviewed your case and submitted a reversal request for TX-1006 (৳1,500). The reversal should be processed within 24-48 hours. I\'ll update you once it\'s confirmed. Your reference number is TKT-0003.',
            timestamp: new Date(now.getTime() - 2 * hour),
          },
        ],
        createdAt: new Date(now.getTime() - 3 * hour),
        updatedAt: new Date(now.getTime() - 2 * hour),
      },
    ]).returning();

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

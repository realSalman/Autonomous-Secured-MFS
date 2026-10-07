import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });   // local dev (CWD = server/)
dotenv.config({ path: '.env' });      // Docker or project root CWD

import { connectDB, initTables, getDb } from './connection';
import { users, transactions, tickets, counters } from './schema';
import fs from 'fs';
import path from 'path';

async function seed() {
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
  const usersPath = path.join(__dirname, '../../data/users.json');
  const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
  const insertedUsers = await db.insert(users).values(usersData).returning();
  console.log(`[Seed] Created ${insertedUsers.length} users`);

  // ── Transactions ──
  console.log('[Seed] Creating transactions...');
  const now = new Date();
  
  const txPath = path.join(__dirname, '../../data/transactions.json');
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
  console.log(`[Seed] Created ${insertedTx.length} transactions`);

  // ── Tickets ──
  console.log('[Seed] Creating tickets...');
  await db.insert(counters).values({ name: 'ticket', value: 6 });

  const ticketsPath = path.join(__dirname, '../../data/tickets.json');
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
  console.log(`[Seed] Created ${insertedTickets.length} tickets`);

  console.log('[Seed] ✓ Database seeded successfully');
  process.exit(0);
}

seed().catch((error) => {
  console.error('[Seed] Fatal error:', error);
  process.exit(1);
});

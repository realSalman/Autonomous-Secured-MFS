import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import { connectDB } from './connection';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { Ticket } from '../models/Ticket';
import { Counter } from '../models/Counter';

async function seed() {
  await connectDB();
  console.log('[Seed] Clearing existing data...');

  await Promise.all([
    User.deleteMany({}),
    Transaction.deleteMany({}),
    Ticket.deleteMany({}),
    Counter.deleteMany({}),
  ]);

  // ── Users ──
  console.log('[Seed] Creating users...');
  const users = await User.insertMany([
    { phone: '01712345678', name: 'Rahim Ahmed', balance: 15000 },
    { phone: '01812345678', name: 'Karim Hassan', balance: 8500 },
    { phone: '01912345678', name: 'Fatima Khan', balance: 22000 },
    { phone: '01612345678', name: 'Nusrat Jahan', balance: 5200 },
    { phone: '01512345678', name: 'Tanvir Rahman', balance: 31000 },
    { phone: '01412345678', name: 'Ayesha Siddiqui', balance: 12700 },
    { phone: '01312345678', name: 'Imran Hossain', balance: 900 },
    { phone: '01112345678', name: 'Sabrina Akter', balance: 44000 },
  ]);
  console.log(`[Seed] Created ${users.length} users`);

  // ── Transactions ──
  console.log('[Seed] Creating transactions...');
  const now = new Date();
  const hour = 3600000;

  const transactions = await Transaction.insertMany([
    {
      tx_id: 'TX-1001',
      sender: '01712345678',
      receiver: '01812345678',
      amount: 2500,
      status: 'completed',
      time: new Date(now.getTime() - 2 * hour),
    },
    {
      tx_id: 'TX-1002',
      sender: '01912345678',
      receiver: '01712345678',
      amount: 5000,
      status: 'completed',
      time: new Date(now.getTime() - 5 * hour),
    },
    {
      tx_id: 'TX-1003',
      sender: '01712345678',
      receiver: '01612345678',
      amount: 1000,
      status: 'completed',
      time: new Date(now.getTime() - 8 * hour),
    },
    {
      tx_id: 'TX-1004',
      sender: '01512345678',
      receiver: '01412345678',
      amount: 7500,
      status: 'completed',
      time: new Date(now.getTime() - 12 * hour),
    },
    {
      tx_id: 'TX-1005',
      sender: '01312345678',
      receiver: '01812345678',
      amount: 3000,
      status: 'failed',
      time: new Date(now.getTime() - 1 * hour),
    },
    {
      tx_id: 'TX-1006',
      sender: '01812345678',
      receiver: '01112345678',
      amount: 1500,
      status: 'completed',
      time: new Date(now.getTime() - 3 * hour),
    },
    {
      tx_id: 'TX-1007',
      sender: '01612345678',
      receiver: '01912345678',
      amount: 800,
      status: 'completed',
      time: new Date(now.getTime() - 24 * hour),
    },
  ]);
  console.log(`[Seed] Created ${transactions.length} transactions`);

  // ── Tickets ──
  console.log('[Seed] Creating tickets...');

  await Counter.create({ name: 'ticket', value: 3 });

  const tickets = await Ticket.insertMany([
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
  ]);
  console.log(`[Seed] Created ${tickets.length} tickets`);

  console.log('[Seed] ✓ Database seeded successfully');
  process.exit(0);
}

seed().catch((error) => {
  console.error('[Seed] Fatal error:', error);
  process.exit(1);
});

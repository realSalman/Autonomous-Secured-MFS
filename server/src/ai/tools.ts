import { getDb } from '../db/connection';
import { users, transactions } from '../db/schema';
import { eq, or, desc, sql } from 'drizzle-orm';
import { IUser, ITransaction } from '../types/index';

/**
 * Retrieval tools that the LangGraph agent uses to gather context
 * from the database before generating a response.
 */

export async function getUserInfo(phone: string): Promise<IUser | null> {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.phone, phone));
  if (!user) return null;
  return {
    phone: user.phone,
    name: user.name || '',
    balance: Number(user.balance),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function getRecentTransactions(
  phone: string,
  limit: number = 10
): Promise<ITransaction[]> {
  const db = getDb();
  const txList = await db.select().from(transactions)
    .where(or(eq(transactions.sender, phone), eq(transactions.receiver, phone)))
    .orderBy(desc(transactions.time))
    .limit(limit);

  return txList.map((tx) => ({
    tx_id: tx.txId,
    time: tx.time,
    sender: tx.sender,
    receiver: tx.receiver,
    amount: Number(tx.amount),
    status: tx.status as ITransaction['status'],
  }));
}

export async function checkTransactionById(
  txId: string
): Promise<ITransaction | null> {
  const db = getDb();
  const [tx] = await db.select().from(transactions).where(eq(transactions.txId, txId));
  if (!tx) return null;
  return {
    tx_id: tx.txId,
    time: tx.time,
    sender: tx.sender,
    receiver: tx.receiver,
    amount: Number(tx.amount),
    status: tx.status as ITransaction['status'],
  };
}

/**
 * Get fraud status context for a user's flagged/blocked transactions.
 * Used by the LangGraph agent when handling fraud_inquiry intents.
 */
export async function getFraudStatus(phone: string): Promise<string | null> {
  const db = getDb();

  // Find transactions with fraud decisions for this user
  const flaggedTx = await db.select().from(transactions)
    .where(
      sql`(${transactions.sender} = ${phone} OR ${transactions.receiver} = ${phone})
          AND ${transactions.fraudDecision} IS NOT NULL
          AND ${transactions.fraudDecision} != 'ACCEPT'`
    )
    .orderBy(desc(transactions.time))
    .limit(5);

  if (flaggedTx.length === 0) return null;

  const lines = flaggedTx.map(tx => {
    const reasons = (tx.reasonCodes as Array<{ description: string }>) || [];
    const reasonText = reasons.map(r => r.description).join(', ') || 'No details available';
    return `• ${tx.txId}: ৳${Number(tx.amount).toLocaleString()} to ${tx.receiver} — ${tx.fraudDecision} (Reasons: ${reasonText})`;
  });

  return `Flagged/blocked transactions for ${phone}:\n${lines.join('\n')}`;
}


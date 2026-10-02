import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { IUser, ITransaction } from '../types/index';

/**
 * Retrieval tools that the LangGraph agent uses to gather context
 * from the database before generating a response.
 */

export async function getUserInfo(phone: string): Promise<IUser | null> {
  const user = await User.findOne({ phone }).lean();
  if (!user) return null;
  return {
    phone: user.phone,
    name: user.name,
    balance: user.balance,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function getRecentTransactions(
  phone: string,
  limit: number = 10
): Promise<ITransaction[]> {
  const transactions = await Transaction.find({
    $or: [{ sender: phone }, { receiver: phone }],
  })
    .sort({ time: -1 })
    .limit(limit)
    .lean();

  return transactions.map((tx) => ({
    tx_id: tx.tx_id,
    time: tx.time,
    sender: tx.sender,
    receiver: tx.receiver,
    amount: tx.amount,
    status: tx.status,
  }));
}

export async function checkTransactionById(
  txId: string
): Promise<ITransaction | null> {
  const tx = await Transaction.findOne({ tx_id: txId }).lean();
  if (!tx) return null;
  return {
    tx_id: tx.tx_id,
    time: tx.time,
    sender: tx.sender,
    receiver: tx.receiver,
    amount: tx.amount,
    status: tx.status,
  };
}

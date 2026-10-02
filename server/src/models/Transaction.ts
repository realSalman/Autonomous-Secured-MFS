import mongoose, { Schema, Document } from 'mongoose';
import { ITransaction } from '../types/index';

export interface TransactionDocument extends ITransaction, Document {}

const transactionSchema = new Schema<TransactionDocument>({
  tx_id: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  time: {
    type: Date,
    default: Date.now,
  },
  sender: {
    type: String,
    required: true,
    index: true,
  },
  receiver: {
    type: String,
    required: true,
    index: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 1,
  },
  status: {
    type: String,
    enum: ['completed', 'failed', 'pending'],
    default: 'completed',
  },
});

// Index for querying by sender or receiver
transactionSchema.index({ sender: 1, time: -1 });
transactionSchema.index({ receiver: 1, time: -1 });

export const Transaction = mongoose.model<TransactionDocument>('Transaction', transactionSchema);

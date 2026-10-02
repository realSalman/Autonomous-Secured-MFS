import mongoose, { Schema, Document } from 'mongoose';
import { ICounter } from '../types/index';

export interface CounterDocument extends ICounter, Document {}

const counterSchema = new Schema<CounterDocument>({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  value: {
    type: Number,
    default: 0,
  },
});

export const Counter = mongoose.model<CounterDocument>('Counter', counterSchema);

/**
 * Get next sequential ticket token.
 * Atomically increments and returns formatted token like TKT-0001.
 */
export async function getNextTicketToken(): Promise<string> {
  const counter = await Counter.findOneAndUpdate(
    { name: 'ticket' },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  const num = counter.value.toString().padStart(4, '0');
  return `TKT-${num}`;
}

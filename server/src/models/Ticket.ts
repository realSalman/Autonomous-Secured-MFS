import mongoose, { Schema, Document } from 'mongoose';
import { ITicket, IMessage } from '../types/index';

export interface TicketDocument extends ITicket, Document {}

const messageSchema = new Schema<IMessage>(
  {
    role: {
      type: String,
      enum: ['customer', 'agent', 'ai'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ticketSchema = new Schema<TicketDocument>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved'],
      default: 'open',
    },
    category: {
      type: String,
      default: 'general',
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const Ticket = mongoose.model<TicketDocument>('Ticket', ticketSchema);

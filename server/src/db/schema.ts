import {
  pgTable,
  serial,
  varchar,
  numeric,
  timestamp,
  integer,
  jsonb,
} from 'drizzle-orm/pg-core';

// ── Users ──

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  phone: varchar('phone', { length: 20 }).unique().notNull(),
  name: varchar('name', { length: 255 }).default(''),
  balance: numeric('balance', { precision: 12, scale: 2 }).default('10000').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Transactions ──

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  txId: varchar('tx_id', { length: 64 }).unique().notNull(),
  sender: varchar('sender', { length: 20 }).notNull(),
  receiver: varchar('receiver', { length: 20 }).notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  status: varchar('status', { length: 20 }).default('completed').notNull(),
  time: timestamp('time', { withTimezone: true }).defaultNow().notNull(),
  // Fraud fields — populated after Ojuri scoring
  fraudScore: numeric('fraud_score', { precision: 5, scale: 4 }),
  fraudDecision: varchar('fraud_decision', { length: 20 }),
  ojuriAuditId: varchar('ojuri_audit_id', { length: 255 }),
  reasonCodes: jsonb('reason_codes'),
  modelVersion: varchar('model_version', { length: 100 }),
});

// ── Tickets ──

export const tickets = pgTable('tickets', {
  id: serial('id').primaryKey(),
  token: varchar('token', { length: 20 }).unique().notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).default('open').notNull(),
  category: varchar('category', { length: 50 }).default('general').notNull(),
  messages: jsonb('messages').default([]).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Counters ──

export const counters = pgTable('counters', {
  name: varchar('name', { length: 50 }).primaryKey(),
  value: integer('value').default(0).notNull(),
});

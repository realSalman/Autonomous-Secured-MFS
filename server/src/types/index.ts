// ── Shared server types ──

export interface IUser {
  phone: string;
  name: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITransaction {
  tx_id: string;
  time: Date;
  sender: string;
  receiver: string;
  amount: number;
  status: 'completed' | 'failed' | 'pending' | 'blocked';
}

export interface IMessage {
  role: 'customer' | 'agent' | 'ai';
  content: string;
  timestamp: Date;
}

export interface ITicket {
  token: string;
  phone: string;
  status: 'open' | 'in_progress' | 'resolved';
  category: string;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ICounter {
  name: string;
  value: number;
}

// ── Fraud types (Ojuri integration) ──

export interface FraudDecision {
  decision: 'ACCEPT' | 'REVIEW' | 'DECLINE';
  fraud_probability: number | null;
  reason_codes: ReasonCode[];
  model_version: string | null;
  audit_id: string | null;
  degraded: boolean;
}

export interface ReasonCode {
  code: string;
  description: string;
  contribution: number;
}

// AI graph state
export interface SupportGraphInput {
  phone: string;
  message: string;
  conversationHistory: IMessage[];
}

export interface SupportGraphOutput {
  intent: string;
  suggestedReply: string;
  actions: string[];
  context: {
    userInfo: IUser | null;
    recentTransactions: ITransaction[];
    knowledgeArticles: KnowledgeArticle[];
  };
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  content: string;
  actions: string[];
}


// ── Client-side type definitions ──

export interface User {
  phone: string;
  name: string;
  balance: number;
  createdAt: string;
}

export interface Transaction {
  tx_id: string;
  time: string;
  sender: string;
  receiver: string;
  amount: number;
  status: 'completed' | 'failed' | 'pending' | 'blocked';
  fraud_score?: number | null;
  fraud_decision?: string | null;
}

export interface Message {
  role: 'customer' | 'agent' | 'ai';
  content: string;
  timestamp: string;
}

export interface Ticket {
  _id: string;
  token: string;
  phone: string;
  status: 'open' | 'in_progress' | 'resolved';
  category: string;
  messages: Message[];
  user?: User | null;
  createdAt: string;
  updatedAt: string;
}

export interface SendMoneyResult {
  tx_id: string;
  amount: number;
  receiver: string;
  status: string;
  time: string;
  newBalance?: number;
  fraud_score?: number;
  fraud_decision?: string;
  flagged_for_review?: boolean;
}

// ── Fraud types ──

export interface FraudAuditEntry {
  tx_id: string;
  sender: string;
  receiver: string;
  amount: number;
  time: string;
  fraud_score: number | null;
  fraud_decision: string;
  reason_codes: ReasonCode[] | null;
  model_version: string | null;
  ojuri_audit_id: string | null;
}

export interface ReasonCode {
  code: string;
  description: string;
  contribution: number;
}

export interface FraudStats {
  totalScored: number;
  accepted: number;
  review: number;
  blocked: number;
  fraudRate: string;
  amountSaved: number;
}

export interface FraudRule {
  id: string;
  name: string;
  stage: 'PRE' | 'POST';
  action: 'ALLOW' | 'DENY' | 'REVIEW';
  priority: number;
  expression: unknown;
  active: boolean;
  createdAt?: string;
}

export interface ModelVersion {
  version: string;
  status: 'CANDIDATE' | 'SHADOW' | 'ACTIVE' | 'RETIRED';
  sourceUri: string;
  defaultThreshold?: number;
  metrics?: Record<string, number>;
  createdAt?: string;
}

export interface AISuggestion {
  suggestion: string;
  intent: string;
  actions: string[];
  context: {
    userInfo: User | null;
    recentTransactions: Transaction[];
    knowledgeArticles: Array<{
      id: string;
      title: string;
      category: string;
      content: string;
    }>;
  };
}

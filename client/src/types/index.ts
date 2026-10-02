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
  status: 'completed' | 'failed' | 'pending';
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

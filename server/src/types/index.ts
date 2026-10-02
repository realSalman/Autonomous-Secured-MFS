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
  status: 'completed' | 'failed' | 'pending';
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

import type { Ticket, Transaction } from '../../types/index';

export interface PriorityInfo {
  level: 'urgent' | 'high' | 'normal' | 'low';
  label: string;
  badgeClass: string;
}

export interface AIEvaluation {
  recommendation: 'Human Review' | 'Auto-Guidance' | 'Escalate' | 'Request Info';
  badgeClass: string;
  confidence: number;
  reasoning: string[];
  suggestedAction: string;
  categoryLabel: string;
}

export interface ActivityEvent {
  id: string;
  ticketToken: string;
  ticketId: string;
  time: string;
  actor: 'AI' | 'Agent' | 'Customer';
  description: string;
  badge: string;
}

/**
 * Format currency in Bangladeshi Taka
 */
export function formatBDT(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return '0.00';
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Calculate relative time string (e.g. "4m ago", "2h ago")
 */
export function formatTimeAgo(ts: string): string {
  if (!ts) return '';
  const d = new Date(ts);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/**
 * Derive priority from ticket context and financial impact
 */
export function deriveTicketPriority(ticket: Ticket): PriorityInfo {
  const content = ticket.messages.map((m) => m.content.toLowerCase()).join(' ');
  const cat = (ticket.category || '').toLowerCase();

  if (
    cat.includes('fail') ||
    cat.includes('fraud') ||
    content.includes('deducted') ||
    content.includes('urgent') ||
    content.includes('help')
  ) {
    if (ticket.status === 'open') {
      return { level: 'urgent', label: 'Urgent', badgeClass: 'admin-priority-urgent' };
    }
    return { level: 'high', label: 'High Priority', badgeClass: 'admin-priority-high' };
  }

  if (cat.includes('wrong') || cat.includes('reversal') || cat.includes('dispute')) {
    return { level: 'high', label: 'High Priority', badgeClass: 'admin-priority-high' };
  }

  if (ticket.status === 'resolved') {
    return { level: 'low', label: 'Resolved', badgeClass: 'admin-priority-low' };
  }

  return { level: 'normal', label: 'Normal', badgeClass: 'admin-priority-normal' };
}

/**
 * Extract transaction reference from messages or list
 */
export function findMentionedTxId(ticket: Ticket): string | null {
  for (const msg of ticket.messages) {
    const match = msg.content.match(/\b(TX-\d+)\b/i);
    if (match) return match[1].toUpperCase();
  }
  return null;
}

/**
 * Derive AI intelligence, confidence, and reasoning signals from ticket & messages
 */
export function deriveAIEvaluation(ticket: Ticket, matchedTx?: Transaction | null): AIEvaluation {
  const cat = (ticket.category || '').toLowerCase();
  const customerMsgs = ticket.messages.filter((m) => m.role === 'customer');
  const firstCustomerMsg = customerMsgs[0]?.content || '';
  const aiMsgs = ticket.messages.filter((m) => m.role === 'ai');
  const hasAi = aiMsgs.length > 0;

  let recommendation: AIEvaluation['recommendation'] = 'Human Review';
  let badgeClass = 'admin-ai-badge-review';
  let confidence = 88;
  const reasoning: string[] = [];
  let suggestedAction = 'Review customer complaint and verify transaction ledger balance.';
  let categoryLabel = 'General Inquiry';

  if (cat.includes('payment') || cat.includes('failure') || firstCustomerMsg.toLowerCase().includes('deducted')) {
    categoryLabel = 'Payment Failure';
    recommendation = 'Human Review';
    badgeClass = 'admin-ai-badge-review';
    confidence = 92;
    reasoning.push('Customer reported money deducted without recipient credit confirmation.');
    if (matchedTx) {
      reasoning.push(`Identified referenced transaction ${matchedTx.tx_id} (৳${formatBDT(matchedTx.amount)}) with status: ${matchedTx.status}.`);
    } else {
      reasoning.push('Detected potential failed transaction requiring ledger reconciliation.');
    }
    if (ticket.user?.balance != null) {
      reasoning.push(`Customer account balance current reading: ৳${formatBDT(ticket.user.balance)}.`);
    }
    reasoning.push('Standard banking gateway auto-reversal window: 24–72 hours.');
    suggestedAction = 'Verify core banking debit status and reassure customer regarding 24–72h reversal SLA.';
  } else if (cat.includes('wrong') || cat.includes('reversal')) {
    categoryLabel = 'Wrong Recipient Reversal';
    recommendation = 'Human Review';
    badgeClass = 'admin-ai-badge-review';
    confidence = 90;
    reasoning.push('Customer requested fund recall for transfer sent to erroneous mobile wallet.');
    if (matchedTx) {
      reasoning.push(`Transaction ${matchedTx.tx_id} of ৳${formatBDT(matchedTx.amount)} confirmed.`);
    }
    reasoning.push('Recipient confirmation required prior to executing balance debit.');
    suggestedAction = 'Verify recipient wallet and place temporary dispute hold on recipient account.';
  } else if (cat.includes('fraud') || firstCustomerMsg.toLowerCase().includes('fraud') || firstCustomerMsg.toLowerCase().includes('scam')) {
    categoryLabel = 'Fraud / Security Alert';
    recommendation = 'Escalate';
    badgeClass = 'admin-ai-badge-escalate';
    confidence = 95;
    reasoning.push('Suspicious account activity or unauthorized transfer reported.');
    reasoning.push('Risk signals triggered: immediate account protection protocol applicable.');
    suggestedAction = 'Escalate to Fraud Operations Center and temporarily restrict outbound wallet transfers.';
  } else if (cat.includes('balance') || cat.includes('info')) {
    categoryLabel = 'Account Information';
    recommendation = hasAi ? 'Auto-Guidance' : 'Request Info';
    badgeClass = hasAi ? 'admin-ai-badge-auto' : 'admin-ai-badge-info';
    confidence = 94;
    reasoning.push('Inquiry regarding wallet balance, mini-statement, or transaction history.');
    if (ticket.user) {
      reasoning.push(`Verified registered account for ${ticket.user.name || ticket.phone}.`);
    }
    suggestedAction = 'Provide account summary or confirm recent completed transactions.';
  } else {
    categoryLabel = ticket.category.replace(/_/g, ' ');
    if (hasAi) {
      recommendation = 'Human Review';
      badgeClass = 'admin-ai-badge-review';
      confidence = 84;
    }
    reasoning.push('Customer submitted support request requiring operational classification.');
    reasoning.push('AI agent provided initial triage response.');
    suggestedAction = 'Review conversation history and respond with necessary next steps.';
  }

  return {
    recommendation,
    badgeClass,
    confidence,
    reasoning,
    suggestedAction,
    categoryLabel,
  };
}

/**
 * Generate recent activity items from tickets and their messages
 */
export function deriveRecentActivity(tickets: Ticket[]): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  for (const t of tickets) {
    for (const m of t.messages) {
      if (m.role === 'ai') {
        events.push({
          id: `${t._id}-ai-${m.timestamp}`,
          ticketToken: t.token,
          ticketId: t._id,
          time: m.timestamp,
          actor: 'AI',
          description: `AI triaged case & prepared recommendation (${t.category.replace(/_/g, ' ')})`,
          badge: 'AI Triage',
        });
      } else if (m.role === 'agent') {
        events.push({
          id: `${t._id}-ag-${m.timestamp}`,
          ticketToken: t.token,
          ticketId: t._id,
          time: m.timestamp,
          actor: 'Agent',
          description: `Support Agent replied to ${t.user?.name || t.phone}`,
          badge: 'Agent Action',
        });
      } else if (m.role === 'customer') {
        events.push({
          id: `${t._id}-cu-${m.timestamp}`,
          ticketToken: t.token,
          ticketId: t._id,
          time: m.timestamp,
          actor: 'Customer',
          description: `Customer submitted issue on ${t.token}`,
          badge: 'Customer',
        });
      }
    }
  }

  // Sort descending by time and take top 12
  return events
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 10);
}

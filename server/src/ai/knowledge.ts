import { KnowledgeArticle } from '../types/index';

/**
 * Hardcoded knowledge base for common MFS support issues.
 * In production, this would be a searchable database or vector store.
 */
const knowledgeBase: KnowledgeArticle[] = [
  {
    id: 'kb-001',
    title: 'Payment Failure — Transaction Declined',
    category: 'payment_failure',
    keywords: ['payment', 'failed', 'declined', 'error', 'unsuccessful', 'not working', 'cant send', 'transaction failed'],
    content: `When a payment fails, common causes include:
1. Insufficient balance in sender's account
2. Receiver's account is inactive or blocked
3. Daily transaction limit exceeded (max ৳25,000/day)
4. System maintenance window (typically 2-4 AM)
5. Network timeout during processing

Resolution steps:
- Verify the sender has sufficient balance
- Check if the amount is within daily limits
- Confirm the receiver's number is valid and active
- If money was deducted but not received, it will auto-reverse within 24-72 hours
- For stuck transactions, escalate to L2 support with transaction ID`,
    actions: ['check_balance', 'verify_transaction', 'escalate'],
  },
  {
    id: 'kb-002',
    title: 'Wrong Recipient — Money Sent to Wrong Number',
    category: 'wrong_recipient',
    keywords: ['wrong', 'recipient', 'wrong number', 'sent to wrong', 'mistake', 'wrong person', 'wrong transfer'],
    content: `When money is sent to the wrong number:
1. Identify the transaction using tx_id or recent history
2. Verify the intended vs actual recipient
3. Check if the recipient has already withdrawn/used the funds

Resolution process:
- If recipient hasn't used funds: initiate reversal request (takes 24-48 hours)
- If recipient has used funds: file a dispute case, contact recipient
- Document the case with both phone numbers and amount
- Maximum reversal window is 7 days from transaction date

Important: Agent cannot directly reverse transactions. Must submit reversal request to operations team.`,
    actions: ['lookup_transaction', 'file_reversal', 'escalate'],
  },
  {
    id: 'kb-003',
    title: 'Balance Inquiry — Incorrect or Missing Balance',
    category: 'balance_inquiry',
    keywords: ['balance', 'wrong balance', 'missing money', 'where is my money', 'balance not updated', 'incorrect balance', 'check balance'],
    content: `For balance-related issues:
1. Current balance can be checked via the app dashboard
2. Balance updates may be delayed up to 5 minutes after a transaction
3. Pending transactions temporarily hold funds but show in history

Common causes of balance discrepancy:
- Pending incoming transfer (up to 5 min delay)
- Unacknowledged cashout at agent point
- Multiple rapid transactions causing display lag
- Subscription or auto-debit charges

Resolution:
- Compare balance against transaction history
- Check for pending transactions
- If discrepancy persists after 30 minutes, escalate to L2`,
    actions: ['check_balance', 'check_transactions', 'escalate'],
  },
  {
    id: 'kb-004',
    title: 'Account Issues — Login, Profile, Blocked',
    category: 'account_issue',
    keywords: ['account', 'login', 'blocked', 'locked', 'cant login', 'profile', 'name change', 'update name', 'reset'],
    content: `Account-related support:
1. Profile updates (name change): Can be done from app settings
2. Account locked: Usually due to too many failed PIN attempts (3 max)
3. Account blocked: Due to suspicious activity or KYC issues

Resolution:
- Name change: Guide user to Profile > Edit Name
- Locked account: Automatically unlocks after 24 hours, or agent can request manual unlock
- Blocked account: Requires KYC verification, escalate to compliance team
- Phone number change: Not supported, must create new account`,
    actions: ['unlock_account', 'escalate_compliance', 'guide_profile_update'],
  },
  {
    id: 'kb-005',
    title: 'Cashout Issues — ATM or Agent',
    category: 'cashout',
    keywords: ['cashout', 'cash out', 'withdraw', 'atm', 'agent', 'didnt receive cash', 'money deducted'],
    content: `Cashout problems:
1. Money deducted but cash not received at ATM:
   - ATM may have run out of cash mid-transaction
   - Auto-reversal within 24 hours
   - If no reversal after 24h, file ATM dispute with bank name and ATM location

2. Agent cashout issues:
   - Agent denied service: Report agent ID
   - Agent charged extra fee: Report for investigation
   - Agent balance insufficient: Try another agent

Resolution:
- For ATM: Get ATM location, time, and amount — file dispute
- For Agent: Get agent ID and location — file complaint
- Refund processing: 3-5 business days`,
    actions: ['file_atm_dispute', 'report_agent', 'check_transaction'],
  },
  {
    id: 'kb-006',
    title: 'General Inquiries',
    category: 'general',
    keywords: ['help', 'how to', 'question', 'info', 'information', 'fees', 'charges', 'limit'],
    content: `General service information:
- Send Money fee: Free for amounts under ৳1,000, 1% for larger amounts
- Daily limit: ৳25,000 per day
- Monthly limit: ৳200,000 per month
- Minimum transaction: ৳10
- Operating hours: 24/7 (maintenance window 2-4 AM Friday)
- Customer support hours: 8 AM - 10 PM daily

For any issue not covered above, collect details and escalate to appropriate team.`,
    actions: ['provide_info'],
  },
];

/**
 * Search knowledge base by intent/category match and keyword overlap.
 */
export function searchKnowledge(intent: string, query?: string): KnowledgeArticle[] {
  // First, try exact category match
  const categoryMatch = knowledgeBase.filter((kb) => kb.category === intent);
  if (categoryMatch.length > 0) return categoryMatch;

  // Fall back to keyword search
  if (query) {
    const queryWords = query.toLowerCase().split(/\s+/);
    const scored = knowledgeBase.map((kb) => {
      const matchCount = kb.keywords.reduce((count, keyword) => {
        return count + (queryWords.some((w) => keyword.includes(w) || w.includes(keyword)) ? 1 : 0);
      }, 0);
      return { article: kb, score: matchCount };
    });

    const matches = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map((s) => s.article);

    if (matches.length > 0) return matches;
  }

  // Default to general
  return knowledgeBase.filter((kb) => kb.category === 'general');
}

export { knowledgeBase };

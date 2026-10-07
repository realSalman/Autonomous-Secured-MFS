import type { Transaction } from '../../types/index';

/** ৳ amount with Bangladeshi (lakh/crore) digit grouping. */
export function formatBDT(n: number, decimals = 2): string {
  return Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatTime(ts: string): string {
  const d = new Date(ts);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatFullTime(ts: string): string {
  return new Date(ts).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function initials(name: string | undefined, fallback = 'P'): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export type TxTone = 'success' | 'review' | 'pending' | 'failed' | 'blocked';

export interface TxState {
  tone: TxTone;
  label: string;
  note: string;
  /** Money actually moved out of / into the wallet */
  settled: boolean;
  /** Needs the customer's attention */
  attention: boolean;
}

/**
 * Maps existing transaction fields (status + fraud_decision) to a customer-facing state.
 * Backend semantics: DECLINE => status 'blocked' and no debit; REVIEW => completed but flagged.
 */
export function getTxState(tx: Pick<Transaction, 'status' | 'fraud_decision'>): TxState {
  if (tx.status === 'blocked' || tx.fraud_decision === 'DECLINE') {
    return {
      tone: 'blocked', label: 'Blocked', settled: false, attention: true,
      note: 'Stopped by fraud monitoring. No money left the wallet.',
    };
  }
  if (tx.status === 'failed') {
    return { tone: 'failed', label: 'Failed', settled: false, attention: true, note: 'This transfer did not go through.' };
  }
  if (tx.status === 'pending') {
    return { tone: 'pending', label: 'Pending', settled: false, attention: false, note: 'Waiting to be processed.' };
  }
  if (tx.fraud_decision === 'REVIEW') {
    return {
      tone: 'review', label: 'Under review', settled: true, attention: true,
      note: 'Sent, and flagged for a manual check by our team.',
    };
  }
  return { tone: 'success', label: 'Successful', settled: true, attention: false, note: 'Completed.' };
}

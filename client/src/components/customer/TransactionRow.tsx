import type { Transaction } from '../../types/index';
import { formatBDT, formatFullTime, formatTime, getTxState } from './mfsUtils';
import { AlertIcon, CheckIcon, ChevronIcon, ClockIcon, ReceiveIcon, SendIcon, ShieldIcon } from './icons';

interface TransactionRowProps {
  tx: Transaction;
  phone: string;
  expanded?: boolean;
  /** When provided the row becomes expandable and shows a "Get help" action. */
  onToggle?: () => void;
  onHelp?: (tx: Transaction) => void;
}

const SECURITY_CHECK: Record<string, string> = {
  ACCEPT: 'Cleared by fraud monitoring',
  REVIEW: 'Flagged for manual review',
  DECLINE: 'Blocked by fraud monitoring',
};

function StatusIcon({ tone }: { tone: string }) {
  if (tone === 'success') return <CheckIcon size={12} />;
  if (tone === 'pending') return <ClockIcon size={12} />;
  if (tone === 'review') return <ShieldIcon size={12} />;
  return <AlertIcon size={12} />;
}

export function TransactionRow({ tx, phone, expanded = false, onToggle, onHelp }: TransactionRowProps) {
  const isSender = tx.sender === phone;
  const state = getTxState(tx);
  const sign = !state.settled ? '' : isSender ? '−' : '+';
  const amountClass = !state.settled ? 'is-void' : isSender ? 'is-out' : 'is-in';
  const interactive = !!onToggle;

  const body = (
    <>
      <span className={`mfs-tx-icon tone-${state.tone}`}>
        {isSender ? <SendIcon size={18} /> : <ReceiveIcon size={18} />}
      </span>
      <span className="mfs-tx-main">
        <span className="mfs-tx-title">{isSender ? 'Money sent' : 'Money received'}</span>
        <span className="mfs-tx-sub">
          {isSender ? 'To' : 'From'} {isSender ? tx.receiver : tx.sender} · {formatTime(tx.time)}
        </span>
      </span>
      <span className="mfs-tx-side">
        <span className={`mfs-tx-amount ${amountClass}`}>{sign}৳{formatBDT(tx.amount)}</span>
        <span className={`mfs-pill tone-${state.tone}`}>
          <StatusIcon tone={state.tone} />
          {state.label}
        </span>
      </span>
      {interactive && (
        <span className={`mfs-tx-chevron ${expanded ? 'is-open' : ''}`}><ChevronIcon size={16} /></span>
      )}
    </>
  );

  return (
    <div className={`mfs-tx ${expanded ? 'is-expanded' : ''}`} data-tx-id={tx.tx_id}>
      {interactive ? (
        <button type="button" className="mfs-tx-row" onClick={onToggle} aria-expanded={expanded}>
          {body}
        </button>
      ) : (
        <div className="mfs-tx-row">{body}</div>
      )}

      {interactive && expanded && (
        <div className="mfs-tx-detail">
          <dl>
            <div><dt>Transaction ID</dt><dd className="mono">{tx.tx_id}</dd></div>
            <div><dt>Date and time</dt><dd>{formatFullTime(tx.time)}</dd></div>
            <div><dt>{isSender ? 'Recipient' : 'Sender'}</dt><dd>{isSender ? tx.receiver : tx.sender}</dd></div>
            {tx.fraud_decision && (
              <div><dt>Security check</dt><dd>{SECURITY_CHECK[tx.fraud_decision] ?? tx.fraud_decision}</dd></div>
            )}
          </dl>
          <p className={`mfs-tx-note tone-${state.tone}`}>{state.note}</p>
          {onHelp && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => onHelp(tx)}>
              Get help with this transaction
            </button>
          )}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { sendMoney } from '../../api/index';
import type { SendMoneyResult } from '../../types/index';
import { formatBDT } from './mfsUtils';
import { AlertIcon, CheckIcon, CloseIcon, LockIcon, ShieldIcon } from './icons';

interface SendMoneyProps {
  senderPhone: string;
  balance?: number;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
}

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

export function SendMoney({ senderPhone, balance, onClose, onSuccess }: SendMoneyProps) {
  const [receiver, setReceiver] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SendMoneyResult | null>(null);

  const amountNum = parseFloat(amount);
  const overBalance = balance !== undefined && !isNaN(amountNum) && amountNum > balance;
  const wasBlocked = /blocked/i.test(error);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiver.trim() || !amount.trim()) return;

    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Enter a valid amount');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await sendMoney(senderPhone, receiver.trim(), amountNum);
      setResult(res);
      if (res.newBalance !== undefined) {
        onSuccess(res.newBalance);
      }
      setReceiver('');
      setAmount('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay mfs-overlay" onClick={onClose}>
      <div
        className="mfs-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mfs-sheet-head">
          <h3 id="send-title">{result ? 'Transfer complete' : 'Send Money'}</h3>
          <button type="button" className="mfs-icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon size={18} />
          </button>
        </div>

        {result ? (
          <div className="mfs-sheet-body">
            <div className="mfs-receipt">
              <span className={`mfs-receipt-badge ${result.flagged_for_review ? 'tone-review' : 'tone-success'}`}>
                {result.flagged_for_review ? <ShieldIcon size={28} /> : <CheckIcon size={28} />}
              </span>
              <div className="mfs-receipt-amount">৳{formatBDT(result.amount)}</div>
              <div className="mfs-receipt-to">sent to {result.receiver}</div>

              {result.flagged_for_review && (
                <div className="mfs-callout tone-review">
                  <ShieldIcon size={16} />
                  <span>This transfer went through and was flagged for a manual check by our team.</span>
                </div>
              )}

              <dl className="mfs-receipt-list">
                <div><dt>Transaction ID</dt><dd className="mono" id="send-result-txid">{result.tx_id}</dd></div>
                <div><dt>Date and time</dt><dd>{new Date(result.time).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</dd></div>
                {result.newBalance !== undefined && result.newBalance !== null && (
                  <div><dt>New balance</dt><dd>৳{formatBDT(result.newBalance)}</dd></div>
                )}
              </dl>
            </div>
            <div className="mfs-sheet-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setResult(null)}>Send another</button>
              <button type="button" className="btn btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSend}>
            <div className="mfs-sheet-body">
              <div className="field-group">
                <label className="field-label" htmlFor="send-receiver">Send to</label>
                <input
                  id="send-receiver"
                  className="input mfs-input"
                  type="text"
                  inputMode="tel"
                  placeholder="01XXXXXXXXX"
                  value={receiver}
                  onChange={(e) => setReceiver(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="send-amount">Amount</label>
                <div className="mfs-amount-field">
                  <span className="mfs-amount-cur">৳</span>
                  <input
                    id="send-amount"
                    className="mfs-amount-input"
                    type="number"
                    placeholder="0"
                    min="1"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="mfs-amount-meta">
                  {balance !== undefined && <span>Available ৳{formatBDT(balance)}</span>}
                  {overBalance && <span className="warn">Amount is above your balance</span>}
                </div>
                <div className="mfs-quick">
                  {QUICK_AMOUNTS.map((q) => (
                    <button key={q} type="button" onClick={() => setAmount(String(q))}>৳{q.toLocaleString('en-IN')}</button>
                  ))}
                </div>
              </div>

              {error && (
                <div className={`mfs-callout ${wasBlocked ? 'tone-blocked' : 'tone-failed'}`} role="alert">
                  <AlertIcon size={16} />
                  <span>
                    {wasBlocked
                      ? 'Transfer blocked by fraud monitoring. No money left your wallet. You can contact Transaction Support if you think this is a mistake.'
                      : error}
                  </span>
                </div>
              )}

              <div className="mfs-secure-note">
                <LockIcon size={14} /> Screened by fraud monitoring before money is sent.
              </div>
            </div>

            <div className="mfs-sheet-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                id="send-money-btn"
                type="submit"
                className="btn btn-primary"
                disabled={loading || !receiver.trim() || !amount.trim()}
              >
                {loading ? 'Sending...' : amountNum > 0 ? `Send ৳${formatBDT(amountNum, amountNum % 1 ? 2 : 0)}` : 'Send Money'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

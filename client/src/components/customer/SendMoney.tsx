import { useState } from 'react';
import { sendMoney } from '../../api/index';

interface SendMoneyProps {
  senderPhone: string;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
}

export function SendMoney({ senderPhone, onClose, onSuccess }: SendMoneyProps) {
  const [receiver, setReceiver] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiver.trim() || !amount.trim()) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Enter a valid amount');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await sendMoney(senderPhone, receiver.trim(), amountNum);
      setSuccess(`Sent ৳${result.amount} to ${result.receiver} (${result.tx_id})`);
      if (result.newBalance !== undefined) {
        onSuccess(result.newBalance);
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Send Money</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSend}>
          <div className="modal-body">
            <div className="field-group">
              <label className="field-label" htmlFor="send-receiver">Recipient Number</label>
              <input
                id="send-receiver"
                className="input"
                type="text"
                placeholder="01XXXXXXXXX"
                value={receiver}
                onChange={(e) => setReceiver(e.target.value)}
                autoFocus
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="send-amount">Amount (৳)</label>
              <input
                id="send-amount"
                className="input"
                type="number"
                placeholder="0.00"
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              id="send-money-btn"
              type="submit"
              className="btn btn-primary"
              disabled={loading || !receiver.trim() || !amount.trim()}
            >
              {loading ? 'Sending...' : 'Send Money'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

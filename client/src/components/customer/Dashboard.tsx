import { useState, useEffect } from 'react';
import type { User, Transaction } from '../../types/index';
import { getUser, getTransactions } from '../../api/index';
import { SendMoney } from './SendMoney';
import { CustomerSupport } from './CustomerSupport';
import { Profile } from './Profile';

type View = 'home' | 'send_money' | 'support' | 'profile' | 'history';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export function Dashboard({ user: initialUser, onLogout }: DashboardProps) {
  const [user, setUser] = useState<User>(initialUser);
  const [view, setView] = useState<View>('home');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showSendMoney, setShowSendMoney] = useState(false);

  const refreshUser = async () => {
    try {
      const updated = await getUser(user.phone);
      setUser(updated);
    } catch {
      // silent
    }
  };

  const loadTransactions = async () => {
    try {
      const txs = await getTransactions(user.phone);
      setTransactions(txs);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const handleSendSuccess = (newBalance: number) => {
    setUser((prev) => ({ ...prev, balance: newBalance }));
    loadTransactions();
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  if (view === 'support') {
    return <CustomerSupport phone={user.phone} onBack={() => { setView('home'); refreshUser(); }} />;
  }

  if (view === 'profile') {
    return (
      <Profile
        user={user}
        onUpdate={(u) => setUser(u)}
        onBack={() => setView('home')}
      />
    );
  }

  return (
    <div className="customer-layout">
      {/* Header with user info */}
      <div className="customer-header">
        <div className="customer-header-top">
          <div>
            <div className="customer-name">{user.name || 'PayFlow User'}</div>
            <div className="customer-phone">{user.phone}</div>
          </div>
          <div className="customer-balance">
            <div className="customer-balance-label">Balance</div>
            <div className="customer-balance-amount">৳{user.balance.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="customer-view-nav">
        <button
          className={`customer-view-btn ${view === 'home' ? 'active' : ''}`}
          onClick={() => setView('home')}
        >
          Home
        </button>
        <button
          className={`customer-view-btn ${view === 'history' ? 'active' : ''}`}
          onClick={() => { setView('history'); loadTransactions(); }}
        >
          History
        </button>
        <button
          className="customer-view-btn"
          onClick={() => setView('profile')}
        >
          Profile
        </button>
        <button
          className="customer-view-btn"
          onClick={onLogout}
          style={{ marginLeft: 'auto', color: 'var(--color-danger)' }}
        >
          Logout
        </button>
      </div>

      {/* Content */}
      {view === 'home' && (
        <div className="customer-actions">
          <div
            id="action-send-money"
            className="action-card"
            onClick={() => setShowSendMoney(true)}
          >
            <div className="action-icon">↗</div>
            <div>
              <div className="action-label">Send Money</div>
              <div className="action-desc">Transfer funds to another number</div>
            </div>
          </div>

          <div
            id="action-customer-support"
            className="action-card"
            onClick={() => setView('support')}
          >
            <div className="action-icon">💬</div>
            <div>
              <div className="action-label">Customer Support</div>
              <div className="action-desc">Get help from our AI assistant</div>
            </div>
          </div>
        </div>
      )}

      {view === 'history' && (
        <div style={{ padding: 'var(--space-xl)', maxWidth: 480, margin: '0 auto', width: '100%' }}>
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 16 }}>
            Transaction History
          </h3>
          {transactions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">No transactions yet</div>
            </div>
          ) : (
            <div className="tx-list">
              {transactions.map((tx) => {
                const isSender = tx.sender === user.phone;
                return (
                  <div key={tx.tx_id} className="tx-item">
                    <div className="tx-info">
                      <div className="tx-direction">
                        {isSender ? 'Sent' : 'Received'}
                      </div>
                      <div className="tx-peer">
                        {isSender ? `To: ${tx.receiver}` : `From: ${tx.sender}`}
                      </div>
                      <div className="tx-time-text">{formatTime(tx.time)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className={`tx-amount ${isSender ? 'tx-amount-sent' : 'tx-amount-received'}`}>
                        {isSender ? '-' : '+'}৳{tx.amount.toLocaleString()}
                      </div>
                      <span className={`badge badge-${tx.status}`}>{tx.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Send Money Modal */}
      {showSendMoney && (
        <SendMoney
          senderPhone={user.phone}
          onClose={() => setShowSendMoney(false)}
          onSuccess={handleSendSuccess}
        />
      )}
    </div>
  );
}

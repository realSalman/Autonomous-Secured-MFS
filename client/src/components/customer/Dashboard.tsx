import { useState, useEffect } from 'react';
import type { User, Transaction } from '../../types/index';
import { getUser, getTransactions } from '../../api/index';
import { SendMoney } from './SendMoney';
import { CustomerSupport } from './CustomerSupport';
import { Profile } from './Profile';
import { TransactionRow } from './TransactionRow';
import { SupportFlow } from './SupportFlow';
import { formatBDT, initials, getTxState } from './mfsUtils';
import {
  BrandMark, HomeIcon, ListIcon, SupportIcon, UserIcon, SendIcon, ShieldIcon,
  EyeIcon, EyeOffIcon, ChevronIcon, LogoutIcon, ChatIcon,
} from './icons';

type View = 'home' | 'support' | 'profile' | 'history';
type HistoryFilter = 'all' | 'sent' | 'received' | 'attention';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const TABS: { id: View; label: string; Icon: typeof HomeIcon }[] = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'history', label: 'Transactions', Icon: ListIcon },
  { id: 'support', label: 'Support', Icon: SupportIcon },
  { id: 'profile', label: 'Profile', Icon: UserIcon },
];

export function Dashboard({ user: initialUser, onLogout }: DashboardProps) {
  const [user, setUser] = useState<User>(initialUser);
  const [view, setView] = useState<View>('home');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoaded, setTxLoaded] = useState(false);
  const [showSendMoney, setShowSendMoney] = useState(false);
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [supportPrefill, setSupportPrefill] = useState('');
  const [supportKey, setSupportKey] = useState(0);

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
    } finally {
      setTxLoaded(true);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const handleSendSuccess = (newBalance: number) => {
    setUser((prev) => ({ ...prev, balance: newBalance }));
    loadTransactions();
  };

  const goTo = (next: View) => {
    if (next === view) return;
    if (view === 'support') {
      refreshUser();
      loadTransactions();
    }
    if (next === 'history') loadTransactions();
    if (next === 'support') {
      setSupportPrefill('');
      setSupportKey((k) => k + 1);
    }
    setView(next);
  };

  const openSupportForTx = (tx: Transaction) => {
    const isSender = tx.sender === user.phone;
    setSupportPrefill(
      `I need help with transaction ${tx.tx_id} (৳${formatBDT(tx.amount)} ${isSender ? `sent to ${tx.receiver}` : `received from ${tx.sender}`}).`
    );
    setSupportKey((k) => k + 1);
    setView('support');
  };

  // ── Derived data (all from existing transaction fields) ──
  const screened = transactions.filter((t) => t.fraud_decision).length;
  const underReview = transactions.filter((t) => getTxState(t).tone === 'review').length;
  const blocked = transactions.filter((t) => getTxState(t).tone === 'blocked').length;
  const recent = transactions.slice(0, 5);

  const filtered = transactions.filter((t) => {
    if (filter === 'sent') return t.sender === user.phone;
    if (filter === 'received') return t.receiver === user.phone;
    if (filter === 'attention') return getTxState(t).attention;
    return true;
  });
  const attentionCount = transactions.filter((t) => getTxState(t).attention).length;

  const firstName = (user.name || '').split(' ')[0];

  return (
    <div className="mfs-shell">
      {/* ── Navigation (top tabs on desktop, bottom bar on mobile) ── */}
      <nav className="mfs-nav" aria-label="Customer navigation">
        <div className="mfs-nav-inner">
          <div className="mfs-brand">
            <BrandMark />
            <span>PayFlow</span>
          </div>
          <div className="mfs-tabs" role="tablist">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                id={`nav-${id}`}
                className={`mfs-tab ${view === id ? 'is-active' : ''}`}
                aria-current={view === id ? 'page' : undefined}
                onClick={() => goTo(id)}
              >
                <Icon size={20} />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <button type="button" className="mfs-logout" onClick={onLogout}>
            <LogoutIcon size={16} />
            <span>Log out</span>
          </button>
        </div>
      </nav>

      <div className="mfs-scroll">
        {/* ── HOME ── */}
        {view === 'home' && (
          <div className="mfs-page mfs-grid">
            <div className="mfs-col">
              <section className="mfs-hero" aria-label="Wallet balance">
                <div className="mfs-hero-top">
                  <div className="mfs-identity">
                    <span className="mfs-avatar">{initials(user.name)}</span>
                    <div>
                      <div className="mfs-hello">{firstName ? `Hello, ${firstName}` : 'Welcome back'}</div>
                      <div className="mfs-phone">{user.name || 'PayFlow wallet'} · {user.phone}</div>
                    </div>
                  </div>
                  <span className="mfs-chip-protected"><ShieldIcon size={14} /> Protected</span>
                </div>

                <div className="mfs-balance-block">
                  <div className="mfs-balance-label">
                    Available balance
                    <button
                      type="button"
                      className="mfs-eye"
                      onClick={() => setBalanceHidden((h) => !h)}
                      aria-label={balanceHidden ? 'Show balance' : 'Hide balance'}
                    >
                      {balanceHidden ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                    </button>
                  </div>
                  <div className="mfs-balance" id="wallet-balance">
                    <span className="mfs-currency">৳</span>
                    {balanceHidden ? '••••••' : formatBDT(user.balance)}
                  </div>
                </div>
              </section>

              <div className="mfs-actions">
                <button
                  type="button"
                  id="action-send-money"
                  className="mfs-action mfs-action-primary"
                  onClick={() => setShowSendMoney(true)}
                >
                  <span className="mfs-action-icon"><SendIcon size={22} /></span>
                  <span className="mfs-action-text">
                    <span className="mfs-action-label">Send Money</span>
                    <span className="mfs-action-desc">Transfer to any wallet number</span>
                  </span>
                  <ChevronIcon size={18} />
                </button>

                <button
                  type="button"
                  id="action-customer-support"
                  className="mfs-action"
                  onClick={() => goTo('support')}
                >
                  <span className="mfs-action-icon"><ChatIcon size={22} /></span>
                  <span className="mfs-action-text">
                    <span className="mfs-action-label">Transaction Support</span>
                    <span className="mfs-action-desc">Report a problem with a transfer</span>
                  </span>
                  <ChevronIcon size={18} />
                </button>
              </div>

              <section className="mfs-card" aria-labelledby="recent-title">
                <header className="mfs-card-head">
                  <h2 id="recent-title">Recent transactions</h2>
                  {transactions.length > 0 && (
                    <button type="button" className="mfs-link" onClick={() => goTo('history')}>View all</button>
                  )}
                </header>
                {!txLoaded ? (
                  <div className="mfs-skeletons" aria-hidden="true"><i /><i /><i /></div>
                ) : recent.length === 0 ? (
                  <div className="mfs-empty">
                    <div className="mfs-empty-title">No transactions yet</div>
                    <div className="mfs-empty-desc">Your transfers and their security status will appear here.</div>
                  </div>
                ) : (
                  <div className="mfs-tx-list">
                    {recent.map((tx) => (
                      <TransactionRow key={tx.tx_id} tx={tx} phone={user.phone} />
                    ))}
                  </div>
                )}
              </section>
            </div>

            <aside className="mfs-col">
              <section className="mfs-card mfs-security" aria-labelledby="sec-title">
                <header className="mfs-card-head">
                  <h2 id="sec-title">Account security</h2>
                  <span className="mfs-live"><i /> Active</span>
                </header>
                <div className="mfs-security-body">
                  <div className="mfs-security-hero">
                    <span className="mfs-security-badge"><ShieldIcon size={22} /></span>
                    <div>
                      <div className="mfs-security-title">Fraud monitoring is on</div>
                      <div className="mfs-security-desc">Every transfer is screened before money moves.</div>
                    </div>
                  </div>
                  <ul className="mfs-checklist">
                    <li>
                      <span>Transfers screened</span>
                      <b>{screened}</b>
                    </li>
                    <li>
                      <span>Held for review</span>
                      <b className={underReview ? 'warn' : ''}>{underReview}</b>
                    </li>
                    <li>
                      <span>Blocked for your safety</span>
                      <b className={blocked ? 'risk' : ''}>{blocked}</b>
                    </li>
                  </ul>
                </div>
              </section>

              <section className="mfs-card" aria-labelledby="flow-title">
                <header className="mfs-card-head">
                  <h2 id="flow-title">How support works</h2>
                </header>
                <div className="mfs-card-body">
                  <SupportFlow variant="vertical" />
                  <button type="button" className="btn btn-primary mfs-block-btn" onClick={() => goTo('support')}>
                    Start transaction support
                  </button>
                </div>
              </section>
            </aside>
          </div>
        )}

        {/* ── TRANSACTIONS ── */}
        {view === 'history' && (
          <div className="mfs-page mfs-narrow">
            <div className="mfs-page-title">
              <h1>Transactions</h1>
              <p>Tap a transaction for details or to get help with it.</p>
            </div>

            <div className="mfs-filters" role="group" aria-label="Filter transactions">
              {([
                ['all', 'All'],
                ['sent', 'Sent'],
                ['received', 'Received'],
                ['attention', `Needs attention${attentionCount ? ` (${attentionCount})` : ''}`],
              ] as [HistoryFilter, string][]).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`mfs-filter ${filter === id ? 'is-active' : ''}`}
                  onClick={() => setFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            <section className="mfs-card">
              {!txLoaded ? (
                <div className="mfs-skeletons" aria-hidden="true"><i /><i /><i /><i /></div>
              ) : filtered.length === 0 ? (
                <div className="mfs-empty">
                  <div className="mfs-empty-title">
                    {transactions.length === 0 ? 'No transactions yet' : 'Nothing matches this filter'}
                  </div>
                  <div className="mfs-empty-desc">
                    {transactions.length === 0
                      ? 'Send money to see your first transaction here.'
                      : 'Try another filter to see more of your activity.'}
                  </div>
                </div>
              ) : (
                <div className="mfs-tx-list">
                  {filtered.map((tx) => (
                    <TransactionRow
                      key={tx.tx_id}
                      tx={tx}
                      phone={user.phone}
                      expanded={expandedTx === tx.tx_id}
                      onToggle={() => setExpandedTx(expandedTx === tx.tx_id ? null : tx.tx_id)}
                      onHelp={openSupportForTx}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ── SUPPORT ── */}
        {view === 'support' && (
          <CustomerSupport
            key={supportKey}
            phone={user.phone}
            prefill={supportPrefill}
            onBack={() => goTo('home')}
          />
        )}

        {/* ── PROFILE ── */}
        {view === 'profile' && (
          <div className="mfs-page mfs-narrow">
            <Profile user={user} onUpdate={(u) => setUser(u)} onBack={() => goTo('home')} />
            <button type="button" className="btn btn-secondary mfs-block-btn mfs-logout-block" onClick={onLogout}>
              <LogoutIcon size={16} /> Log out
            </button>
          </div>
        )}
      </div>

      {/* Send Money Modal */}
      {showSendMoney && (
        <SendMoney
          senderPhone={user.phone}
          balance={user.balance}
          onClose={() => setShowSendMoney(false)}
          onSuccess={handleSendSuccess}
        />
      )}
    </div>
  );
}

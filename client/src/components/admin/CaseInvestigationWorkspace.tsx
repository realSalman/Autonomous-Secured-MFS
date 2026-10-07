import React, { useState, useRef, useEffect } from 'react';
import type { Ticket, Transaction } from '../../types/index';
import { addMessage, updateTicketStatus, getTransactions } from '../../api/index';
import {
  formatBDT,
  formatTimeAgo,
  findMentionedTxId,
  deriveAIEvaluation,
  deriveTicketPriority,
} from './adminUtils';

interface CaseInvestigationWorkspaceProps {
  ticket: Ticket | null;
  onTicketUpdate: (ticket: Ticket) => void;
}

export function CaseInvestigationWorkspace({
  ticket,
  onTicketUpdate,
}: CaseInvestigationWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'conversation' | 'transaction' | 'ai' | 'audit'>('conversation');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages]);

  // Load customer transactions
  useEffect(() => {
    if (!ticket?.phone) {
      setTransactions([]);
      return;
    }
    let active = true;
    getTransactions(ticket.phone)
      .then((txs) => {
        if (active) setTransactions(txs);
      })
      .catch(() => {
        if (active) setTransactions([]);
      });
    return () => {
      active = false;
    };
  }, [ticket?.phone]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || !ticket || loading) return;

    setLoading(true);
    try {
      const updated = await addMessage(ticket._id, input.trim(), 'agent');
      onTicketUpdate(updated);
      setInput('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return;
    try {
      const updated = await updateTicketStatus(ticket._id, newStatus);
      onTicketUpdate(updated);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  if (!ticket) {
    return (
      <div className="case-workspace-column empty-workspace">
        <div className="workspace-empty-center">
          <span className="empty-icon-shield">📂</span>
          <h3>No Ticket Selected</h3>
          <p>Select any ticket from the support queue to inspect conversations, transaction details, and AI triage.</p>
        </div>
      </div>
    );
  }

  const priority = deriveTicketPriority(ticket);
  const mentionedTxId = findMentionedTxId(ticket);
  const matchedTx: Transaction | null =
    (mentionedTxId
      ? transactions.find((t) => t.tx_id.toUpperCase() === mentionedTxId.toUpperCase())
      : null) ||
    (transactions.length > 0 ? transactions[0] : null);

  const aiEval = deriveAIEvaluation(ticket, matchedTx);

  const getFinancialAmount = (): string => {
    for (const msg of ticket.messages) {
      const match = msg.content.match(/[৳$]\s*([\d,]+)/);
      if (match) return `৳${match[1]}`;
    }
    if (ticket.user?.balance != null) {
      return `৳${formatBDT(ticket.user.balance)}`;
    }
    return '৳0';
  };

  const getCategoryTitle = (): string => {
    if (ticket.category.includes('failed') || ticket.category.includes('payment')) {
      return 'Payment failed';
    }
    if (ticket.category.includes('wrong')) {
      return 'Wrong recipient';
    }
    if (ticket.category.includes('fraud') || ticket.category.includes('suspicious')) {
      return 'Possible fraud';
    }
    return ticket.category.replace(/_/g, ' ');
  };

  return (
    <div className="case-workspace-column">
      {/* 1. Header Row */}
      <div className="workspace-header">
        <div className="workspace-header-top">
          <div className="workspace-title-group">
            <span className="workspace-ticket-token">{ticket.token}</span>
            <span className={`workspace-priority-pill prio-${priority.level}`}>
              {priority.level === 'urgent' ? 'Urgent' : `${priority.label} Priority`}
            </span>
          </div>

          <div className="workspace-header-actions">
            <select
              className="workspace-status-select"
              value={ticket.status}
              onChange={(e) => handleStatusChange(e.target.value)}
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
            <button type="button" className="workspace-more-btn" title="Case options">
              ⋮
            </button>
          </div>
        </div>

        {/* Issue & Amount */}
        <div className="workspace-issue-line">
          <span className="issue-label">{getCategoryTitle()}</span>
          <span className="issue-dot">•</span>
          <span className="issue-amount">{getFinancialAmount()}</span>
        </div>

        {/* Customer Identity Row */}
        <div className="workspace-customer-meta">
          <span className="meta-user-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <strong>{ticket.user?.name || 'Customer'}</strong>
          </span>
          <span className="meta-sep">•</span>
          <span className="meta-phone">{ticket.phone}</span>
          <span className="meta-sep">•</span>
          <span className="meta-time">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {formatTimeAgo(ticket.updatedAt)}
          </span>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="workspace-tabs-bar">
        <button
          type="button"
          className={`workspace-tab ${activeTab === 'conversation' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('conversation')}
        >
          Conversation
        </button>
        <button
          type="button"
          className={`workspace-tab ${activeTab === 'transaction' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('transaction')}
        >
          Transaction Details
        </button>
        <button
          type="button"
          className={`workspace-tab ${activeTab === 'ai' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          AI Analysis
        </button>
        <button
          type="button"
          className={`workspace-tab ${activeTab === 'audit' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          Audit Trail
        </button>
      </div>

      {/* 3. Tab Body */}
      {activeTab === 'conversation' && (
        <div className="workspace-tab-content conversation-tab">
          {/* Messages Stream */}
          <div className="workspace-messages-list">
            {ticket.messages.map((m, idx) => {
              const isCustomer = m.role === 'customer';
              const isAi = m.role === 'ai';

              return (
                <div key={idx} className={`workspace-msg-row ${isCustomer ? 'msg-customer' : isAi ? 'msg-ai' : 'msg-agent'}`}>
                  {/* Sender Avatar */}
                  <div className="msg-avatar">
                    {isCustomer ? (
                      <div className="avatar-customer">
                        {(ticket.user?.name || 'Customer').slice(0, 2).toUpperCase()}
                      </div>
                    ) : isAi ? (
                      <div className="avatar-ai">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="10" rx="2" />
                          <circle cx="12" cy="5" r="2" />
                          <path d="M12 7v4" />
                        </svg>
                      </div>
                    ) : (
                      <div className="avatar-agent">AH</div>
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div className="msg-content-wrapper">
                    <div className="msg-meta-header">
                      <span className="msg-sender-name">
                        {isCustomer
                          ? `${ticket.user?.name || 'Customer'} (Customer)`
                          : isAi
                          ? 'AI Assistant'
                          : 'Admin Hasan (Support Agent)'}
                      </span>
                      <span className="msg-timestamp">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="msg-bubble-box">
                      <p className="msg-text">{m.content}</p>
                      {isAi && (
                        <div className="msg-ai-status-tag">
                          <span>Analyzing transaction...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Composer */}
          <form className="workspace-composer" onSubmit={handleSend}>
            <input
              type="text"
              className="composer-input-field"
              placeholder="Type a message or add notes..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />

            <div className="composer-actions-right">
              <button type="button" className="composer-icon-btn" title="Attach file">
                📎
              </button>
              <button type="button" className="composer-icon-btn" title="Add emoji">
                😊
              </button>
              <button
                type="submit"
                className="btn btn-primary composer-send-btn"
                disabled={loading || !input.trim()}
              >
                Send
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transaction Details Tab */}
      {activeTab === 'transaction' && (
        <div className="workspace-tab-content details-tab">
          {matchedTx ? (
            <div className="tx-details-grid">
              <div className="tx-detail-card">
                <span className="tx-lbl">Transaction ID</span>
                <span className="tx-val-token">{matchedTx.tx_id}</span>
              </div>
              <div className="tx-detail-card">
                <span className="tx-lbl">Amount</span>
                <span className="tx-val-amount">৳{formatBDT(matchedTx.amount)}</span>
              </div>
              <div className="tx-detail-card">
                <span className="tx-lbl">Status</span>
                <span className={`tx-val-status status-${matchedTx.status}`}>
                  {matchedTx.status.toUpperCase()}
                </span>
              </div>
              <div className="tx-detail-card">
                <span className="tx-lbl">Sender</span>
                <span className="tx-val">{matchedTx.sender}</span>
              </div>
              <div className="tx-detail-card">
                <span className="tx-lbl">Receiver</span>
                <span className="tx-val">{matchedTx.receiver}</span>
              </div>
              <div className="tx-detail-card">
                <span className="tx-lbl">Fraud Decision</span>
                <span className="tx-val-safe">
                  {matchedTx.fraud_decision ? matchedTx.fraud_decision : 'Approved / Safe'}
                </span>
              </div>
            </div>
          ) : (
            <div className="tab-empty-notice">No specific transaction linked to this ticket.</div>
          )}
        </div>
      )}

      {/* AI Analysis Tab */}
      {activeTab === 'ai' && (
        <div className="workspace-tab-content details-tab">
          <div className="ai-breakdown-card">
            <h4>AI Intent Classification</h4>
            <p><strong>Intent:</strong> {aiEval.categoryLabel}</p>
            <p><strong>Recommendation:</strong> {aiEval.recommendation}</p>
            <p><strong>Confidence:</strong> {aiEval.confidence}%</p>
            <h4>Reasoning & Evidence</h4>
            <ul>
              {aiEval.reasoning.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Audit Trail Tab */}
      {activeTab === 'audit' && (
        <div className="workspace-tab-content details-tab">
          <div className="audit-timeline-list">
            <div className="audit-item">
              <span className="audit-dot" />
              <div>
                <strong>Ticket Created</strong>: {new Date(ticket.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="audit-item">
              <span className="audit-dot" />
              <div>
                <strong>AI Automated Triage</strong>: Intent detected as {ticket.category}
              </div>
            </div>
            <div className="audit-item">
              <span className="audit-dot" />
              <div>
                <strong>Current Status</strong>: {ticket.status.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

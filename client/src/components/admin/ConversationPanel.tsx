import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Ticket, Transaction } from '../../types/index';
import { addMessage, getTicket, updateTicketStatus, getTransactions } from '../../api/index';
import {
  formatBDT,
  formatTimeAgo,
  findMentionedTxId,
  deriveAIEvaluation,
  deriveTicketPriority,
} from './adminUtils';

interface ConversationPanelProps {
  ticket: Ticket | null;
  onTicketUpdate: (ticket: Ticket) => void;
  allTickets?: Ticket[];
  onSelectTicket?: (ticket: Ticket) => void;
}

export function ConversationPanel({
  ticket,
  onTicketUpdate,
  allTickets = [],
  onSelectTicket,
}: ConversationPanelProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [ticket?.messages]);

  // Load customer transactions whenever selected ticket changes
  useEffect(() => {
    if (!ticket?.phone) {
      setTransactions([]);
      return;
    }

    let active = true;
    setTxLoading(true);
    getTransactions(ticket.phone)
      .then((txs) => {
        if (active) setTransactions(txs);
      })
      .catch(() => {
        if (active) setTransactions([]);
      })
      .finally(() => {
        if (active) setTxLoading(false);
      });

    return () => {
      active = false;
    };
  }, [ticket?.phone]);

  // Poll for ticket updates
  const pollTicket = useCallback(async () => {
    if (!ticket) return;
    try {
      const updated = await getTicket(ticket._id);
      if (updated.messages.length !== ticket.messages.length || updated.status !== ticket.status) {
        onTicketUpdate(updated);
      }
    } catch {
      // silent
    }
  }, [ticket, onTicketUpdate]);

  useEffect(() => {
    const interval = setInterval(pollTicket, 4000);
    return () => clearInterval(interval);
  }, [pollTicket]);

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

  const insertSnippet = (snippet: string) => {
    setInput((prev) => (prev ? `${prev} ${snippet}` : snippet));
  };

  const formatMsgTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Find relevant transaction for this ticket
  const mentionedTxId = ticket ? findMentionedTxId(ticket) : null;
  const matchedTx: Transaction | null =
    (mentionedTxId
      ? transactions.find((t) => t.tx_id.toUpperCase() === mentionedTxId.toUpperCase())
      : null) ||
    (transactions.length > 0 ? transactions[0] : null);

  const aiEval = ticket ? deriveAIEvaluation(ticket, matchedTx) : null;
  const priority = ticket ? deriveTicketPriority(ticket) : null;

  // Canned response quick chips
  const quickChips = [
    {
      label: 'Core Banking Verification',
      text: 'I have checked our core banking ledger and verified your transaction status with the switch.',
    },
    {
      label: '24–72h Reversal SLA',
      text: 'For failed transactions where your balance was deducted, the funds will auto-reverse to your wallet within 24–72 hours.',
    },
    {
      label: 'Request Recipient Confirmation',
      text: 'Please confirm the recipient wallet number and transaction timestamp so we can verify the dispute.',
    },
    {
      label: 'Case Resolved',
      text: 'Your balance reconciliation has been confirmed. Thank you for choosing PayFlow.',
    },
  ];

  // ── EMPTY STATE: OPERATIONS CENTER DASHBOARD ──
  if (!ticket) {
    const urgentTickets = allTickets.filter((t) => {
      if (t.status === 'resolved') return false;
      const prio = deriveTicketPriority(t);
      return prio.level === 'urgent' || prio.level === 'high';
    });

    return (
      <div className="conversation-panel ops-empty-dashboard">
        {/* Operations Welcome Banner */}
        <div className="ops-empty-hero">
          <div className="ops-empty-hero-header">
            <div>
              <span className="ops-empty-tag">MFS Operations Center</span>
              <h1 className="ops-empty-title">Customer Support & Case Investigation</h1>
              <p className="ops-empty-subtitle">
                Select a customer case from the queue to investigate transaction ledger evidence,
                review AI-assisted triage, and execute human-authorized decisions.
              </p>
            </div>
            <div className="ops-empty-system-status">
              <span className="system-status-indicator" />
              <span className="system-status-label">AI Copilot Engine Active</span>
            </div>
          </div>
        </div>

        {/* Responsible AI Flow Diagram */}
        <div className="ops-workflow-section">
          <div className="ops-workflow-header">
            <span className="ops-workflow-title">Human-in-the-Loop Operational Flow</span>
            <span className="ops-workflow-tag">Standard Operating Procedure</span>
          </div>

          <div className="ops-workflow-steps">
            <div className="workflow-step">
              <div className="step-num">1</div>
              <div className="step-label">Customer Report</div>
              <div className="step-desc">Issue submitted via PayFlow wallet</div>
            </div>
            <div className="workflow-arrow">→</div>
            <div className="workflow-step">
              <div className="step-num">2</div>
              <div className="step-label">AI Triage</div>
              <div className="step-desc">Intent classification & ledger scan</div>
            </div>
            <div className="workflow-arrow">→</div>
            <div className="workflow-step">
              <div className="step-num">3</div>
              <div className="step-label">AI Recommendation</div>
              <div className="step-desc">Signals identified & advice drafted</div>
            </div>
            <div className="workflow-arrow">→</div>
            <div className="workflow-step highlight">
              <div className="step-num">4</div>
              <div className="step-label">Human Review</div>
              <div className="step-desc">Agent evaluates evidence & intent</div>
            </div>
            <div className="workflow-arrow">→</div>
            <div className="workflow-step highlight">
              <div className="step-num">5</div>
              <div className="step-label">Human Decision</div>
              <div className="step-desc">Authorization, response & resolution</div>
            </div>
          </div>
        </div>

        {/* Priority Triage Queue */}
        <div className="ops-urgent-section">
          <div className="ops-urgent-header">
            <h3>Cases Requiring Agent Attention ({urgentTickets.length})</h3>
            <span className="urgent-badge-pill">High Financial Priority</span>
          </div>

          {urgentTickets.length === 0 ? (
            <div className="ops-empty-clean-card">
              <span className="clean-icon">✓</span>
              <div>
                <strong>Queue in good standing</strong>
                <p>No high-priority or escalated tickets currently pending initial agent triage.</p>
              </div>
            </div>
          ) : (
            <div className="ops-urgent-grid">
              {urgentTickets.map((t) => {
                const p = deriveTicketPriority(t);
                const ev = deriveAIEvaluation(t);
                return (
                  <div
                    key={t._id}
                    className="ops-urgent-card"
                    onClick={() => onSelectTicket && onSelectTicket(t)}
                  >
                    <div className="urgent-card-top">
                      <span className="urgent-card-token">{t.token}</span>
                      <span className={`priority-badge ${p.badgeClass}`}>{p.label}</span>
                      <span className="urgent-card-time">{formatTimeAgo(t.updatedAt)}</span>
                    </div>
                    <div className="urgent-card-cust">
                      <strong>{t.user?.name || t.phone}</strong> · {t.phone}
                    </div>
                    <div className="urgent-card-preview">
                      "{t.messages[0]?.content.slice(0, 85)}..."
                    </div>
                    <div className="urgent-card-bottom">
                      <span className={`ticket-ai-chip ${ev.badgeClass}`}>
                        AI: {ev.recommendation}
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectTicket) onSelectTicket(t);
                        }}
                      >
                        Inspect Case →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── ACTIVE CASE INVESTIGATION WORKSPACE ──
  return (
    <div className="conversation-panel">
      {/* 1. Header: Customer Identity & Case Controls */}
      <div className="conversation-header">
        <div className="conversation-header-info">
          <div className="conversation-avatar">
            {(ticket.user?.name || ticket.phone).slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="conversation-customer-name">
              {ticket.user?.name || 'Customer Account'}
              {priority && (
                <span className={`priority-badge ${priority.badgeClass}`} style={{ marginLeft: 8 }}>
                  {priority.label}
                </span>
              )}
            </div>
            <div className="conversation-customer-detail">
              <span>{ticket.phone}</span>
              <span className="dot-sep">·</span>
              <span className="detail-token">{ticket.token}</span>
              <span className="dot-sep">·</span>
              <span className="detail-balance">
                Available: <strong>৳{formatBDT(ticket.user?.balance)}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Status controls */}
        <div className="conversation-header-actions">
          <div className="status-control-group">
            <span className="status-label">Case Status:</span>
            <select
              id="ticket-status-select"
              className="status-select"
              value={ticket.status}
              onChange={(e) => handleStatusChange(e.target.value)}
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {ticket.status !== 'resolved' ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm resolve-btn"
              onClick={() => handleStatusChange('resolved')}
              title="Mark ticket as resolved"
            >
              ✓ Resolve Case
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleStatusChange('in_progress')}
              title="Reopen ticket"
            >
              Reopen
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Investigation Context Bar: Relevant Transaction & AI Triage Synopsis */}
      <div className="case-context-banner">
        {/* Transaction Context Card */}
        <div className="context-tx-box">
          <div className="context-box-title">
            <span className="context-icon">💳</span>
            <span>Transaction Ledger Evidence</span>
            {txLoading && <span className="tx-loading-tag">Loading...</span>}
          </div>

          {matchedTx ? (
            <div className="context-tx-details">
              <div className="context-tx-main">
                <span className="tx-id-badge">{matchedTx.tx_id}</span>
                <span className="tx-amount">৳{formatBDT(matchedTx.amount)}</span>
                <span className={`tx-status-pill tx-status-${matchedTx.status}`}>
                  {matchedTx.status.toUpperCase()}
                </span>
              </div>
              <div className="context-tx-meta">
                <span>
                  {matchedTx.sender === ticket.phone ? 'Recipient: ' : 'Sender: '}
                  <strong>{matchedTx.sender === ticket.phone ? matchedTx.receiver : matchedTx.sender}</strong>
                </span>
                <span className="dot-sep">·</span>
                <span>{new Date(matchedTx.time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                <span className="dot-sep">·</span>
                <span className="tx-safe-tag">
                  {matchedTx.fraud_decision ? `Fraud: ${matchedTx.fraud_decision}` : 'No Fraud Flags'}
                </span>
              </div>
            </div>
          ) : (
            <div className="context-tx-none">
              No matching transaction record found for referenced numbers. Customer balance: ৳{formatBDT(ticket.user?.balance)}.
            </div>
          )}
        </div>

        {/* AI Synopsis Banner */}
        {aiEval && (
          <div className="context-ai-synopsis">
            <div className="context-box-title">
              <span className="ai-pulse-dot" />
              <span>AI Triage Synopsis</span>
              <span className={`ai-synopsis-tag ${aiEval.badgeClass}`}>{aiEval.recommendation}</span>
            </div>
            <div className="ai-synopsis-content">
              {aiEval.reasoning[0] || 'AI reviewed transaction and customer messages.'}
            </div>
          </div>
        )}
      </div>

      {/* 3. Messages Thread */}
      <div className="conversation-messages">
        {/* Customer Issue Card (First message pin) */}
        {ticket.messages[0] && (
          <div className="customer-original-issue-pin">
            <div className="issue-pin-header">
              <span className="pin-icon">📌</span>
              <span className="pin-title">Reported Customer Complaint</span>
              <span className="pin-time">{formatTimeAgo(ticket.messages[0].timestamp)}</span>
            </div>
            <div className="issue-pin-text">"{ticket.messages[0].content}"</div>
          </div>
        )}

        {/* Message bubbles */}
        {ticket.messages.map((msg, i) => {
          const isCustomer = msg.role === 'customer';
          const isAI = msg.role === 'ai';
          const isAgent = msg.role === 'agent';

          return (
            <div
              key={i}
              className={`admin-msg admin-msg-${msg.role}`}
            >
              <div className="admin-msg-sender-row">
                <span className={`sender-role-badge role-${msg.role}`}>
                  {isCustomer ? 'Customer' : isAI ? 'AI Assistant (Automated)' : 'Support Agent (Human)'}
                </span>
                <span className="sender-name">
                  {isCustomer ? ticket.user?.name || ticket.phone : isAI ? 'SupportIQ Bot' : 'Agent'}
                </span>
              </div>

              <div className="admin-msg-bubble">
                {isAI && <div className="ai-badge-watermark">Automated Advisory</div>}
                <div className="msg-text-body">{msg.content}</div>
              </div>

              <div className="admin-msg-time">{formatMsgTime(msg.timestamp)}</div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 4. Quick Response Chips */}
      <div className="conversation-quick-chips">
        <span className="quick-chips-label">Quick Snippets:</span>
        <div className="quick-chips-list">
          {quickChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              className="quick-chip-btn"
              onClick={() => insertSnippet(chip.text)}
              title={chip.text}
            >
              + {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Agent Response Composer */}
      <form className="conversation-input-bar" onSubmit={handleSend}>
        <div className="composer-agent-tag">
          <span className="agent-indicator" />
          <span>Human Decision</span>
        </div>

        <input
          id="admin-message-input"
          className="input conversation-input"
          type="text"
          placeholder="Type human response to customer (e.g. status explanation, reversal update)..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />

        <button
          id="admin-message-send"
          className="btn btn-primary"
          type="submit"
          disabled={loading || !input.trim()}
        >
          {loading ? 'Sending...' : 'Send as Agent'}
        </button>
      </form>
    </div>
  );
}

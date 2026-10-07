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
      label: '24–72h Auto Reversal',
      text: 'For failed transactions where balance was deducted, funds auto-reverse within 24–72 hours.',
    },
    {
      label: 'Ledger Verified',
      text: 'Our team verified the core banking ledger; the transaction has been flagged for prioritized reconciliation.',
    },
    {
      label: 'Request Details',
      text: 'Could you please confirm the recipient number and transaction timestamp?',
    },
    {
      label: 'Case Resolved',
      text: 'Your balance reconciliation is complete. Thank you for using PayFlow support.',
    },
  ];

  // ── EMPTY STATE: CLEAN INBOX OVERVIEW ──
  if (!ticket) {
    const pendingCases = allTickets.filter((t) => t.status !== 'resolved');

    return (
      <main className="conversation-panel empty-inbox-view">
        <div className="empty-inbox-center">
          <div className="empty-inbox-icon">💬</div>
          <h2>Select a Customer Case</h2>
          <p>Choose an item from the queue on the left to start review, inspect ledger records, and respond.</p>

          {pendingCases.length > 0 && (
            <div className="empty-inbox-list">
              <div className="empty-inbox-header">Active Cases Waiting ({pendingCases.length})</div>
              {pendingCases.slice(0, 3).map((t) => (
                <div
                  key={t._id}
                  className="empty-case-card"
                  onClick={() => onSelectTicket && onSelectTicket(t)}
                >
                  <div className="empty-case-top">
                    <span className="empty-case-token">{t.token}</span>
                    <span className="empty-case-user">{t.user?.name || t.phone}</span>
                    <span className="empty-case-time">{formatTimeAgo(t.updatedAt)}</span>
                  </div>
                  <div className="empty-case-snippet">
                    "{t.messages[0]?.content.slice(0, 90)}..."
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    );
  }

  // ── ACTIVE CONVERSATION WORKSPACE ──
  return (
    <main className="conversation-panel">
      {/* 1. Header: Customer Identity & Actions */}
      <header className="conv-header">
        <div className="conv-header-left">
          <div className="conv-avatar">
            {(ticket.user?.name || ticket.phone).slice(0, 2).toUpperCase()}
          </div>
          <div className="conv-user-info">
            <div className="conv-name-row">
              <span className="conv-customer-name">
                {ticket.user?.name || 'Customer Account'}
              </span>
              <span className="conv-token-pill">{ticket.token}</span>
              {priority?.level === 'urgent' && (
                <span className="conv-priority-urgent">Urgent</span>
              )}
            </div>
            <div className="conv-meta-row">
              <span>{ticket.phone}</span>
              <span className="sep">•</span>
              <span>
                Wallet Balance: <strong>৳{formatBDT(ticket.user?.balance)}</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="conv-header-right">
          <div className="conv-status-wrapper">
            <select
              id="ticket-status-select"
              className="conv-status-select"
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
              className="btn btn-primary btn-sm conv-resolve-btn"
              onClick={() => handleStatusChange('resolved')}
            >
              Resolve Case
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleStatusChange('in_progress')}
            >
              Reopen
            </button>
          )}
        </div>
      </header>

      {/* 2. Sleek Context Bar: Combines Transaction & AI Triage cleanly */}
      <div className="conv-context-strip">
        {matchedTx ? (
          <div className="context-strip-item tx-item">
            <span className="context-strip-label">Transaction:</span>
            <span className="context-tx-badge">{matchedTx.tx_id}</span>
            <span className="context-tx-amount">৳{formatBDT(matchedTx.amount)}</span>
            <span className={`context-status-pill status-${matchedTx.status}`}>
              {matchedTx.status.toUpperCase()}
            </span>
            <span className="context-tx-party">
              {matchedTx.sender === ticket.phone ? `to ${matchedTx.receiver}` : `from ${matchedTx.sender}`}
            </span>
          </div>
        ) : (
          <div className="context-strip-item">
            <span className="context-strip-label">Ledger:</span>
            <span>No specific transaction linked</span>
          </div>
        )}

        {aiEval && (
          <div className="context-strip-item ai-item">
            <span className="context-strip-label">AI Triage:</span>
            <span className="context-ai-rec">{aiEval.recommendation}</span>
            <span className="context-ai-reason">{aiEval.reasoning[0] || ''}</span>
          </div>
        )}
      </div>

      {/* 3. Messages Stream */}
      <div className="conv-messages-container">
        {ticket.messages.map((msg, i) => {
          const isCustomer = msg.role === 'customer';
          const isAI = msg.role === 'ai';
          const isAgent = msg.role === 'agent';

          return (
            <div
              key={i}
              className={`conv-msg-row ${
                isCustomer ? 'row-customer' : isAI ? 'row-ai' : 'row-agent'
              }`}
            >
              <div className="conv-bubble-wrapper">
                <div className="conv-msg-header">
                  <span className="conv-sender-badge">
                    {isCustomer ? 'Customer' : isAI ? 'AI Copilot' : 'Human Agent'}
                  </span>
                  <span className="conv-msg-time">{formatMsgTime(msg.timestamp)}</span>
                </div>

                <div className="conv-bubble-body">
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 4. Quick Response Snippets */}
      <div className="conv-quick-bar">
        <span className="quick-bar-title">Quick Reply:</span>
        <div className="quick-bar-chips">
          {quickChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              className="quick-chip"
              onClick={() => insertSnippet(chip.text)}
              title={chip.text}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Reply Composer */}
      <form className="conv-composer" onSubmit={handleSend}>
        <input
          id="admin-message-input"
          className="conv-composer-input"
          type="text"
          placeholder="Reply to customer (e.g. explain status or reversal)..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button
          id="admin-message-send"
          className="btn btn-primary conv-send-btn"
          type="submit"
          disabled={loading || !input.trim()}
        >
          {loading ? 'Sending...' : 'Send Reply'}
        </button>
      </form>
    </main>
  );
}

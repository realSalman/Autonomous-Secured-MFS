import React, { useState } from 'react';
import type { Ticket } from '../../types/index';
import {
  deriveTicketPriority,
  deriveAIEvaluation,
  formatBDT,
  formatTimeAgo,
  findMentionedTxId,
  deriveRecentActivity,
} from './adminUtils';

interface TicketListProps {
  tickets: Ticket[];
  selectedId: string | null;
  onSelect: (ticket: Ticket) => void;
  filter: string;
  onFilterChange: (filter: string) => void;
  loading?: boolean;
}

export function TicketList({
  tickets,
  selectedId,
  onSelect,
  filter,
  onFilterChange,
  loading = false,
}: TicketListProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'queue' | 'activity'>('queue');

  // Filter tickets
  const filteredTickets = tickets.filter((t) => {
    // Status / quick filter
    if (filter === 'open' && t.status !== 'open') return false;
    if (filter === 'in_progress' && t.status !== 'in_progress') return false;
    if (filter === 'resolved' && t.status !== 'resolved') return false;
    if (filter === 'human_review') {
      const prio = deriveTicketPriority(t);
      if (t.status === 'resolved' || (prio.level !== 'urgent' && prio.level !== 'high')) {
        return false;
      }
    }
    if (filter === 'pending') {
      if (t.status === 'resolved') return false;
      const lastMsg = t.messages[t.messages.length - 1];
      const isPending =
        (lastMsg && lastMsg.role === 'agent') ||
        t.category.includes('wrong') ||
        t.category.includes('reversal');
      if (!isPending) return false;
    }
    if (filter === 'ai_analyzed') {
      if (!t.messages.some((m) => m.role === 'ai')) return false;
    }

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      const inToken = t.token.toLowerCase().includes(q);
      const inPhone = t.phone.toLowerCase().includes(q);
      const inName = (t.user?.name || '').toLowerCase().includes(q);
      const inCategory = (t.category || '').toLowerCase().includes(q);
      const inMessages = t.messages.some((m) => m.content.toLowerCase().includes(q));
      if (!inToken && !inPhone && !inName && !inCategory && !inMessages) {
        return false;
      }
    }

    return true;
  });

  const getFinancialAmount = (ticket: Ticket): string | null => {
    for (const msg of ticket.messages) {
      const match = msg.content.match(/[৳$]\s*([\d,]+)/);
      if (match) return `৳${match[1]}`;
    }
    return null;
  };

  const getCustomerIssueSnippet = (ticket: Ticket): string => {
    const custMsg = ticket.messages.find((m) => m.role === 'customer');
    if (!custMsg) return 'No customer message recorded';
    return custMsg.content;
  };

  const recentActivities = deriveRecentActivity(tickets);

  return (
    <aside className="ticket-list-panel">
      {/* Header with Search and Tab Switcher */}
      <div className="ticket-list-header">
        <div className="ticket-header-top">
          <div className="ticket-header-title">
            <h3>Inbox Queue</h3>
            <span className="ticket-queue-pill">{filteredTickets.length}</span>
          </div>

          <div className="ticket-tabs">
            <button
              type="button"
              className={`ticket-tab-item ${activeTab === 'queue' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('queue')}
            >
              Cases
            </button>
            <button
              type="button"
              className={`ticket-tab-item ${activeTab === 'activity' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('activity')}
            >
              Feed
            </button>
          </div>
        </div>

        {activeTab === 'queue' && (
          <div className="ticket-search-wrapper">
            <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              id="ticket-search"
              className="ticket-search-field"
              type="text"
              placeholder="Filter by customer, phone, Tx..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        )}
      </div>

      {/* Body: Tickets or Activity Feed */}
      <div className="ticket-list-body">
        {activeTab === 'activity' ? (
          <div className="ops-activity-feed">
            <div className="feed-header">Recent System Events</div>
            <div className="feed-list">
              {recentActivities.length === 0 ? (
                <div className="feed-empty">No activity records yet.</div>
              ) : (
                recentActivities.map((ev) => (
                  <div key={ev.id} className="feed-item">
                    <span className={`feed-indicator feed-${ev.actor.toLowerCase()}`} />
                    <div className="feed-info">
                      <div className="feed-top">
                        <span className="feed-token">{ev.ticketToken}</span>
                        <span className="feed-time">{formatTimeAgo(ev.time)}</span>
                      </div>
                      <div className="feed-desc">{ev.description}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : loading ? (
          <div className="queue-loading">
            <div className="loading-spinner" />
            <span>Loading cases...</span>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="queue-empty">
            <span className="empty-icon">📭</span>
            <h4>No cases match</h4>
            <p>Try clearing your search or selecting "All Cases".</p>
            {filter && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onFilterChange('')}
              >
                Show All Cases
              </button>
            )}
          </div>
        ) : (
          filteredTickets.map((ticket) => {
            const isSelected = selectedId === ticket._id;
            const priority = deriveTicketPriority(ticket);
            const aiEval = deriveAIEvaluation(ticket);
            const amount = getFinancialAmount(ticket);
            const txId = findMentionedTxId(ticket);

            return (
              <div
                key={ticket._id}
                id={`ticket-${ticket.token}`}
                className={`ticket-card ${isSelected ? 'is-selected' : ''}`}
                onClick={() => onSelect(ticket)}
              >
                {/* Row 1: Customer Name + Relative Time */}
                <div className="ticket-card-header">
                  <span className="ticket-card-name">
                    {ticket.user?.name || ticket.phone}
                  </span>
                  <span className="ticket-card-time">{formatTimeAgo(ticket.updatedAt)}</span>
                </div>

                {/* Row 2: Customer message excerpt */}
                <div className="ticket-card-preview">
                  {getCustomerIssueSnippet(ticket)}
                </div>

                {/* Row 3: Metadata Badges (Token, Tx, Amount, Priority, Status) */}
                <div className="ticket-card-footer">
                  <div className="ticket-meta-left">
                    <span className="ticket-token-label">{ticket.token}</span>
                    {amount && (
                      <span className="ticket-badge-amount">{amount}</span>
                    )}
                    {txId && (
                      <span className="ticket-badge-tx">{txId}</span>
                    )}
                    {priority.level === 'urgent' && (
                      <span className="ticket-badge-urgent">Urgent</span>
                    )}
                    {priority.level === 'high' && (
                      <span className="ticket-badge-high">High</span>
                    )}
                  </div>

                  <div className="ticket-meta-right">
                    <span className={`status-pill status-${ticket.status}`}>
                      {ticket.status === 'in_progress' ? 'In Progress' : ticket.status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

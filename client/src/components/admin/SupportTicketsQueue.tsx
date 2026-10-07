import React, { useState } from 'react';
import type { Ticket } from '../../types/index';
import {
  deriveTicketPriority,
  deriveAIEvaluation,
  formatBDT,
  formatTimeAgo,
} from './adminUtils';

interface SupportTicketsQueueProps {
  tickets: Ticket[];
  selectedId: string | null;
  onSelect: (ticket: Ticket) => void;
  filter: string;
  onFilterChange: (filter: string) => void;
  loading?: boolean;
}

export function SupportTicketsQueue({
  tickets,
  selectedId,
  onSelect,
  filter,
  onFilterChange,
  loading = false,
}: SupportTicketsQueueProps) {
  const [search, setSearch] = useState('');

  const openCount = tickets.filter((t) => t.status === 'open').length;

  const filteredTickets = tickets.filter((t) => {
    // Status filter
    if (filter === 'open' && t.status !== 'open') return false;
    if (filter === 'in_progress' && t.status !== 'in_progress') return false;
    if (filter === 'resolved' && t.status !== 'resolved') return false;
    if (filter === 'pending') {
      if (t.status === 'resolved') return false;
      const lastMsg = t.messages[t.messages.length - 1];
      const isPending =
        (lastMsg && lastMsg.role === 'agent') ||
        t.category.includes('wrong') ||
        t.category.includes('reversal');
      if (!isPending) return false;
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

  const getFinancialAmount = (ticket: Ticket): string => {
    for (const msg of ticket.messages) {
      const match = msg.content.match(/[৳$]\s*([\d,]+)/);
      if (match) return `৳${match[1]}`;
    }
    if (ticket.user?.balance != null) {
      return `৳${formatBDT(ticket.user.balance)}`;
    }
    return '৳0';
  };

  const getCategoryTitle = (ticket: Ticket): string => {
    if (ticket.category.includes('failed') || ticket.category.includes('payment')) {
      return 'Payment failed';
    }
    if (ticket.category.includes('wrong')) {
      return 'Wrong recipient';
    }
    if (ticket.category.includes('fraud') || ticket.category.includes('suspicious')) {
      return 'Possible fraud';
    }
    if (ticket.category.includes('balance')) {
      return 'Balance inquiry';
    }
    return ticket.category.replace(/_/g, ' ');
  };

  return (
    <div className="support-tickets-column">
      {/* Header */}
      <div className="tickets-col-header">
        <div className="tickets-header-left">
          <h3>Support Tickets</h3>
          <span className="tickets-open-pill">{openCount} open</span>
        </div>
        <button
          type="button"
          className="tickets-view-all"
          onClick={() => onFilterChange('')}
        >
          View all
        </button>
      </div>

      {/* Search Input */}
      <div className="tickets-search-bar">
        <svg className="tickets-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          className="tickets-search-input"
          placeholder="Search tickets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filter Tabs */}
      <div className="tickets-filter-tabs">
        <button
          type="button"
          className={`filter-tab-pill ${!filter ? 'is-active' : ''}`}
          onClick={() => onFilterChange('')}
        >
          All
        </button>
        <button
          type="button"
          className={`filter-tab-pill ${filter === 'open' ? 'is-active' : ''}`}
          onClick={() => onFilterChange('open')}
        >
          Open
        </button>
        <button
          type="button"
          className={`filter-tab-pill ${filter === 'in_progress' ? 'is-active' : ''}`}
          onClick={() => onFilterChange('in_progress')}
        >
          In Progress
        </button>
        <button
          type="button"
          className={`filter-tab-pill ${filter === 'pending' ? 'is-active' : ''}`}
          onClick={() => onFilterChange('pending')}
        >
          Pending
        </button>
        <button
          type="button"
          className={`filter-tab-pill ${filter === 'resolved' ? 'is-active' : ''}`}
          onClick={() => onFilterChange('resolved')}
        >
          Resolved
        </button>
      </div>

      {/* Ticket Cards List */}
      <div className="tickets-scroll-list">
        {loading ? (
          <div className="tickets-loading-state">Loading tickets...</div>
        ) : filteredTickets.length === 0 ? (
          <div className="tickets-empty-state">No tickets found.</div>
        ) : (
          filteredTickets.map((t) => {
            const isSelected = selectedId === t._id;
            const priority = deriveTicketPriority(t);
            const ev = deriveAIEvaluation(t);
            const amount = getFinancialAmount(t);
            const categoryTitle = getCategoryTitle(t);

            return (
              <div
                key={t._id}
                className={`queue-ticket-card ${isSelected ? 'is-selected' : ''}`}
                onClick={() => onSelect(t)}
              >
                {/* Row 1: Token, Priority badge, Time */}
                <div className="card-top-row">
                  <div className="token-prio-group">
                    <span className="card-token">{t.token}</span>
                    <span className={`card-priority-pill prio-${priority.level}`}>
                      {priority.label}
                    </span>
                  </div>
                  <span className="card-time">{formatTimeAgo(t.updatedAt)}</span>
                </div>

                {/* Row 2: Issue & Amount */}
                <div className="card-issue-row">
                  <span className="card-issue-text">{categoryTitle}</span>
                  <span className="card-dot">•</span>
                  <span className="card-amount">{amount}</span>
                </div>

                {/* Row 3: Customer & Phone */}
                <div className="card-customer-row">
                  {t.user?.name || 'Customer'} ({t.phone})
                </div>

                {/* Row 4: Status / AI Badge */}
                <div className="card-status-row">
                  {ev.recommendation === 'Human Review' && t.status !== 'resolved' ? (
                    <span className="card-status-badge badge-human-review">
                      Human Review
                    </span>
                  ) : (
                    <span className={`card-status-badge badge-${t.status}`}>
                      {t.status === 'in_progress' ? 'In Progress' : t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

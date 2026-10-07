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
  const [panelTab, setPanelTab] = useState<'queue' | 'workload'>('queue');

  // Filter tickets
  const filteredTickets = tickets.filter((t) => {
    // Status filter
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

  const getFinancialSnippet = (ticket: Ticket): string | null => {
    // Look for amounts mentioned in messages (e.g. ৳3,000 or ৳1500)
    for (const msg of ticket.messages) {
      const match = msg.content.match(/[৳$]\s*([\d,]+)/);
      if (match) return `৳${match[1]}`;
    }
    if (ticket.user?.balance != null) {
      return `Bal: ৳${formatBDT(ticket.user.balance)}`;
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
    <div className="ticket-list-panel">
      {/* Header with Search and Tab Switcher */}
      <div className="ticket-list-header">
        <div className="ticket-list-header-top">
          <div className="ticket-list-title-row">
            <h2>Support Queue</h2>
            <span className="ticket-count-pill">{filteredTickets.length} cases</span>
          </div>

          <div className="ticket-view-toggle">
            <button
              type="button"
              className={`view-toggle-btn ${panelTab === 'queue' ? 'is-active' : ''}`}
              onClick={() => setPanelTab('queue')}
            >
              Cases
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${panelTab === 'workload' ? 'is-active' : ''}`}
              onClick={() => setPanelTab('workload')}
            >
              Feed & Workload
            </button>
          </div>
        </div>

        {panelTab === 'queue' && (
          <>
            <div className="ticket-search-box">
              <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                id="ticket-search"
                className="input ticket-search-input"
                type="text"
                placeholder="Search by TKT, customer, phone, Tx..."
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

            <div className="ticket-filter-row">
              <button
                type="button"
                className={`ticket-filter-btn ${!filter ? 'active' : ''}`}
                onClick={() => onFilterChange('')}
              >
                All
              </button>
              <button
                type="button"
                className={`ticket-filter-btn ${filter === 'open' ? 'active' : ''}`}
                onClick={() => onFilterChange('open')}
              >
                Open
              </button>
              <button
                type="button"
                className={`ticket-filter-btn ${filter === 'in_progress' ? 'active' : ''}`}
                onClick={() => onFilterChange('in_progress')}
              >
                In Progress
              </button>
              <button
                type="button"
                className={`ticket-filter-btn ${filter === 'human_review' ? 'active' : ''}`}
                onClick={() => onFilterChange('human_review')}
              >
                Review Req.
              </button>
              <button
                type="button"
                className={`ticket-filter-btn ${filter === 'resolved' ? 'active' : ''}`}
                onClick={() => onFilterChange('resolved')}
              >
                Resolved
              </button>
            </div>
          </>
        )}
      </div>

      {/* Body: Tickets or Workload Feed */}
      <div className="ticket-list-body">
        {panelTab === 'workload' ? (
          <div className="ops-workload-container">
            {/* Workload Stats */}
            <div className="ops-workload-card">
              <div className="workload-card-title">Agent Operations Workload</div>
              <div className="workload-stats-grid">
                <div className="workload-stat-item">
                  <span className="workload-stat-val">
                    {tickets.filter((t) => t.status === 'open').length}
                  </span>
                  <span className="workload-stat-lbl">Open Queue</span>
                </div>
                <div className="workload-stat-item">
                  <span className="workload-stat-val">
                    {tickets.filter((t) => t.status === 'in_progress').length}
                  </span>
                  <span className="workload-stat-lbl">In Progress</span>
                </div>
                <div className="workload-stat-item">
                  <span className="workload-stat-val">
                    {tickets.filter((t) => t.status === 'resolved').length}
                  </span>
                  <span className="workload-stat-lbl">Resolved Today</span>
                </div>
                <div className="workload-stat-item">
                  <span className="workload-stat-val">
                    {tickets.filter((t) => t.messages.some((m) => m.role === 'ai')).length}
                  </span>
                  <span className="workload-stat-lbl">AI Triaged</span>
                </div>
              </div>
            </div>

            {/* Recent Activity Timeline */}
            <div className="ops-activity-section">
              <div className="activity-section-header">Recent Activity Timeline</div>
              <div className="activity-timeline">
                {recentActivities.length === 0 ? (
                  <div className="activity-empty">No recent activity logs.</div>
                ) : (
                  recentActivities.map((ev) => (
                    <div key={ev.id} className="activity-item">
                      <div className={`activity-dot activity-dot-${ev.actor.toLowerCase()}`} />
                      <div className="activity-content">
                        <div className="activity-top">
                          <span className="activity-token">{ev.ticketToken}</span>
                          <span className={`activity-actor-tag tag-${ev.actor.toLowerCase()}`}>
                            {ev.badge}
                          </span>
                          <span className="activity-time">{formatTimeAgo(ev.time)}</span>
                        </div>
                        <div className="activity-desc">{ev.description}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="loading" style={{ padding: 32 }}>
            <div className="loading-spinner" />
            <span className="loading-text">Loading support cases...</span>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="empty-state" style={{ padding: 32 }}>
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-title">No tickets match criteria</div>
            <div className="empty-state-desc">Try resetting your filter or search query.</div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 12 }}
              onClick={() => {
                onFilterChange('');
                setSearch('');
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredTickets.map((ticket) => {
            const isSelected = selectedId === ticket._id;
            const priority = deriveTicketPriority(ticket);
            const aiEval = deriveAIEvaluation(ticket);
            const financial = getFinancialSnippet(ticket);
            const txId = findMentionedTxId(ticket);

            return (
              <div
                key={ticket._id}
                id={`ticket-${ticket.token}`}
                className={`ticket-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelect(ticket)}
              >
                {/* Top Row: Token, Priority & Time */}
                <div className="ticket-item-top">
                  <div className="ticket-token-group">
                    <span className="ticket-item-token">{ticket.token}</span>
                    <span className={`priority-badge ${priority.badgeClass}`}>
                      {priority.label}
                    </span>
                  </div>
                  <span className="ticket-item-time">{formatTimeAgo(ticket.updatedAt)}</span>
                </div>

                {/* Customer Identity Row */}
                <div className="ticket-customer-row">
                  <span className="ticket-customer-name">
                    {ticket.user?.name || ticket.phone}
                  </span>
                  {ticket.user?.name && (
                    <span className="ticket-customer-phone">{ticket.phone}</span>
                  )}
                </div>

                {/* Financial Context & Category Pills */}
                <div className="ticket-pill-row">
                  {financial && (
                    <span className="ticket-finance-pill" title="Reported Amount or Balance">
                      {financial}
                    </span>
                  )}
                  {txId && (
                    <span className="ticket-tx-pill" title="Transaction Reference">
                      {txId}
                    </span>
                  )}
                  <span className="ticket-cat-pill">
                    {aiEval.categoryLabel}
                  </span>
                </div>

                {/* Customer Issue Preview */}
                <div className="ticket-item-preview" title={getCustomerIssueSnippet(ticket)}>
                  "{getCustomerIssueSnippet(ticket)}"
                </div>

                {/* Bottom Row: AI Recommendation & Status */}
                <div className="ticket-item-bottom">
                  <span className={`ticket-ai-chip ${aiEval.badgeClass}`}>
                    <span className="ai-chip-dot" />
                    AI: {aiEval.recommendation}
                  </span>

                  <span className={`badge badge-${ticket.status}`}>
                    {ticket.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

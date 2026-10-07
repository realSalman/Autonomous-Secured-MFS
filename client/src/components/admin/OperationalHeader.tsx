import React from 'react';
import type { Ticket } from '../../types/index';
import { deriveAIEvaluation, deriveTicketPriority } from './adminUtils';

interface OperationalHeaderProps {
  tickets: Ticket[];
  activeFilter: string;
  onFilterSelect: (filter: string) => void;
}

export function OperationalHeader({
  tickets,
  activeFilter,
  onFilterSelect,
}: OperationalHeaderProps) {
  const total = tickets.length;
  const openCount = tickets.filter((t) => t.status === 'open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;
  const resolvedCount = tickets.filter((t) => t.status === 'resolved').length;

  const humanReviewCount = tickets.filter((t) => {
    if (t.status === 'resolved') return false;
    const prio = deriveTicketPriority(t);
    return prio.level === 'urgent' || prio.level === 'high';
  }).length;

  const aiAnalyzedCount = tickets.filter((t) =>
    t.messages.some((m) => m.role === 'ai')
  ).length;

  const filterTabs = [
    { id: '', label: 'All Cases', count: total },
    { id: 'open', label: 'Open', count: openCount, badgeColor: 'tab-badge-blue' },
    { id: 'in_progress', label: 'In Progress', count: inProgressCount, badgeColor: 'tab-badge-amber' },
    { id: 'human_review', label: 'Action Required', count: humanReviewCount, badgeColor: 'tab-badge-rose' },
    { id: 'ai_analyzed', label: 'AI Triaged', count: aiAnalyzedCount, badgeColor: 'tab-badge-indigo' },
    { id: 'resolved', label: 'Resolved', count: resolvedCount, badgeColor: 'tab-badge-emerald' },
  ];

  return (
    <header className="ops-header-bar">
      <div className="ops-header-left">
        <div className="ops-brand-badge">
          <span className="ops-live-dot" />
          <span className="ops-brand-name">Support Operations</span>
        </div>
        <div className="ops-filter-tabs">
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`ops-tab-btn ${isActive ? 'is-active' : ''}`}
                onClick={() => onFilterSelect(tab.id)}
              >
                <span>{tab.label}</span>
                <span className={`ops-tab-count ${tab.badgeColor || ''}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="ops-header-right">
        <div className="ops-guardrail-pill" title="Every AI suggestion requires human agent approval">
          <span className="ops-guardrail-icon">🛡️</span>
          <span>Human-in-the-Loop Active</span>
        </div>
        <div className="ops-ai-status">
          <span className="ops-ai-indicator" />
          <span>AI Engine Ready</span>
        </div>
      </div>
    </header>
  );
}

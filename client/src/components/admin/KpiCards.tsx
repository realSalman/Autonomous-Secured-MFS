import React from 'react';
import type { Ticket } from '../../types/index';
import { deriveTicketPriority } from './adminUtils';

interface KpiCardsProps {
  tickets: Ticket[];
  activeFilter: string;
  onFilterSelect: (filter: string) => void;
}

export function KpiCards({ tickets, activeFilter, onFilterSelect }: KpiCardsProps) {
  const openCount = tickets.filter((t) => t.status === 'open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;
  const resolvedCount = tickets.filter((t) => t.status === 'resolved').length;

  const pendingCount = tickets.filter((t) => {
    if (t.status === 'resolved') return false;
    const lastMsg = t.messages[t.messages.length - 1];
    return (
      (lastMsg && lastMsg.role === 'agent') ||
      t.category.includes('wrong') ||
      t.category.includes('reversal')
    );
  }).length;

  const aiAnalyzedCount = tickets.filter((t) =>
    t.messages.some((m) => m.role === 'ai')
  ).length;

  const humanReviewCount = tickets.filter((t) => {
    if (t.status === 'resolved') return false;
    const prio = deriveTicketPriority(t);
    return prio.level === 'urgent' || prio.level === 'high';
  }).length;

  const cards = [
    {
      id: 'open',
      title: 'Open Tickets',
      value: openCount,
      trend: `${openCount > 0 ? `↑ ${openCount}` : '0'} vs. yesterday`,
      trendClass: 'trend-up',
      bgClass: 'kpi-card-rose',
      iconClass: 'icon-rose',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
    },
    {
      id: 'in_progress',
      title: 'In Progress',
      value: inProgressCount,
      trend: `${inProgressCount > 0 ? `↑ ${inProgressCount}` : '0'} vs. yesterday`,
      trendClass: 'trend-up',
      bgClass: 'kpi-card-blue',
      iconClass: 'icon-blue',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      id: 'pending',
      title: 'Pending',
      value: pendingCount,
      trend: `${pendingCount > 0 ? `↓ ${pendingCount}` : '0'} vs. yesterday`,
      trendClass: 'trend-down',
      bgClass: 'kpi-card-amber',
      iconClass: 'icon-amber',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
        </svg>
      ),
    },
    {
      id: 'resolved',
      title: 'Resolved Today',
      value: resolvedCount,
      trend: `${resolvedCount > 0 ? `↑ ${resolvedCount}` : '0'} vs. yesterday`,
      trendClass: 'trend-up',
      bgClass: 'kpi-card-green',
      iconClass: 'icon-green',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
    {
      id: 'ai_analyzed',
      title: 'AI Analyzed',
      value: aiAnalyzedCount,
      trend: `${aiAnalyzedCount > 0 ? `↑ ${aiAnalyzedCount}` : '0'} vs. yesterday`,
      trendClass: 'trend-up',
      bgClass: 'kpi-card-purple',
      iconClass: 'icon-purple',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <circle cx="12" cy="5" r="2" />
          <path d="M12 7v4" />
          <line x1="8" y1="16" x2="8" y2="16" />
          <line x1="16" y1="16" x2="16" y2="16" />
        </svg>
      ),
    },
    {
      id: 'human_review',
      title: 'Human Review Required',
      value: humanReviewCount,
      trend: `${humanReviewCount > 0 ? `↑ ${humanReviewCount}` : '0'} vs. yesterday`,
      trendClass: 'trend-up',
      bgClass: 'kpi-card-teal',
      iconClass: 'icon-teal',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      ),
    },
  ];

  return (
    <div className="secureassist-kpi-grid">
      {cards.map((c) => {
        const isSelected = activeFilter === c.id;
        return (
          <div
            key={c.id}
            className={`dashboard-kpi-card ${c.bgClass} ${isSelected ? 'is-selected' : ''}`}
            onClick={() => onFilterSelect(isSelected ? '' : c.id)}
            role="button"
            tabIndex={0}
          >
            <div className="kpi-card-header">
              <span className={`kpi-card-icon-badge ${c.iconClass}`}>
                {c.icon}
              </span>
              <span className="kpi-card-title">{c.title}</span>
            </div>
            <div className="kpi-card-value">{c.value}</div>
            <div className={`kpi-card-trend ${c.trendClass}`}>{c.trend}</div>
          </div>
        );
      })}
    </div>
  );
}

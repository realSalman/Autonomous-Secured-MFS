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
  // Derive operational metrics safely from loaded tickets
  const total = tickets.length;
  const openCount = tickets.filter((t) => t.status === 'open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;
  const resolvedCount = tickets.filter((t) => t.status === 'resolved').length;

  // Pending / Waiting: in progress or open tickets where waiting on info or settlement
  const pendingCount = tickets.filter((t) => {
    if (t.status === 'resolved') return false;
    const lastMsg = t.messages[t.messages.length - 1];
    return (
      (lastMsg && lastMsg.role === 'agent') ||
      t.category.includes('wrong') ||
      t.category.includes('reversal')
    );
  }).length;

  // AI Analyzed: tickets that have at least one AI message
  const aiAnalyzedCount = tickets.filter((t) =>
    t.messages.some((m) => m.role === 'ai')
  ).length;

  // Human Review Required: open/in_progress tickets with high/urgent priority or dispute
  const humanReviewCount = tickets.filter((t) => {
    if (t.status === 'resolved') return false;
    const prio = deriveTicketPriority(t);
    return prio.level === 'urgent' || prio.level === 'high';
  }).length;

  // AI Decision breakdown
  let autoGuidanceCount = 0;
  let recHumanReviewCount = 0;
  let requestInfoCount = 0;
  let escalateCount = 0;

  for (const t of tickets) {
    const evalData = deriveAIEvaluation(t);
    if (evalData.recommendation === 'Auto-Guidance') autoGuidanceCount++;
    else if (evalData.recommendation === 'Human Review') recHumanReviewCount++;
    else if (evalData.recommendation === 'Request Info') requestInfoCount++;
    else if (evalData.recommendation === 'Escalate') escalateCount++;
  }

  const kpis = [
    {
      id: 'open',
      label: 'Open Cases',
      count: openCount,
      sublabel: 'Needs triage',
      badge: `${Math.round((openCount / (total || 1)) * 100)}% of queue`,
      colorClass: 'kpi-open',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
      ),
    },
    {
      id: 'in_progress',
      label: 'In Progress',
      count: inProgressCount,
      sublabel: 'Agent assigned',
      badge: 'Active work',
      colorClass: 'kpi-progress',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 11l-3 3-2-2" />
        </svg>
      ),
    },
    {
      id: 'pending',
      label: 'Pending / Waiting',
      count: pendingCount,
      sublabel: 'Awaiting info / SLA',
      badge: 'Holding',
      colorClass: 'kpi-pending',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      ),
    },
    {
      id: 'human_review',
      label: 'Human Review Required',
      count: humanReviewCount,
      sublabel: 'High financial impact',
      badge: 'Action needed',
      colorClass: 'kpi-review',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
    {
      id: 'ai_analyzed',
      label: 'AI Analyzed',
      count: aiAnalyzedCount,
      sublabel: 'Auto-triaged cases',
      badge: `${total > 0 ? Math.round((aiAnalyzedCount / total) * 100) : 100}% coverage`,
      colorClass: 'kpi-ai',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <circle cx="12" cy="5" r="2" />
          <path d="M12 7v4" />
          <line x1="8" y1="16" x2="8" y2="16" />
          <line x1="16" y1="16" x2="16" y2="16" />
        </svg>
      ),
    },
    {
      id: 'resolved',
      label: 'Resolved',
      count: resolvedCount,
      sublabel: 'Completed cases',
      badge: 'Closed',
      colorClass: 'kpi-resolved',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
  ];

  return (
    <div className="admin-ops-bar">
      {/* KPI Cards Row */}
      <div className="ops-kpi-grid">
        {kpis.map((kpi) => {
          const isSelected = activeFilter === kpi.id;
          return (
            <div
              key={kpi.id}
              className={`ops-kpi-card ${kpi.colorClass} ${isSelected ? 'is-selected' : ''}`}
              onClick={() => onFilterSelect(isSelected ? '' : kpi.id)}
              role="button"
              tabIndex={0}
              title={`Click to filter by ${kpi.label}`}
            >
              <div className="ops-kpi-top">
                <span className="ops-kpi-icon">{kpi.icon}</span>
                <span className="ops-kpi-badge">{kpi.badge}</span>
              </div>
              <div className="ops-kpi-value">{kpi.count}</div>
              <div className="ops-kpi-label">{kpi.label}</div>
              <div className="ops-kpi-sublabel">{kpi.sublabel}</div>
            </div>
          );
        })}
      </div>

      {/* AI Decision Intelligence Strip */}
      <div className="ops-ai-strip">
        <div className="ops-ai-strip-left">
          <span className="ops-ai-pulse" />
          <span className="ops-ai-title">AI Support Intelligence</span>
          <span className="ops-ai-count">
            <strong>{aiAnalyzedCount}</strong> cases analyzed
          </span>
        </div>

        <div className="ops-ai-strip-actions">
          <div className="ops-ai-pill ops-pill-review">
            <span className="ops-ai-pill-dot" />
            <span className="ops-ai-pill-name">Human Review</span>
            <span className="ops-ai-pill-num">{recHumanReviewCount}</span>
          </div>

          <div className="ops-ai-pill ops-pill-auto">
            <span className="ops-ai-pill-dot" />
            <span className="ops-ai-pill-name">Auto Guidance</span>
            <span className="ops-ai-pill-num">{autoGuidanceCount}</span>
          </div>

          <div className="ops-ai-pill ops-pill-info">
            <span className="ops-ai-pill-dot" />
            <span className="ops-ai-pill-name">Request Info</span>
            <span className="ops-ai-pill-num">{requestInfoCount}</span>
          </div>

          <div className="ops-ai-pill ops-pill-escalate">
            <span className="ops-ai-pill-dot" />
            <span className="ops-ai-pill-name">Escalate</span>
            <span className="ops-ai-pill-num">{escalateCount}</span>
          </div>
        </div>

        <div className="ops-ai-strip-guardrail">
          <span className="ops-ai-guardrail-tag">Responsible AI</span>
          <span className="ops-ai-guardrail-text">Agent authorization required for financial reversals</span>
        </div>
      </div>
    </div>
  );
}

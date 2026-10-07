import React from 'react';
import type { Ticket } from '../../types/index';
import { deriveAIEvaluation, formatTimeAgo } from './adminUtils';

interface AnalyticsRowProps {
  tickets: Ticket[];
  onSelectTicket?: (ticket: Ticket) => void;
}

export function AnalyticsRow({ tickets, onSelectTicket }: AnalyticsRowProps) {
  // Derive real statistics from tickets
  const total = tickets.length || 1;
  const aiAnalyzedCount = tickets.filter((t) =>
    t.messages.some((m) => m.role === 'ai')
  ).length;

  let autoResolveCount = 0;
  let humanReviewCount = 0;
  let requestInfoCount = 0;
  let escalateCount = 0;
  let otherCount = 0;

  tickets.forEach((t) => {
    const ev = deriveAIEvaluation(t);
    if (ev.recommendation === 'Auto-Guidance') autoResolveCount++;
    else if (ev.recommendation === 'Human Review') humanReviewCount++;
    else if (ev.recommendation === 'Request Info') requestInfoCount++;
    else if (ev.recommendation === 'Escalate') escalateCount++;
    else otherCount++;
  });

  const categories = [
    { label: 'Auto Resolve', count: autoResolveCount, color: '#10b981' },
    { label: 'Human Review', count: humanReviewCount, color: '#f59e0b' },
    { label: 'Request Information', count: requestInfoCount, color: '#ef4444' },
    { label: 'Escalate', count: escalateCount, color: '#3b82f6' },
    { label: 'Other', count: otherCount, color: '#8b5cf6' },
  ];

  // Calculate SVG donut stroke dashes
  const circumference = 2 * Math.PI * 40; // r=40 -> ~251.32
  let accumulatedPercent = 0;
  const donutSegments = categories.map((cat) => {
    const fraction = (cat.count || 0) / (aiAnalyzedCount || total);
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += fraction;
    return { ...cat, strokeDasharray, strokeDashoffset };
  });

  // Recent AI Recommendations list
  const recentAiTickets = tickets.slice(0, 4);

  return (
    <div className="secureassist-analytics-row">
      {/* 1. AI Support Intelligence Card */}
      <div className="analytics-card ai-intelligence-card">
        <div className="analytics-card-header">
          <div className="card-header-left">
            <span className="ai-robot-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <circle cx="12" cy="5" r="2" />
                <path d="M12 7v4" />
                <line x1="8" y1="16" x2="8" y2="16" />
                <line x1="16" y1="16" x2="16" y2="16" />
              </svg>
            </span>
            <div>
              <div className="analytics-card-title">AI Support Intelligence</div>
              <div className="analytics-card-sub">How AI is helping your support team</div>
            </div>
          </div>
          <span className="live-status-pill">
            <span className="live-dot" /> Live
          </span>
        </div>

        <div className="donut-chart-container">
          <div className="donut-chart-wrapper">
            <svg width="130" height="130" viewBox="0 0 100 100" className="donut-svg">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="14"
              />
              {donutSegments.map((seg, i) => (
                <circle
                  key={i}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="14"
                  strokeDasharray={seg.strokeDasharray}
                  strokeDashoffset={seg.strokeDashoffset}
                  transform="rotate(-90 50 50)"
                />
              ))}
            </svg>
            <div className="donut-center-text">
              <span className="donut-count">{aiAnalyzedCount || tickets.length}</span>
              <span className="donut-label">Cases Analyzed</span>
            </div>
          </div>

          <div className="donut-legend-list">
            {categories.map((c, idx) => {
              const pct = Math.round(((c.count || 0) / (aiAnalyzedCount || total)) * 100);
              return (
                <div key={idx} className="legend-row">
                  <div className="legend-label-group">
                    <span className="legend-dot" style={{ backgroundColor: c.color }} />
                    <span className="legend-label">{c.label}</span>
                  </div>
                  <span className="legend-count">
                    <strong>{c.count}</strong> ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Ticket Status Trend Chart */}
      <div className="analytics-card ticket-trend-card">
        <div className="analytics-card-header">
          <div>
            <div className="analytics-card-title">Ticket Status Trend</div>
          </div>
          <div className="trend-legend-pills">
            <span className="trend-legend-item">
              <span className="trend-dot dot-open" /> Open
            </span>
            <span className="trend-legend-item">
              <span className="trend-dot dot-progress" /> In Progress
            </span>
            <span className="trend-legend-item">
              <span className="trend-dot dot-resolved" /> Resolved
            </span>
          </div>
        </div>

        <div className="trend-chart-body">
          <svg viewBox="0 0 420 140" className="trend-line-svg">
            {/* Grid lines */}
            <line x1="30" y1="20" x2="410" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
            <line x1="30" y1="55" x2="410" y2="55" stroke="#f1f5f9" strokeDasharray="3 3" />
            <line x1="30" y1="90" x2="410" y2="90" stroke="#f1f5f9" strokeDasharray="3 3" />
            <line x1="30" y1="120" x2="410" y2="120" stroke="#e2e8f0" />

            {/* Y Axis labels */}
            <text x="15" y="24" fontSize="9" fill="#94a3b8">30</text>
            <text x="15" y="59" fontSize="9" fill="#94a3b8">20</text>
            <text x="15" y="94" fontSize="9" fill="#94a3b8">10</text>
            <text x="18" y="124" fontSize="9" fill="#94a3b8">0</text>

            {/* Green (Resolved) line */}
            <path
              d="M 50 78 C 110 75, 170 82, 230 60 C 290 45, 350 55, 395 55"
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
            />
            <circle cx="50" cy="78" r="3.5" fill="#10b981" />
            <circle cx="230" cy="60" r="3.5" fill="#10b981" />
            <circle cx="395" cy="55" r="3.5" fill="#10b981" />

            {/* Blue (In Progress) line */}
            <path
              d="M 50 92 C 110 93, 170 84, 230 75 C 290 85, 350 82, 395 78"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
            />
            <circle cx="50" cy="92" r="3.5" fill="#3b82f6" />
            <circle cx="230" cy="75" r="3.5" fill="#3b82f6" />
            <circle cx="395" cy="78" r="3.5" fill="#3b82f6" />

            {/* Red (Open) line */}
            <path
              d="M 50 102 C 110 105, 170 100, 230 94 C 290 98, 350 96, 395 96"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2.5"
            />
            <circle cx="50" cy="102" r="3.5" fill="#ef4444" />
            <circle cx="230" cy="94" r="3.5" fill="#ef4444" />
            <circle cx="395" cy="96" r="3.5" fill="#ef4444" />

            {/* X Axis date labels */}
            <text x="40" y="136" fontSize="9" fill="#94a3b8">Oct 1</text>
            <text x="105" y="136" fontSize="9" fill="#94a3b8">Oct 2</text>
            <text x="170" y="136" fontSize="9" fill="#94a3b8">Oct 3</text>
            <text x="235" y="136" fontSize="9" fill="#94a3b8">Oct 4</text>
            <text x="300" y="136" fontSize="9" fill="#94a3b8">Oct 5</text>
            <text x="365" y="136" fontSize="9" fill="#94a3b8">Oct 6</text>
            <text x="388" y="136" fontSize="9" fill="#94a3b8">Oct 7</text>
          </svg>
        </div>
      </div>

      {/* 3. AI Copilot Overview Card */}
      <div className="analytics-card ai-copilot-summary-card">
        <div className="analytics-card-header">
          <div className="card-header-left">
            <span className="copilot-sparkle-icon">✨</span>
            <div className="analytics-card-title">AI Copilot</div>
          </div>
          <span className="copilot-active-pill">● Active</span>
        </div>

        <div className="copilot-advisory-box">
          <span className="advisory-icon">ℹ️</span>
          <p className="advisory-text">
            AI analyzes customer issues, checks transaction history, and provides recommendations. Human agents make the final decision.
          </p>
        </div>

        <div className="recent-rec-section">
          <div className="recent-rec-header">
            <span>Recent AI Recommendations</span>
            <span className="view-all-link">View all</span>
          </div>

          <div className="recent-rec-list">
            {recentAiTickets.map((t) => {
              const ev = deriveAIEvaluation(t);
              return (
                <div
                  key={t._id}
                  className="recent-rec-item"
                  onClick={() => onSelectTicket && onSelectTicket(t)}
                >
                  <div className="rec-item-left">
                    <span className="rec-ticket-token">{t.token}</span>
                    <span className="rec-snippet">
                      {ev.reasoning[0]?.slice(0, 36) || t.messages[0]?.content.slice(0, 36)}...
                    </span>
                  </div>
                  <div className="rec-item-right">
                    <span className={`rec-badge rec-badge-${ev.badgeClass}`}>
                      {ev.recommendation}
                    </span>
                    <span className="rec-time">{formatTimeAgo(t.updatedAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

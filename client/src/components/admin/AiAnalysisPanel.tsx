import React from 'react';
import type { Ticket, Transaction } from '../../types/index';
import {
  deriveAIEvaluation,
  findMentionedTxId,
  deriveRecentActivity,
  formatTimeAgo,
} from './adminUtils';

interface AiAnalysisPanelProps {
  ticket: Ticket | null;
  tickets: Ticket[];
  transactions: Transaction[];
  onAcceptRecommendation: (replyText: string) => void;
  onOverride: () => void;
  onRequestMoreInfo: () => void;
}

export function AiAnalysisPanel({
  ticket,
  tickets,
  transactions,
  onAcceptRecommendation,
  onOverride,
  onRequestMoreInfo,
}: AiAnalysisPanelProps) {
  // Derive real workload counts
  const openCount = tickets.filter((t) => t.status === 'open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;
  const resolvedCount = tickets.filter((t) => t.status === 'resolved').length;
  const waitingCount = tickets.filter((t) => {
    if (t.status === 'resolved') return false;
    const lastMsg = t.messages[t.messages.length - 1];
    return lastMsg && lastMsg.role === 'agent';
  }).length;

  const recentActivities = deriveRecentActivity(tickets).slice(0, 4);

  // If ticket is selected, derive AI evaluation
  const mentionedTxId = ticket ? findMentionedTxId(ticket) : null;
  const matchedTx =
    (mentionedTxId
      ? transactions.find((t) => t.tx_id.toUpperCase() === mentionedTxId.toUpperCase())
      : null) ||
    (transactions.length > 0 ? transactions[0] : null);

  const aiEval = ticket ? deriveAIEvaluation(ticket, matchedTx) : null;

  // Last AI message content as draft response
  const lastAiMsg = ticket
    ? [...ticket.messages].reverse().find((m) => m.role === 'ai')?.content ||
      'I have reviewed your case and flagged the transaction for prioritized investigation.'
    : '';

  return (
    <div className="ai-analysis-column">
      {/* 1. AI Analysis Card */}
      {ticket && aiEval && (
        <div className="ai-analysis-card">
          <div className="analysis-card-header">
            <h3>AI Analysis</h3>
            <span className={`analysis-status-pill badge-${aiEval.badgeClass}`}>
              {aiEval.recommendation}
            </span>
          </div>

          {/* Recommendation Box */}
          <div className="recommendation-box">
            <div className="rec-box-top">
              <span className="rec-warning-icon">⚠️</span>
              <div className="rec-box-title-group">
                <span className="rec-box-sub">Recommendation</span>
                <span className="rec-box-highlight">{aiEval.recommendation}</span>
              </div>
            </div>

            {/* Confidence Track */}
            <div className="rec-confidence-row">
              <span className="conf-label">Confidence</span>
              <span className="conf-value">{aiEval.confidence}%</span>
            </div>
            <div className="conf-track-bar">
              <div
                className="conf-track-fill"
                style={{ width: `${aiEval.confidence}%` }}
              />
            </div>
          </div>

          {/* Key Reasons */}
          <div className="reasons-section">
            <div className="reasons-header">Key Reasons</div>
            <ul className="reasons-list">
              {aiEval.reasoning.map((r, i) => (
                <li key={i} className="reason-item">
                  <span className="reason-bullet">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Suggested Next Action */}
          <div className="suggested-action-section">
            <div className="suggested-action-header">
              <span className="action-key-icon">💡</span>
              <span>Suggested Next Action</span>
            </div>
            <p className="suggested-action-text">{aiEval.suggestedAction}</p>
          </div>

          {/* Agent Action Buttons */}
          <div className="agent-actions-group">
            <button
              type="button"
              className="btn btn-primary action-btn-accept"
              onClick={() => onAcceptRecommendation(lastAiMsg)}
            >
              Accept Recommendation
            </button>
            <button
              type="button"
              className="btn btn-outline action-btn-override"
              onClick={onOverride}
            >
              Override
            </button>
            <button
              type="button"
              className="btn btn-outline action-btn-info"
              onClick={onRequestMoreInfo}
            >
              Request More Information
            </button>
          </div>
        </div>
      )}

      {/* 2. My Workload Card */}
      <div className="workload-card">
        <div className="workload-header">
          <div className="workload-title-left">
            <span className="workload-icon">📋</span>
            <h4>My Workload</h4>
          </div>
          <span className="view-all-link">View all</span>
        </div>

        <div className="workload-items-list">
          <div className="workload-row">
            <span className="workload-label">Assigned to me</span>
            <span className="workload-badge badge-blue">{openCount + inProgressCount}</span>
          </div>
          <div className="workload-row">
            <span className="workload-label">In Progress</span>
            <span className="workload-badge badge-blue">{inProgressCount}</span>
          </div>
          <div className="workload-row">
            <span className="workload-label">Waiting for customer</span>
            <span className="workload-badge badge-amber">{waitingCount || 1}</span>
          </div>
          <div className="workload-row">
            <span className="workload-label">Resolved today</span>
            <span className="workload-badge badge-green">{resolvedCount}</span>
          </div>
        </div>
      </div>

      {/* 3. Recent Activity Card */}
      <div className="recent-activity-card">
        <div className="recent-activity-header">
          <div className="activity-title-left">
            <span className="activity-icon">⏱️</span>
            <h4>Recent Activity</h4>
          </div>
        </div>

        <div className="activity-timeline-list">
          {recentActivities.length === 0 ? (
            <div className="activity-empty-text">No recent activity logs.</div>
          ) : (
            recentActivities.map((act) => (
              <div key={act.id} className="timeline-event-item">
                <span className={`event-dot dot-${act.actor.toLowerCase()}`} />
                <div className="event-content">
                  <div className="event-desc">{act.description}</div>
                  <div className="event-time">{formatTimeAgo(act.time)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

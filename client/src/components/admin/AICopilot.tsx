import React, { useState, useEffect } from 'react';
import type { Ticket, AISuggestion, Transaction } from '../../types/index';
import { getAISuggestion, getTransactions } from '../../api/index';
import {
  deriveAIEvaluation,
  findMentionedTxId,
  formatBDT,
} from './adminUtils';

interface AICopilotProps {
  ticket: Ticket | null;
  onUseReply: (text: string) => void;
}

export function AICopilot({ ticket, onUseReply }: AICopilotProps) {
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [editedText, setEditedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Fetch transactions for context
  useEffect(() => {
    if (!ticket?.phone) {
      setTransactions([]);
      return;
    }
    let active = true;
    getTransactions(ticket.phone)
      .then((txs) => {
        if (active) setTransactions(txs);
      })
      .catch(() => {
        if (active) setTransactions([]);
      });
    return () => {
      active = false;
    };
  }, [ticket?.phone]);

  // Load suggestion when ticket changes
  useEffect(() => {
    if (!ticket) {
      setSuggestion(null);
      setEditedText('');
      return;
    }

    // Find the last AI message as the initial suggestion
    const lastAiMsg = [...ticket.messages].reverse().find((m) => m.role === 'ai');
    if (lastAiMsg) {
      setSuggestion({
        suggestion: lastAiMsg.content,
        intent: ticket.category,
        actions: [],
        context: {
          userInfo: ticket.user || null,
          recentTransactions: [],
          knowledgeArticles: [],
        },
      });
      setEditedText(lastAiMsg.content);
    } else {
      setSuggestion(null);
      setEditedText('');
    }
  }, [ticket?._id, ticket?.messages.length]);

  const handleRegenerate = async () => {
    if (!ticket) return;
    setLoading(true);
    setError('');

    try {
      const result = await getAISuggestion(ticket._id);
      setSuggestion(result);
      setEditedText(result.suggestion);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate suggestion');
    } finally {
      setLoading(false);
    }
  };

  const handleUseReply = () => {
    if (editedText.trim()) {
      onUseReply(editedText.trim());
    }
  };

  const handleOverride = () => {
    const overrideTemplate = `Dear ${ticket?.user?.name || 'Customer'},\n\nI have personally reviewed your account details. Our operations team has escalated this case for manual verification. We will update you shortly.`;
    setEditedText(overrideTemplate);
  };

  const handleRequestInfo = () => {
    const infoTemplate = `Dear ${ticket?.user?.name || 'Customer'},\n\nCould you please confirm the exact time of the transaction, the recipient wallet number, and any SMS confirmation or error message received?`;
    setEditedText(infoTemplate);
  };

  // Find mentioned transaction
  const mentionedTxId = ticket ? findMentionedTxId(ticket) : null;
  const matchedTx =
    (mentionedTxId
      ? transactions.find((t) => t.tx_id.toUpperCase() === mentionedTxId.toUpperCase())
      : null) ||
    (transactions.length > 0 ? transactions[0] : null);

  const aiEval = ticket ? deriveAIEvaluation(ticket, matchedTx) : null;

  if (!ticket) {
    return (
      <div className="copilot-panel">
        <div className="copilot-header">
          <h2>
            <span className="copilot-indicator" />
            AI Copilot Intelligence
          </h2>
          <span className="copilot-status-badge">Standby</span>
        </div>
        <div className="copilot-empty-container">
          <div className="copilot-empty-icon">🤖</div>
          <div className="copilot-empty-title">Investigation Panel Inactive</div>
          <p className="copilot-empty-desc">
            Select a case from the queue to view AI-extracted signals, transaction evidence,
            confidence score, and recommended next actions.
          </p>
          <div className="copilot-empty-features">
            <div className="empty-feature-item">
              <span className="feature-check">✓</span>
              <span>Automated intent classification</span>
            </div>
            <div className="empty-feature-item">
              <span className="feature-check">✓</span>
              <span>Core banking ledger verification</span>
            </div>
            <div className="empty-feature-item">
              <span className="feature-check">✓</span>
              <span>Human agent decision controls</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="copilot-panel">
      {/* 1. Header */}
      <div className="copilot-header">
        <div className="copilot-header-title-row">
          <h2>
            <span className="copilot-indicator" />
            AI Case Intelligence
          </h2>
          <span className="copilot-status-badge">Live Advisory</span>
        </div>
        <span className="copilot-subtext">Automated triage for {ticket.token}</span>
      </div>

      <div className="copilot-body">
        {/* 2. AI Decision Box: Recommendation, Confidence & Intent */}
        {aiEval && (
          <div className="copilot-decision-card">
            <div className="decision-card-top">
              <div className="decision-label-group">
                <span className="decision-micro-label">Recommendation</span>
                <span className={`decision-rec-pill ${aiEval.badgeClass}`}>
                  ● {aiEval.recommendation}
                </span>
              </div>

              <div className="decision-conf-group">
                <span className="decision-micro-label">Confidence</span>
                <span className="decision-conf-value">{aiEval.confidence}%</span>
              </div>
            </div>

            {/* Confidence Progress Bar */}
            <div className="confidence-track">
              <div
                className="confidence-fill"
                style={{ width: `${aiEval.confidence}%` }}
              />
            </div>

            <div className="decision-intent-row">
              <span className="intent-label">Detected Intent:</span>
              <span className="copilot-intent-tag">{aiEval.categoryLabel}</span>
            </div>
          </div>
        )}

        {/* 3. Why AI Recommended This (Signals & Evidence) */}
        {aiEval && (
          <div className="copilot-section">
            <div className="copilot-section-header">
              <span className="section-icon">🔍</span>
              <span className="copilot-section-title">Why AI Recommended This</span>
            </div>
            <div className="copilot-signals-card">
              <ul className="copilot-signals-list">
                {aiEval.reasoning.map((reason, idx) => (
                  <li key={idx} className="copilot-signal-item">
                    <span className="signal-bullet">▪</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* 4. Suggested Next Action */}
        {aiEval && (
          <div className="copilot-section">
            <div className="copilot-section-header">
              <span className="section-icon">⚡</span>
              <span className="copilot-section-title">Suggested Next Action</span>
            </div>
            <div className="copilot-next-action-card">
              <div className="next-action-text">{aiEval.suggestedAction}</div>
            </div>
          </div>
        )}

        {/* 5. Agent Controls (Accept, Override, Request Info) */}
        <div className="copilot-section">
          <div className="copilot-section-header">
            <span className="section-icon">🛡️</span>
            <span className="copilot-section-title">Agent Controls (Human Decision)</span>
          </div>
          <div className="copilot-controls-row">
            <button
              type="button"
              className="btn btn-primary btn-sm control-btn"
              onClick={handleUseReply}
              disabled={!editedText.trim()}
              title="Accept AI recommendation and send reply to customer"
            >
              ✓ Accept & Send
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm control-btn"
              onClick={handleOverride}
              title="Override AI with manual agent review template"
            >
              Override AI
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm control-btn"
              onClick={handleRequestInfo}
              title="Ask customer for additional transaction details"
            >
              Request Info
            </button>
          </div>
        </div>

        {/* 6. Proposed Reply to Customer (Editable Textarea) */}
        <div className="copilot-section">
          <div className="copilot-section-header">
            <span className="section-icon">💬</span>
            <span className="copilot-section-title">Draft Reply to Customer</span>
          </div>

          {loading ? (
            <div className="copilot-suggestion">
              <div className="loading" style={{ padding: '16px 0' }}>
                <div className="loading-spinner" />
                <span className="loading-text">Generating new analysis...</span>
              </div>
            </div>
          ) : (
            <div className="copilot-suggestion">
              <textarea
                id="copilot-edit-area"
                className="copilot-edit-area"
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                rows={5}
                placeholder="AI drafted response will appear here. You can edit before sending."
              />
              <div className="copilot-suggestion-actions">
                <button
                  id="copilot-use-reply"
                  className="btn btn-primary btn-sm"
                  onClick={handleUseReply}
                  disabled={!editedText.trim()}
                >
                  Send to Customer
                </button>
                <button
                  id="copilot-regenerate"
                  className="btn btn-secondary btn-sm"
                  onClick={handleRegenerate}
                  disabled={loading}
                  title="Ask AI to regenerate suggested reply"
                >
                  Regenerate
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="alert alert-error" style={{ marginTop: 8 }}>
              {error}
            </div>
          )}
        </div>

        {/* 7. Customer Context Card */}
        <div className="copilot-section">
          <div className="copilot-section-header">
            <span className="section-icon">👤</span>
            <span className="copilot-section-title">Account Context</span>
          </div>
          <div className="copilot-context">
            <div className="copilot-context-item">
              <div className="copilot-context-label">Customer</div>
              <div className="copilot-context-value">{ticket.user?.name || 'Unregistered'}</div>
            </div>
            <div className="copilot-context-item">
              <div className="copilot-context-label">Wallet Number</div>
              <div className="copilot-context-value">{ticket.phone}</div>
            </div>
            <div className="copilot-context-item">
              <div className="copilot-context-label">Available Balance</div>
              <div className="copilot-context-value">
                ৳{formatBDT(ticket.user?.balance)}
              </div>
            </div>
            <div className="copilot-context-item">
              <div className="copilot-context-label">Active Ticket</div>
              <div className="copilot-context-value">
                {ticket.token} ({ticket.messages.length} msgs)
              </div>
            </div>
          </div>
        </div>

        {/* 8. Responsible AI Governance Banner */}
        <div className="copilot-governance-notice">
          <div className="governance-title">Responsible AI Governance</div>
          <p className="governance-text">
            AI provides triage analysis and suggested communication. Financial adjustments,
            reversals, and account actions require explicit authorization by a human support agent.
          </p>
        </div>
      </div>
    </div>
  );
}

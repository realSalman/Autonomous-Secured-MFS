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

  const handleApplyTemplate = (type: 'override' | 'info') => {
    if (type === 'override') {
      const overrideTemplate = `Dear ${ticket?.user?.name || 'Customer'},\n\nI have personally reviewed your account details. Our operations team has escalated this case for manual verification. We will update you shortly.`;
      setEditedText(overrideTemplate);
    } else {
      const infoTemplate = `Dear ${ticket?.user?.name || 'Customer'},\n\nCould you please confirm the exact time of the transaction, the recipient wallet number, and any error message received?`;
      setEditedText(infoTemplate);
    }
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
      <aside className="copilot-panel copilot-standby">
        <div className="copilot-header">
          <div className="copilot-header-title">
            <span className="copilot-dot-standby" />
            <h3>AI Copilot</h3>
          </div>
          <span className="copilot-badge-standby">Standby</span>
        </div>
        <div className="copilot-standby-body">
          <div className="standby-icon">✨</div>
          <h4>Copilot Ready</h4>
          <p>Select any case to view real-time AI assistance, auto-generated response drafts, and ledger verification.</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="copilot-panel">
      {/* 1. Header with live status & confidence */}
      <div className="copilot-header">
        <div className="copilot-header-title">
          <span className="copilot-dot-live" />
          <h3>AI Copilot</h3>
          <span className="copilot-token-badge">{ticket.token}</span>
        </div>
        {aiEval && (
          <span className="copilot-confidence-pill">
            {aiEval.confidence}% confidence
          </span>
        )}
      </div>

      <div className="copilot-content">
        {/* 2. Recommendation Callout */}
        {aiEval && (
          <div className="copilot-rec-card">
            <div className="rec-card-top">
              <span className="rec-tag">{aiEval.recommendation}</span>
              <span className="rec-intent">{aiEval.categoryLabel}</span>
            </div>
            <div className="rec-action-text">{aiEval.suggestedAction}</div>
          </div>
        )}

        {/* 3. Draft Reply Workspace */}
        <div className="copilot-draft-card">
          <div className="draft-card-header">
            <span className="draft-header-label">Suggested Response Draft</span>
            <div className="draft-quick-templates">
              <button
                type="button"
                className="template-link"
                onClick={() => handleApplyTemplate('info')}
              >
                + Ask Info
              </button>
              <button
                type="button"
                className="template-link"
                onClick={() => handleApplyTemplate('override')}
              >
                + Escalate
              </button>
            </div>
          </div>

          {loading ? (
            <div className="draft-loading">
              <div className="loading-spinner" />
              <span>Analyzing ledger and crafting reply...</span>
            </div>
          ) : (
            <textarea
              id="copilot-edit-area"
              className="draft-textarea"
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              placeholder="AI generated response draft..."
              rows={6}
            />
          )}

          {error && <div className="alert alert-error">{error}</div>}

          <div className="draft-actions">
            <button
              id="copilot-regenerate"
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleRegenerate}
              disabled={loading}
            >
              Regenerate
            </button>
            <button
              id="copilot-use-reply"
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleUseReply}
              disabled={!editedText.trim() || loading}
            >
              Accept & Send Reply
            </button>
          </div>
        </div>

        {/* 4. Investigation Evidence / Rationale */}
        {aiEval && aiEval.reasoning.length > 0 && (
          <div className="copilot-evidence-card">
            <div className="evidence-header">AI Investigation Signals</div>
            <ul className="evidence-list">
              {aiEval.reasoning.map((r, idx) => (
                <li key={idx} className="evidence-item">
                  <span className="evidence-dot">✓</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 5. Account Context Snapshot */}
        <div className="copilot-profile-card">
          <div className="profile-card-header">Customer Snapshot</div>
          <div className="profile-grid">
            <div className="profile-col">
              <span className="profile-label">Customer</span>
              <span className="profile-value">{ticket.user?.name || 'Unregistered'}</span>
            </div>
            <div className="profile-col">
              <span className="profile-label">Phone</span>
              <span className="profile-value">{ticket.phone}</span>
            </div>
            <div className="profile-col">
              <span className="profile-label">Balance</span>
              <span className="profile-value">৳{formatBDT(ticket.user?.balance)}</span>
            </div>
            <div className="profile-col">
              <span className="profile-label">History</span>
              <span className="profile-value">{ticket.messages.length} messages</span>
            </div>
          </div>
        </div>

        {/* 6. Human in the loop footer notice */}
        <div className="copilot-footer-notice">
          <span>Responsible AI: Requires human confirmation before dispatch.</span>
        </div>
      </div>
    </aside>
  );
}

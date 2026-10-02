import { useState, useEffect } from 'react';
import type { Ticket, AISuggestion } from '../../types/index';
import { getAISuggestion } from '../../api/index';
import { EmptyState } from '../shared/EmptyState';

interface AICopilotProps {
  ticket: Ticket | null;
  onUseReply: (text: string) => void;
}

export function AICopilot({ ticket, onUseReply }: AICopilotProps) {
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [editedText, setEditedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      setError(err instanceof Error ? err.message : 'Failed to regenerate');
    } finally {
      setLoading(false);
    }
  };

  const handleUseReply = () => {
    if (editedText.trim()) {
      onUseReply(editedText.trim());
    }
  };

  if (!ticket) {
    return (
      <div className="copilot-panel">
        <div className="copilot-header">
          <h2>
            <span className="copilot-indicator" />
            AI Copilot
          </h2>
        </div>
        <EmptyState
          icon="🤖"
          title="No ticket selected"
          description="Select a ticket to see AI suggestions"
        />
      </div>
    );
  }

  return (
    <div className="copilot-panel">
      <div className="copilot-header">
        <h2>
          <span className="copilot-indicator" />
          AI Copilot
        </h2>
      </div>

      <div className="copilot-body">
        {/* Intent & Category */}
        <div className="copilot-section">
          <div className="copilot-section-title">Detected Intent</div>
          <div>
            <span className="copilot-intent-tag">
              {(suggestion?.intent || ticket.category).replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Customer Context */}
        <div className="copilot-section">
          <div className="copilot-section-title">Customer Context</div>
          <div className="copilot-context">
            <div className="copilot-context-item">
              <div className="copilot-context-label">Name</div>
              <div className="copilot-context-value">{ticket.user?.name || 'Not set'}</div>
            </div>
            <div className="copilot-context-item">
              <div className="copilot-context-label">Phone</div>
              <div className="copilot-context-value">{ticket.phone}</div>
            </div>
            <div className="copilot-context-item">
              <div className="copilot-context-label">Balance</div>
              <div className="copilot-context-value">
                ৳{ticket.user?.balance?.toLocaleString() ?? 'N/A'}
              </div>
            </div>
            <div className="copilot-context-item">
              <div className="copilot-context-label">Ticket</div>
              <div className="copilot-context-value">
                {ticket.token} · {ticket.messages.length} messages
              </div>
            </div>
          </div>
        </div>

        {/* Suggested Reply */}
        <div className="copilot-section">
          <div className="copilot-section-title">Suggested Reply</div>

          {loading ? (
            <div className="copilot-suggestion">
              <div className="loading">
                <div className="loading-spinner" />
                <span className="loading-text">Generating...</span>
              </div>
            </div>
          ) : suggestion ? (
            <div className="copilot-suggestion">
              <textarea
                id="copilot-edit-area"
                className="copilot-edit-area"
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                rows={6}
              />
              <div className="copilot-suggestion-actions">
                <button
                  id="copilot-use-reply"
                  className="btn btn-primary btn-sm"
                  onClick={handleUseReply}
                  disabled={!editedText.trim()}
                >
                  Use Reply
                </button>
                <button
                  id="copilot-regenerate"
                  className="btn btn-secondary btn-sm"
                  onClick={handleRegenerate}
                  disabled={loading}
                >
                  Regenerate
                </button>
              </div>
            </div>
          ) : (
            <div className="copilot-suggestion">
              <div className="copilot-suggestion-text" style={{ color: 'var(--color-text-tertiary)' }}>
                No suggestion available. Click regenerate to generate one.
              </div>
              <div className="copilot-suggestion-actions">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleRegenerate}
                >
                  Generate Suggestion
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="alert alert-error" style={{ marginTop: 8 }}>{error}</div>
          )}
        </div>

        {/* Knowledge Articles */}
        {suggestion?.context?.knowledgeArticles && suggestion.context.knowledgeArticles.length > 0 && (
          <div className="copilot-section">
            <div className="copilot-section-title">Related Knowledge</div>
            <div className="copilot-context">
              {suggestion.context.knowledgeArticles.map((kb) => (
                <div key={kb.id} className="copilot-context-item">
                  <div className="copilot-context-label">{kb.category.replace('_', ' ')}</div>
                  <div className="copilot-context-value">{kb.title}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

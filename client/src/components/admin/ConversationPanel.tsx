import { useState, useRef, useEffect, useCallback } from 'react';
import type { Ticket } from '../../types/index';
import { addMessage, getTicket, updateTicketStatus } from '../../api/index';
import { EmptyState } from '../shared/EmptyState';

interface ConversationPanelProps {
  ticket: Ticket | null;
  onTicketUpdate: (ticket: Ticket) => void;
}

export function ConversationPanel({ ticket, onTicketUpdate }: ConversationPanelProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [ticket?.messages]);

  // Poll for ticket updates
  const pollTicket = useCallback(async () => {
    if (!ticket) return;
    try {
      const updated = await getTicket(ticket._id);
      if (updated.messages.length !== ticket.messages.length) {
        onTicketUpdate(updated);
      }
    } catch {
      // silent
    }
  }, [ticket, onTicketUpdate]);

  useEffect(() => {
    const interval = setInterval(pollTicket, 4000);
    return () => clearInterval(interval);
  }, [pollTicket]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !ticket || loading) return;

    setLoading(true);
    try {
      const updated = await addMessage(ticket._id, input.trim(), 'agent');
      onTicketUpdate(updated);
      setInput('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return;
    try {
      const updated = await updateTicketStatus(ticket._id, newStatus);
      onTicketUpdate(updated);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!ticket) {
    return (
      <div className="conversation-panel">
        <EmptyState
          icon="💬"
          title="Select a ticket"
          description="Choose a ticket from the left to view the conversation"
        />
      </div>
    );
  }

  return (
    <div className="conversation-panel">
      {/* Header */}
      <div className="conversation-header">
        <div className="conversation-header-info">
          <div>
            <div className="conversation-customer-name">
              {ticket.user?.name || 'Unknown Customer'}
            </div>
            <div className="conversation-customer-detail">
              {ticket.phone} · {ticket.token} · Balance: ৳{ticket.user?.balance?.toLocaleString() ?? 'N/A'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`badge badge-${ticket.status}`}>
            {ticket.status.replace('_', ' ')}
          </span>
          <select
            className="status-select"
            value={ticket.status}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Messages */}
      <div className="conversation-messages">
        {ticket.messages.map((msg, i) => (
          <div key={i} className={`admin-msg admin-msg-${msg.role}`}>
            <div className="admin-msg-sender">
              {msg.role === 'customer'
                ? ticket.user?.name || 'Customer'
                : msg.role === 'ai'
                ? 'AI Assistant'
                : 'Agent'}
            </div>
            <div className="admin-msg-bubble">{msg.content}</div>
            <div className="admin-msg-time">{formatTime(msg.timestamp)}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form className="conversation-input-bar" onSubmit={handleSend}>
        <input
          id="admin-message-input"
          className="input"
          type="text"
          placeholder="Type your reply..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button
          id="admin-message-send"
          className="btn btn-primary"
          type="submit"
          disabled={loading || !input.trim()}
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}

// Export a function to set input from outside (used by copilot "Use Reply")
export type ConversationPanelHandle = {
  setInput: (text: string) => void;
};

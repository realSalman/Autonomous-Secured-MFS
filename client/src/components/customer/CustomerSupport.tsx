import { useState, useRef, useEffect } from 'react';
import { createTicket, addMessage } from '../../api/index';
import type { Message, Ticket } from '../../types/index';
import { Loading } from '../shared/Loading';

interface CustomerSupportProps {
  phone: string;
  onBack: () => void;
}

export function CustomerSupport({ phone, onBack }: CustomerSupportProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    // Optimistically add customer message
    const customerMsg: Message = {
      role: 'customer',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, customerMsg]);
    setInput('');
    setLoading(true);

    try {
      if (!ticket) {
        // Create new ticket
        const result = await createTicket(phone, text);
        setTicket(result.ticket);
        setMessages(result.ticket.messages);
      } else {
        // Add to existing ticket
        const updated = await addMessage(ticket._id, text, 'customer');
        setTicket(updated);
        setMessages(updated.messages);
      }
    } catch (err) {
      // Add error as a message
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai' as const,
          content: 'Sorry, something went wrong. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginRight: 8 }}>
            ← Back
          </button>
          <span className="chat-header-title">Customer Support</span>
        </div>
        {ticket && (
          <span className="chat-header-token">{ticket.token}</span>
        )}
      </div>

      <div className="chat-messages">
        {messages.length === 0 && !loading && (
          <div className="empty-state">
            <div className="empty-state-icon">💬</div>
            <div className="empty-state-title">How can we help?</div>
            <div className="empty-state-desc">
              Describe your issue and our AI assistant will help you right away.
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`chat-message chat-message-${msg.role}`}
          >
            {msg.role !== 'customer' && (
              <div className="chat-message-label">
                {msg.role === 'ai' ? 'AI Assistant' : 'Support Agent'}
              </div>
            )}
            {msg.content}
            <div className="chat-message-time">{formatTime(msg.timestamp)}</div>
          </div>
        ))}

        {loading && (
          <div className="chat-message chat-message-ai">
            <Loading text="Thinking..." />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-bar" onSubmit={handleSend}>
        <input
          id="support-chat-input"
          className="input"
          type="text"
          placeholder="Describe your issue..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          autoFocus
        />
        <button
          id="support-chat-send"
          className="btn btn-primary"
          type="submit"
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}

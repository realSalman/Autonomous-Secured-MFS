import { useState, useRef, useEffect } from 'react';
import { createTicket, addMessage } from '../../api/index';
import type { Message, Ticket } from '../../types/index';
import { Loading } from '../shared/Loading';
import { SupportFlow } from './SupportFlow';
import { BackIcon, ShieldIcon } from './icons';

interface CustomerSupportProps {
  phone: string;
  onBack: () => void;
  /** Optional text to pre-fill the message box (never auto-sent). */
  prefill?: string;
}

const TICKET_STATUS_LABEL: Record<Ticket['status'], string> = {
  open: 'Open',
  in_progress: 'With support agent',
  resolved: 'Resolved',
};

const COMMON_ISSUES = [
  'Money was deducted but the receiver did not get it',
  'My transfer failed',
  'I did not make this transaction',
  'My transfer is under review',
];

export function CustomerSupport({ phone, onBack, prefill = '' }: CustomerSupportProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(prefill);
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Don't scroll on first render, so the intro card stays at the top.
    if (messages.length > 0) scrollToBottom();
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
    <div className="chat-container mfs-chat">
      <div className="chat-header mfs-chat-head">
        <div className="mfs-chat-head-left">
          <button type="button" className="mfs-icon-btn" onClick={onBack} aria-label="Back to home">
            <BackIcon size={18} />
          </button>
          <div>
            <div className="chat-header-title">Transaction Support</div>
            <div className="mfs-chat-sub"><ShieldIcon size={12} /> Your recent transactions are reviewed to help you</div>
          </div>
        </div>
        {ticket && (
          <div className="mfs-chat-ticket">
            <span className="chat-header-token">Ref {ticket.token}</span>
            <span className={`mfs-pill ticket-${ticket.status}`}>{TICKET_STATUS_LABEL[ticket.status] ?? ticket.status}</span>
          </div>
        )}
      </div>

      <div className="chat-messages">
        {messages.length === 0 && !loading && (
          <div className="mfs-support-intro">
            <h2>What went wrong with your transaction?</h2>
            <p>Describe the issue below. If you have a transaction ID, include it so we can find it faster.</p>
            <SupportFlow variant="horizontal" />
            <div className="mfs-issue-label">Common issues</div>
            <div className="mfs-issue-chips">
              {COMMON_ISSUES.map((issue) => (
                <button key={issue} type="button" onClick={() => setInput(issue)}>{issue}</button>
              ))}
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
                {msg.role === 'ai' ? 'PayFlow AI Assistant' : 'Support Agent'}
              </div>
            )}
            {msg.content}
            <div className="chat-message-time">{formatTime(msg.timestamp)}</div>
          </div>
        ))}

        {loading && (
          <div className="chat-message chat-message-ai">
            <Loading text="Checking your request and transactions..." />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-bar" onSubmit={handleSend}>
        <input
          id="support-chat-input"
          className="input"
          type="text"
          placeholder="Describe your transaction issue..."
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

import { useState, useEffect, useCallback } from 'react';
import type { Ticket } from '../../types/index';
import { getTickets } from '../../api/index';

interface TicketListProps {
  selectedId: string | null;
  onSelect: (ticket: Ticket) => void;
}

export function TicketList({ selectedId, onSelect }: TicketListProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const loadTickets = useCallback(async () => {
    try {
      const data = await getTickets(search || undefined, statusFilter || undefined);
      setTickets(data);
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadTickets();
    // Poll for updates every 5 seconds
    const interval = setInterval(loadTickets, 5000);
    return () => clearInterval(interval);
  }, [loadTickets]);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  const getPreview = (ticket: Ticket): string => {
    const lastMsg = ticket.messages[ticket.messages.length - 1];
    if (!lastMsg) return 'No messages';
    const prefix = lastMsg.role === 'customer' ? '' : lastMsg.role === 'ai' ? 'AI: ' : 'Agent: ';
    return prefix + lastMsg.content.slice(0, 80);
  };

  const filters = [
    { label: 'All', value: '' },
    { label: 'Open', value: 'open' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Resolved', value: 'resolved' },
  ];

  return (
    <div className="ticket-list-panel">
      <div className="ticket-list-header">
        <h2>Tickets</h2>
        <input
          id="ticket-search"
          className="input"
          type="text"
          placeholder="Search tickets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="ticket-filter-row">
          {filters.map((f) => (
            <button
              key={f.value}
              className={`ticket-filter-btn ${statusFilter === f.value ? 'active' : ''}`}
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ticket-list-body">
        {loading ? (
          <div className="loading" style={{ padding: 32 }}>
            <div className="loading-spinner" />
            <span className="loading-text">Loading tickets...</span>
          </div>
        ) : tickets.length === 0 ? (
          <div className="empty-state" style={{ padding: 32 }}>
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-title">No tickets found</div>
          </div>
        ) : (
          tickets.map((ticket) => (
            <div
              key={ticket._id}
              id={`ticket-${ticket.token}`}
              className={`ticket-item ${selectedId === ticket._id ? 'selected' : ''}`}
              onClick={() => onSelect(ticket)}
            >
              <div className="ticket-item-top">
                <span className="ticket-item-token">{ticket.token}</span>
                <span className="ticket-item-time">{formatTime(ticket.updatedAt)}</span>
              </div>
              <div className="ticket-item-meta">
                <span className={`badge badge-${ticket.status}`}>
                  {ticket.status.replace('_', ' ')}
                </span>
                <span className="ticket-item-phone">{ticket.user?.name || ticket.phone}</span>
              </div>
              <div className="ticket-item-preview">{getPreview(ticket)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

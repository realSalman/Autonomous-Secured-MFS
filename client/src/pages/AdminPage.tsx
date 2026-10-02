import { useState, useCallback } from 'react';
import type { Ticket } from '../types/index';
import { TicketList } from '../components/admin/TicketList';
import { ConversationPanel } from '../components/admin/ConversationPanel';
import { AICopilot } from '../components/admin/AICopilot';
import { addMessage } from '../api/index';

export function AdminPage() {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyInput, setReplyInput] = useState('');

  const handleTicketSelect = useCallback((ticket: Ticket) => {
    setSelectedTicket(ticket);
    setReplyInput('');
  }, []);

  const handleTicketUpdate = useCallback((ticket: Ticket) => {
    setSelectedTicket(ticket);
  }, []);

  const handleUseReply = useCallback(async (text: string) => {
    if (!selectedTicket) return;
    // Send the AI-suggested reply as an agent message
    try {
      const updated = await addMessage(selectedTicket._id, text, 'agent');
      setSelectedTicket(updated);
    } catch (err) {
      console.error('Failed to send reply:', err);
    }
  }, [selectedTicket]);

  return (
    <div className="admin-layout">
      <TicketList
        selectedId={selectedTicket?._id || null}
        onSelect={handleTicketSelect}
      />
      <ConversationPanel
        ticket={selectedTicket}
        onTicketUpdate={handleTicketUpdate}
      />
      <AICopilot
        ticket={selectedTicket}
        onUseReply={handleUseReply}
      />
    </div>
  );
}

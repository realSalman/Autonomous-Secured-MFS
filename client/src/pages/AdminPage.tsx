import React, { useState, useEffect, useCallback } from 'react';
import type { Ticket } from '../types/index';
import { getTickets, addMessage } from '../api/index';
import { OperationalHeader } from '../components/admin/OperationalHeader';
import { TicketList } from '../components/admin/TicketList';
import { ConversationPanel } from '../components/admin/ConversationPanel';
import { AICopilot } from '../components/admin/AICopilot';

export function AdminPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'SupportIQ — MFS Support Operations Center';
  }, []);

  // Load tickets list
  const loadTickets = useCallback(async () => {
    try {
      const data = await getTickets();
      setTickets(data);

      // If a ticket is currently selected, refresh its reference with latest data
      setSelectedTicket((prev) => {
        if (!prev) return null;
        const matching = data.find((t) => t._id === prev._id);
        return matching || prev;
      });
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
    const interval = setInterval(loadTickets, 5000);
    return () => clearInterval(interval);
  }, [loadTickets]);

  const handleTicketSelect = useCallback((ticket: Ticket) => {
    setSelectedTicket(ticket);
  }, []);

  const handleTicketUpdate = useCallback((updated: Ticket) => {
    setSelectedTicket(updated);
    setTickets((prev) =>
      prev.map((t) => (t._id === updated._id ? updated : t))
    );
  }, []);

  const handleUseReply = useCallback(
    async (text: string) => {
      if (!selectedTicket) return;
      try {
        const updated = await addMessage(selectedTicket._id, text, 'agent');
        handleTicketUpdate(updated);
      } catch (err) {
        console.error('Failed to send reply:', err);
      }
    },
    [selectedTicket, handleTicketUpdate]
  );

  return (
    <div className="admin-operations-page">
      {/* 1. Top Operational Summary & AI Intelligence Bar */}
      <OperationalHeader
        tickets={tickets}
        activeFilter={activeFilter}
        onFilterSelect={setActiveFilter}
      />

      {/* 2. Middle 3-Column Triage Workspace */}
      <div className="admin-workspace-grid">
        {/* Left: Queue & Workload Feed */}
        <TicketList
          tickets={tickets}
          selectedId={selectedTicket?._id || null}
          onSelect={handleTicketSelect}
          filter={activeFilter}
          onFilterChange={setActiveFilter}
          loading={loading}
        />

        {/* Center: Case Investigation & Customer Conversation */}
        <ConversationPanel
          ticket={selectedTicket}
          onTicketUpdate={handleTicketUpdate}
          allTickets={tickets}
          onSelectTicket={handleTicketSelect}
        />

        {/* Right: AI Copilot Case Intelligence & Decision Controls */}
        <AICopilot
          ticket={selectedTicket}
          onUseReply={handleUseReply}
        />
      </div>
    </div>
  );
}

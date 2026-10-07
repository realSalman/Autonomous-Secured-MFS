import React, { useState, useEffect, useCallback } from 'react';
import type { Ticket, Transaction } from '../types/index';
import { getTickets, addMessage, getTransactions } from '../api/index';
import { KpiCards } from '../components/admin/KpiCards';
import { AnalyticsRow } from '../components/admin/AnalyticsRow';
import { SupportTicketsQueue } from '../components/admin/SupportTicketsQueue';
import { CaseInvestigationWorkspace } from '../components/admin/CaseInvestigationWorkspace';
import { AiAnalysisPanel } from '../components/admin/AiAnalysisPanel';

export function AdminPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'SecureAssist MFS — Admin & Support Center';
  }, []);

  // Load tickets list
  const loadTickets = useCallback(async () => {
    try {
      const data = await getTickets();
      setTickets(data);

      // Auto-select first ticket if none is selected
      setSelectedTicket((prev) => {
        if (!prev) return data.length > 0 ? data[0] : null;
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

  // Load transactions for selected ticket
  useEffect(() => {
    if (!selectedTicket?.phone) {
      setTransactions([]);
      return;
    }
    let active = true;
    getTransactions(selectedTicket.phone)
      .then((txs) => {
        if (active) setTransactions(txs);
      })
      .catch(() => {
        if (active) setTransactions([]);
      });
    return () => {
      active = false;
    };
  }, [selectedTicket?.phone]);

  const handleTicketSelect = useCallback((ticket: Ticket) => {
    setSelectedTicket(ticket);
  }, []);

  const handleTicketUpdate = useCallback((updated: Ticket) => {
    setSelectedTicket(updated);
    setTickets((prev) =>
      prev.map((t) => (t._id === updated._id ? updated : t))
    );
  }, []);

  const handleAcceptRecommendation = useCallback(
    async (replyText: string) => {
      if (!selectedTicket || !replyText.trim()) return;
      try {
        const updated = await addMessage(selectedTicket._id, replyText.trim(), 'agent');
        handleTicketUpdate(updated);
      } catch (err) {
        console.error('Failed to accept recommendation:', err);
      }
    },
    [selectedTicket, handleTicketUpdate]
  );

  const handleOverride = useCallback(
    async () => {
      if (!selectedTicket) return;
      const overrideText = `Dear ${selectedTicket.user?.name || 'Customer'}, I have personally reviewed your account details. Our operations team is processing manual verification for this case.`;
      try {
        const updated = await addMessage(selectedTicket._id, overrideText, 'agent');
        handleTicketUpdate(updated);
      } catch (err) {
        console.error('Failed to override:', err);
      }
    },
    [selectedTicket, handleTicketUpdate]
  );

  const handleRequestMoreInfo = useCallback(
    async () => {
      if (!selectedTicket) return;
      const infoText = `Dear ${selectedTicket.user?.name || 'Customer'}, could you please confirm the exact time of transaction and the recipient mobile number?`;
      try {
        const updated = await addMessage(selectedTicket._id, infoText, 'agent');
        handleTicketUpdate(updated);
      } catch (err) {
        console.error('Failed to request more info:', err);
      }
    },
    [selectedTicket, handleTicketUpdate]
  );

  return (
    <div className="secureassist-dashboard-page">
      {/* 1. Greeting & Date Header */}
      <div className="dashboard-greeting-bar">
        <div className="greeting-text-group">
          <h1>Good morning, Admin Hasan</h1>
          <p>Here's what's happening with your support operations today.</p>
        </div>

        <div className="greeting-date-pill">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>Wed, Oct 7, 2026, 11:20 AM</span>
        </div>
      </div>

      {/* 2. Top 6 Pastel KPI Cards Row */}
      <KpiCards
        tickets={tickets}
        activeFilter={activeFilter}
        onFilterSelect={setActiveFilter}
      />

      {/* 3. Middle Analytics & AI Copilot Overview Row */}
      <AnalyticsRow
        tickets={tickets}
        onSelectTicket={handleTicketSelect}
      />

      {/* 4. Bottom 3-Column Operations Workspace Grid */}
      <div className="dashboard-operations-grid">
        {/* Column 1: Support Tickets Queue */}
        <SupportTicketsQueue
          tickets={tickets}
          selectedId={selectedTicket?._id || null}
          onSelect={handleTicketSelect}
          filter={activeFilter}
          onFilterChange={setActiveFilter}
          loading={loading}
        />

        {/* Column 2: Active Ticket Investigation & Conversation */}
        <CaseInvestigationWorkspace
          ticket={selectedTicket}
          onTicketUpdate={handleTicketUpdate}
        />

        {/* Column 3: AI Analysis & Workload / Activity Panel */}
        <AiAnalysisPanel
          ticket={selectedTicket}
          tickets={tickets}
          transactions={transactions}
          onAcceptRecommendation={handleAcceptRecommendation}
          onOverride={handleOverride}
          onRequestMoreInfo={handleRequestMoreInfo}
        />
      </div>
    </div>
  );
}

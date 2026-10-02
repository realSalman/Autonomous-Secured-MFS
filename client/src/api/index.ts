import type { User, Transaction, Ticket, SendMoneyResult, AISuggestion } from '../types/index';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data as T;
}

// ── Auth ──

export async function login(phone: string): Promise<User> {
  return request<User>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export async function getUser(phone: string): Promise<User> {
  return request<User>(`/auth/user/${encodeURIComponent(phone)}`);
}

export async function updateUserName(phone: string, name: string): Promise<User> {
  return request<User>(`/auth/user/${encodeURIComponent(phone)}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
}

// ── Transactions ──

export async function sendMoney(
  sender: string,
  receiver: string,
  amount: number
): Promise<SendMoneyResult> {
  return request<SendMoneyResult>('/transactions/send', {
    method: 'POST',
    body: JSON.stringify({ sender, receiver, amount }),
  });
}

export async function getTransactions(phone: string): Promise<Transaction[]> {
  return request<Transaction[]>(`/transactions/${encodeURIComponent(phone)}`);
}

// ── Tickets ──

export async function createTicket(
  phone: string,
  message: string
): Promise<{ ticket: Ticket; aiResponse: string }> {
  return request<{ ticket: Ticket; aiResponse: string }>('/tickets', {
    method: 'POST',
    body: JSON.stringify({ phone, message }),
  });
}

export async function getTickets(
  search?: string,
  status?: string
): Promise<Ticket[]> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  const qs = params.toString();
  return request<Ticket[]>(`/tickets${qs ? `?${qs}` : ''}`);
}

export async function getTicket(id: string): Promise<Ticket> {
  return request<Ticket>(`/tickets/${id}`);
}

export async function addMessage(
  ticketId: string,
  message: string,
  role: 'customer' | 'agent'
): Promise<Ticket> {
  return request<Ticket>(`/tickets/${ticketId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message, role }),
  });
}

export async function getAISuggestion(ticketId: string): Promise<AISuggestion> {
  return request<AISuggestion>(`/tickets/${ticketId}/suggest`, {
    method: 'POST',
  });
}

export async function updateTicketStatus(
  ticketId: string,
  status: string
): Promise<Ticket> {
  return request<Ticket>(`/tickets/${ticketId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

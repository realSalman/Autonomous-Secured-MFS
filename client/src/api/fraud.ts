import type { FraudAuditEntry, FraudStats, FraudRule, ModelVersion } from '../types/index';

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

// ── Fraud Audit ──

export async function getFraudAudit(params?: {
  page?: number;
  limit?: number;
  decision?: string;
}): Promise<{ data: FraudAuditEntry[]; page: number; limit: number; hasMore: boolean }> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.decision) qs.set('decision', params.decision);
  const query = qs.toString();
  return request(`/fraud/audit${query ? `?${query}` : ''}`);
}

export async function getFraudStats(): Promise<FraudStats> {
  return request('/fraud/audit/stats/summary');
}

export async function overrideFraudDecision(
  auditId: string,
  decision: 'ACCEPT' | 'DECLINE',
  reason: string
): Promise<{ success: boolean; message: string }> {
  return request(`/fraud/override/${auditId}`, {
    method: 'POST',
    body: JSON.stringify({ decision, reason }),
  });
}

// ── Fraud Rules ──

export async function getFraudRules(): Promise<{ data: FraudRule[] }> {
  return request('/fraud/rules');
}

export async function createFraudRule(rule: Partial<FraudRule>): Promise<{ data: FraudRule }> {
  return request('/fraud/rules', {
    method: 'POST',
    body: JSON.stringify(rule),
  });
}

export async function toggleFraudRule(id: string): Promise<{ data: FraudRule }> {
  return request(`/fraud/rules/${id}/toggle`, { method: 'POST' });
}

export async function deleteFraudRule(id: string): Promise<void> {
  return request(`/fraud/rules/${id}`, { method: 'DELETE' });
}

// ── Models ──

export async function getFraudModels(): Promise<{ data: ModelVersion[] }> {
  return request('/fraud/models');
}

export async function activateModel(version: string): Promise<void> {
  return request(`/fraud/models/${version}/activate`, { method: 'POST' });
}

export async function shadowModel(version: string): Promise<void> {
  return request(`/fraud/models/${version}/shadow`, { method: 'POST' });
}

export async function retireModel(version: string): Promise<void> {
  return request(`/fraud/models/${version}/retire`, { method: 'POST' });
}

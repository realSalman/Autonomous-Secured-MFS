import { FraudDecision, ReasonCode } from '../types/index';

/**
 * Ojuri API Client — calls the Ojuri RDA service for fraud scoring.
 * Handles graceful degradation when Ojuri is unavailable.
 */

const OJURI_API_URL = process.env.OJURI_API_URL || 'http://localhost:3002';
const OJURI_API_KEY = process.env.OJURI_API_KEY || '';
const OJURI_ENABLED = process.env.OJURI_ENABLED === 'true';
const OJURI_TIMEOUT_MS = 5000;

interface OjuriPredictRequest {
  transaction_id: string;
  sender_id: string;
  receiver_id: string;
  amount: number;
  transaction_type: string;
  timestamp: number;
  // Optional context
  customer_account_name?: string;
  beneficiary_account_name?: string;
  account_age_days?: number;
  is_authenticated?: boolean;
  customer_type?: string;
  channel?: string;
  currency?: string;
  segment?: string;
}

interface OjuriPredictResponse {
  transaction_id: string;
  fraud: boolean;
  fraud_probability: number;
  decision: 'ACCEPT' | 'REVIEW' | 'DECLINE';
  reason_codes: Array<{
    code: string;
    description: string;
    contribution: number;
  }>;
  model_version: string;
  threshold: number;
  audit_id: string;
}

/**
 * Score a transaction for fraud using Ojuri's predict API.
 * Returns a degraded ACCEPT decision if Ojuri is unavailable.
 */
export async function scoreTransaction(params: {
  txId: string;
  sender: string;
  receiver: string;
  amount: number;
  time: Date;
  senderName?: string;
  receiverName?: string;
  accountAgeDays?: number;
}): Promise<FraudDecision> {
  if (!OJURI_ENABLED) {
    return {
      decision: 'ACCEPT',
      fraud_probability: null,
      reason_codes: [],
      model_version: null,
      audit_id: null,
      degraded: false,
    };
  }

  const payload: OjuriPredictRequest = {
    transaction_id: params.txId,
    sender_id: params.sender,
    receiver_id: params.receiver,
    amount: params.amount,
    transaction_type: 'TRANSFER',
    timestamp: params.time.getTime(),
    customer_account_name: params.senderName,
    beneficiary_account_name: params.receiverName,
    account_age_days: params.accountAgeDays,
    is_authenticated: true,
    customer_type: 'INDIVIDUAL',
    channel: 'WEB',
    currency: 'BDT',
    segment: params.amount > 50000 ? 'high_value' : 'standard',
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OJURI_TIMEOUT_MS);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Idempotency-Key': params.txId,
      'X-Correlation-ID': crypto.randomUUID(),
    };

    if (OJURI_API_KEY) {
      headers['X-Api-Key'] = OJURI_API_KEY;
    }

    const response = await fetch(`${OJURI_API_URL}/v1/predict`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[Ojuri] Predict returned ${response.status}: ${await response.text()}`);
      return degradedDecision();
    }

    const result: OjuriPredictResponse = await response.json();

    return {
      decision: result.decision,
      fraud_probability: result.fraud_probability,
      reason_codes: result.reason_codes,
      model_version: result.model_version,
      audit_id: result.audit_id,
      degraded: false,
    };
  } catch (error) {
    console.error('[Ojuri] Scoring failed, degrading gracefully:', error);
    return degradedDecision();
  }
}

function degradedDecision(): FraudDecision {
  return {
    decision: 'ACCEPT',
    fraud_probability: null,
    reason_codes: [],
    model_version: null,
    audit_id: null,
    degraded: true,
  };
}

/**
 * Proxy a request to Ojuri's admin API.
 * Used by fraud-rules, fraud-models, fraud-audit routes.
 */
export async function ojuriAdminRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; data: unknown }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // For admin requests, we need a JWT or service token
  if (OJURI_API_KEY) {
    headers['X-Api-Key'] = OJURI_API_KEY;
  }

  try {
    const response = await fetch(`${OJURI_API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    console.error(`[Ojuri] Admin request failed: ${method} ${path}`, error);
    return { status: 503, data: { error: 'Ojuri service unavailable' } };
  }
}

/**
 * Check if Ojuri RDA is healthy.
 */
export async function checkOjuriHealth(): Promise<boolean> {
  if (!OJURI_ENABLED) return false;
  try {
    const response = await fetch(`${OJURI_API_URL}/readyz`, {
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { getDb } from '../db/connection';
import { transactions, tickets, counters } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { IMessage } from '../types/index';

const router = Router();
const WEBHOOK_SECRET = process.env.OJURI_WEBHOOK_SECRET || '';

/**
 * Verify HMAC-SHA256 signature from Ojuri webhooks.
 */
function verifySignature(rawBody: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) {
    console.warn('[Webhook] No OJURI_WEBHOOK_SECRET set — skipping verification');
    return true;
  }
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * Generate next ticket token atomically.
 */
async function getNextToken(): Promise<string> {
  const db = getDb();
  const [counter] = await db.insert(counters)
    .values({ name: 'ticket', value: 1 })
    .onConflictDoUpdate({
      target: counters.name,
      set: { value: sql`${counters.value} + 1` },
    })
    .returning();
  return `TKT-${counter.value.toString().padStart(4, '0')}`;
}

/**
 * POST /api/ojuri/webhooks
 * Receives HMAC-signed webhook events from Ojuri RDA.
 *
 * Events:
 * - decision.created  → update transaction, auto-create tickets
 * - decision.overridden → update transaction + ticket
 * - model.activated → log
 * - rule.activated → log
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-ojuri-signature'] as string || '';
    const rawBody = JSON.stringify(req.body);

    if (!verifySignature(rawBody, signature)) {
      console.warn('[Webhook] Invalid signature — rejecting');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { event, data } = req.body;
    console.log(`[Webhook] Received: ${event}`);

    switch (event) {
      case 'decision.created':
        await handleDecisionCreated(data);
        break;
      case 'decision.overridden':
        await handleDecisionOverridden(data);
        break;
      case 'model.activated':
        console.log(`[Webhook] Model activated: ${data.version} (status: ${data.status})`);
        break;
      case 'rule.activated':
        console.log(`[Webhook] Rule activated: ${data.name} (id: ${data.id})`);
        break;
      default:
        console.warn(`[Webhook] Unknown event: ${event}`);
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Handle decision.created — update transaction with fraud data,
 * auto-create ticket for DECLINE/REVIEW decisions.
 */
async function handleDecisionCreated(data: {
  transactionId: string;
  finalDecision: string;
  championScore: number;
  reasonCodes: Array<{ code: string; description: string; contribution: number }>;
  championModelVersion: string;
  auditId: string;
}) {
  const db = getDb();

  // Update transaction with fraud data
  await db.update(transactions)
    .set({
      fraudScore: data.championScore.toString(),
      fraudDecision: data.finalDecision,
      ojuriAuditId: data.auditId,
      reasonCodes: data.reasonCodes,
      modelVersion: data.championModelVersion,
    })
    .where(eq(transactions.txId, data.transactionId));

  // Auto-create ticket for DECLINE or REVIEW
  if (data.finalDecision === 'DECLINE' || data.finalDecision === 'REVIEW') {
    const [tx] = await db.select().from(transactions)
      .where(eq(transactions.txId, data.transactionId));

    if (tx) {
      const reasonSummary = data.reasonCodes
        .map(r => `• ${r.description}`)
        .join('\n');

      const token = await getNextToken();
      const messages: IMessage[] = [
        {
          role: 'ai',
          content: `⚠️ Transaction ${data.transactionId} was ${data.finalDecision === 'DECLINE' ? 'blocked' : 'flagged for review'} by our fraud detection system.\n\nAmount: ৳${Number(tx.amount).toLocaleString()}\nFraud Score: ${(data.championScore * 100).toFixed(1)}%\nReasons:\n${reasonSummary}\n\nThis ticket was auto-created for investigation.`,
          timestamp: new Date(),
        },
      ];

      await db.insert(tickets).values({
        token,
        phone: tx.sender,
        status: 'open',
        category: 'fraud_alert',
        messages,
      });

      console.log(`[Webhook] Auto-created fraud ticket ${token} for ${data.finalDecision} on ${data.transactionId}`);
    }
  }
}

/**
 * Handle decision.overridden — update transaction + resolve ticket.
 */
async function handleDecisionOverridden(data: {
  transactionId: string;
  auditId: string;
  reviewerDecision: string;
  reviewedBy: string;
}) {
  const db = getDb();

  // Update transaction
  await db.update(transactions)
    .set({
      fraudDecision: data.reviewerDecision,
    })
    .where(eq(transactions.txId, data.transactionId));

  console.log(`[Webhook] Decision overridden: ${data.transactionId} → ${data.reviewerDecision} by ${data.reviewedBy}`);
}

export default router;

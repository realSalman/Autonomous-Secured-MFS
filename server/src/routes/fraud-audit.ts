import { Router, Request, Response } from 'express';
import { getDb } from '../db/connection';
import { transactions } from '../db/schema';
import { ojuriAdminRequest } from '../services/ojuri';
import { eq, sql, desc, and, isNotNull } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/fraud/audit
 * Query the decision audit log.
 * Supports pagination and filtering.
 *
 * Query params: page, limit, decision, txId
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;
    const decisionFilter = req.query.decision as string;

    const db = getDb();

    // Query transactions that have fraud data
    const conditions = [isNotNull(transactions.fraudDecision)];

    if (decisionFilter && ['ACCEPT', 'REVIEW', 'DECLINE'].includes(decisionFilter)) {
      conditions.push(eq(transactions.fraudDecision, decisionFilter));
    }

    const auditRows = await db.select().from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.time))
      .limit(limit)
      .offset(offset);

    const result = auditRows.map(tx => ({
      tx_id: tx.txId,
      sender: tx.sender,
      receiver: tx.receiver,
      amount: Number(tx.amount),
      time: tx.time,
      fraud_score: tx.fraudScore ? Number(tx.fraudScore) : null,
      fraud_decision: tx.fraudDecision,
      reason_codes: tx.reasonCodes,
      model_version: tx.modelVersion,
      ojuri_audit_id: tx.ojuriAuditId,
    }));

    return res.json({
      data: result,
      page,
      limit,
      hasMore: result.length === limit,
    });
  } catch (error) {
    console.error('[FraudAudit] List error:', error);
    return res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

/**
 * GET /api/fraud/audit/:txId
 * Get full audit record for a specific transaction.
 */
router.get('/:txId', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const [tx] = await db.select().from(transactions)
      .where(eq(transactions.txId, req.params.txId));

    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    return res.json({
      tx_id: tx.txId,
      sender: tx.sender,
      receiver: tx.receiver,
      amount: Number(tx.amount),
      status: tx.status,
      time: tx.time,
      fraud_score: tx.fraudScore ? Number(tx.fraudScore) : null,
      fraud_decision: tx.fraudDecision,
      reason_codes: tx.reasonCodes,
      model_version: tx.modelVersion,
      ojuri_audit_id: tx.ojuriAuditId,
    });
  } catch (error) {
    console.error('[FraudAudit] Get error:', error);
    return res.status(500).json({ error: 'Failed to fetch audit record' });
  }
});

/**
 * POST /api/fraud/override/:auditId
 * Override a fraud decision (admin reviewer action).
 *
 * Body: { decision: 'ACCEPT' | 'DECLINE', reason: string }
 */
router.post('/override/:auditId', async (req: Request, res: Response) => {
  try {
    const { decision, reason } = req.body;
    if (!['ACCEPT', 'DECLINE'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be ACCEPT or DECLINE' });
    }

    // Proxy to Ojuri's override API
    const result = await ojuriAdminRequest(
      'POST',
      `/v1/decisions/${req.params.auditId}/override`,
      {
        reviewerDecision: decision,
        reviewedBy: 'admin@supportiq',
        reviewerComment: reason || '',
        groundTruthFraud: decision === 'DECLINE',
      }
    );

    if (result.status >= 400) {
      return res.status(result.status).json(result.data);
    }

    // Also update the local transaction row
    const db = getDb();
    await db.update(transactions)
      .set({ fraudDecision: decision })
      .where(eq(transactions.ojuriAuditId, req.params.auditId));

    return res.json({
      success: true,
      message: `Decision overridden to ${decision}`,
    });
  } catch (error) {
    console.error('[FraudAudit] Override error:', error);
    return res.status(500).json({ error: 'Failed to override decision' });
  }
});

/**
 * GET /api/fraud/stats
 * Aggregated fraud statistics for the dashboard.
 */
router.get('/stats/summary', async (_req: Request, res: Response) => {
  try {
    const db = getDb();

    // Get counts by decision
    const rows = await db.select({
      decision: transactions.fraudDecision,
      count: sql<number>`count(*)::int`,
      totalAmount: sql<number>`sum(${transactions.amount}::numeric)`,
    })
      .from(transactions)
      .where(isNotNull(transactions.fraudDecision))
      .groupBy(transactions.fraudDecision);

    const stats: Record<string, { count: number; totalAmount: number }> = {};
    for (const row of rows) {
      if (row.decision) {
        stats[row.decision] = {
          count: row.count,
          totalAmount: Number(row.totalAmount) || 0,
        };
      }
    }

    const totalScored = Object.values(stats).reduce((sum, s) => sum + s.count, 0);
    const blocked = stats['DECLINE']?.count || 0;
    const review = stats['REVIEW']?.count || 0;
    const amountSaved = stats['DECLINE']?.totalAmount || 0;

    return res.json({
      totalScored,
      accepted: stats['ACCEPT']?.count || 0,
      review,
      blocked,
      fraudRate: totalScored > 0 ? ((blocked + review) / totalScored * 100).toFixed(2) : '0.00',
      amountSaved,
    });
  } catch (error) {
    console.error('[FraudAudit] Stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;

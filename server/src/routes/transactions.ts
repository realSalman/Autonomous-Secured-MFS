import { Router, Request, Response } from 'express';
import { getDb } from '../db/connection';
import { users, transactions } from '../db/schema';
import { eq, sql, or } from 'drizzle-orm';
import { validatePhone, validateAmount } from '../validation/index';
import { randomBytes } from 'crypto';
import { scoreTransaction } from '../services/ojuri';

const router = Router();

/**
 * POST /api/transactions/send
 * Send money from one user to another.
 * Integrates Ojuri fraud scoring before execution.
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const senderPhone = validatePhone(req.body.sender);
    const receiverPhone = validatePhone(req.body.receiver);
    const amount = validateAmount(req.body.amount);

    if (!senderPhone) {
      return res.status(400).json({ error: 'Invalid sender phone number' });
    }
    if (!receiverPhone) {
      return res.status(400).json({ error: 'Invalid receiver phone number' });
    }
    if (!amount) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    if (senderPhone === receiverPhone) {
      return res.status(400).json({ error: 'Cannot send money to yourself' });
    }

    const db = getDb();

    // Find sender
    const [sender] = await db.select().from(users).where(eq(users.phone, senderPhone));
    if (!sender) {
      return res.status(404).json({ error: 'Sender not found' });
    }

    // Check balance
    if (Number(sender.balance) < amount) {
      const txId = `TX-${Date.now()}-${randomBytes(3).toString('hex')}`;
      await db.insert(transactions).values({
        txId,
        sender: senderPhone,
        receiver: receiverPhone,
        amount: amount.toString(),
        status: 'failed',
        time: new Date(),
      });

      return res.status(400).json({
        error: 'Insufficient balance',
        tx_id: txId,
        status: 'failed',
      });
    }

    // Find or create receiver
    let [receiver] = await db.select().from(users).where(eq(users.phone, receiverPhone));
    if (!receiver) {
      [receiver] = await db.insert(users).values({
        phone: receiverPhone,
        name: '',
        balance: '10000',
      }).returning();
    }

    const txId = `TX-${Date.now()}-${randomBytes(3).toString('hex')}`;
    const now = new Date();

    // ── Ojuri Fraud Scoring ──
    const accountAgeDays = sender.createdAt
      ? Math.floor((Date.now() - new Date(sender.createdAt).getTime()) / 86400000)
      : undefined;

    const fraudResult = await scoreTransaction({
      txId,
      sender: senderPhone,
      receiver: receiverPhone,
      amount,
      time: now,
      senderName: sender.name || undefined,
      receiverName: receiver.name || undefined,
      accountAgeDays,
    });

    // Handle DECLINE — block the transaction
    if (fraudResult.decision === 'DECLINE') {
      const [blockedTx] = await db.insert(transactions).values({
        txId,
        sender: senderPhone,
        receiver: receiverPhone,
        amount: amount.toString(),
        status: 'blocked',
        time: now,
        fraudScore: fraudResult.fraud_probability?.toString() || null,
        fraudDecision: fraudResult.decision,
        ojuriAuditId: fraudResult.audit_id,
        reasonCodes: fraudResult.reason_codes,
        modelVersion: fraudResult.model_version,
      }).returning();

      return res.status(403).json({
        error: 'Transaction blocked for security review',
        tx_id: txId,
        status: 'blocked',
        fraud_decision: 'DECLINE',
        reason_codes: fraudResult.reason_codes.map(r => r.description),
      });
    }

    // ── Execute Transfer (ACCEPT or REVIEW) ──
    await db.update(users)
      .set({ balance: sql`${users.balance} - ${amount}`, updatedAt: now })
      .where(eq(users.phone, senderPhone));

    await db.update(users)
      .set({ balance: sql`${users.balance} + ${amount}`, updatedAt: now })
      .where(eq(users.phone, receiverPhone));

    const [transaction] = await db.insert(transactions).values({
      txId,
      sender: senderPhone,
      receiver: receiverPhone,
      amount: amount.toString(),
      status: 'completed',
      time: now,
      fraudScore: fraudResult.fraud_probability?.toString() || null,
      fraudDecision: fraudResult.decision,
      ojuriAuditId: fraudResult.audit_id,
      reasonCodes: fraudResult.reason_codes,
      modelVersion: fraudResult.model_version,
    }).returning();

    // Refetch sender for updated balance
    const [updatedSender] = await db.select().from(users).where(eq(users.phone, senderPhone));

    return res.json({
      tx_id: transaction.txId,
      amount: Number(transaction.amount),
      receiver: transaction.receiver,
      status: transaction.status,
      time: transaction.time,
      newBalance: updatedSender ? Number(updatedSender.balance) : null,
      // Include fraud info if scored
      ...(fraudResult.fraud_probability !== null && {
        fraud_score: fraudResult.fraud_probability,
        fraud_decision: fraudResult.decision,
      }),
      ...(fraudResult.decision === 'REVIEW' && {
        flagged_for_review: true,
      }),
    });
  } catch (error) {
    console.error('[TX] Send error:', error);
    return res.status(500).json({ error: 'Transaction failed' });
  }
});

/**
 * GET /api/transactions/:phone
 * Get transaction history for a user.
 */
router.get('/:phone', async (req: Request, res: Response) => {
  try {
    const phone = validatePhone(req.params.phone);
    if (!phone) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const db = getDb();

    const txList = await db.select().from(transactions)
      .where(or(eq(transactions.sender, phone), eq(transactions.receiver, phone)))
      .orderBy(sql`${transactions.time} DESC`)
      .limit(limit);

    const result = txList.map(tx => ({
      tx_id: tx.txId,
      sender: tx.sender,
      receiver: tx.receiver,
      amount: Number(tx.amount),
      status: tx.status,
      time: tx.time,
      fraud_score: tx.fraudScore ? Number(tx.fraudScore) : null,
      fraud_decision: tx.fraudDecision,
    }));

    return res.json(result);
  } catch (error) {
    console.error('[TX] History error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

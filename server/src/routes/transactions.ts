import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { validatePhone, validateAmount } from '../validation/index';
import { randomBytes } from 'crypto';

const router = Router();

/**
 * POST /api/transactions/send
 * Send money from one user to another.
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

    // Find sender
    const sender = await User.findOne({ phone: senderPhone });
    if (!sender) {
      return res.status(404).json({ error: 'Sender not found' });
    }

    // Check balance
    if (sender.balance < amount) {
      // Create failed transaction record
      const txId = `TX-${Date.now()}-${randomBytes(3).toString('hex')}`;
      await Transaction.create({
        tx_id: txId,
        sender: senderPhone,
        receiver: receiverPhone,
        amount,
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
    let receiver = await User.findOne({ phone: receiverPhone });
    if (!receiver) {
      receiver = await User.create({
        phone: receiverPhone,
        name: '',
        balance: 10000,
      });
    }

    // Execute transfer atomically
    const txId = `TX-${Date.now()}-${randomBytes(3).toString('hex')}`;

    await User.updateOne({ phone: senderPhone }, { $inc: { balance: -amount } });
    await User.updateOne({ phone: receiverPhone }, { $inc: { balance: amount } });

    const transaction = await Transaction.create({
      tx_id: txId,
      sender: senderPhone,
      receiver: receiverPhone,
      amount,
      status: 'completed',
      time: new Date(),
    });

    // Refetch sender for updated balance
    const updatedSender = await User.findOne({ phone: senderPhone });

    return res.json({
      tx_id: transaction.tx_id,
      amount: transaction.amount,
      receiver: transaction.receiver,
      status: transaction.status,
      time: transaction.time,
      newBalance: updatedSender?.balance,
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

    const transactions = await Transaction.find({
      $or: [{ sender: phone }, { receiver: phone }],
    })
      .sort({ time: -1 })
      .limit(limit)
      .lean();

    return res.json(transactions);
  } catch (error) {
    console.error('[TX] History error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

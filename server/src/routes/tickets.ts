import { Router, Request, Response } from 'express';
import { Ticket } from '../models/Ticket';
import { User } from '../models/User';
import { getNextTicketToken } from '../models/Counter';
import { runSupportAgent } from '../ai/graph';
import { validatePhone, validateMessage } from '../validation/index';

const router = Router();

/**
 * POST /api/tickets
 * Create a new ticket or add to existing open ticket for this phone.
 * Runs AI agent and returns response.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const phone = validatePhone(req.body.phone);
    const message = validateMessage(req.body.message);

    if (!phone) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Check for existing open ticket for this user
    let ticket = await Ticket.findOne({
      phone,
      status: { $in: ['open', 'in_progress'] },
    });

    if (!ticket) {
      const token = await getNextTicketToken();
      ticket = await Ticket.create({
        token,
        phone,
        status: 'open',
        category: 'general',
        messages: [],
      });
    }

    // Add customer message
    ticket.messages.push({
      role: 'customer',
      content: message,
      timestamp: new Date(),
    });

    // Run AI agent
    let aiResult;
    try {
      aiResult = await runSupportAgent(phone, message, ticket.messages);

      // Update ticket with AI classification
      ticket.category = aiResult.intent;

      // Add AI response as a message
      ticket.messages.push({
        role: 'ai',
        content: aiResult.suggestedReply,
        timestamp: new Date(),
      });
    } catch (aiError) {
      console.error('[Tickets] AI agent error:', aiError);
      const fallbackReply = 'Thank you for reaching out. A support agent will assist you shortly.';
      ticket.messages.push({
        role: 'ai',
        content: fallbackReply,
        timestamp: new Date(),
      });
      aiResult = {
        intent: 'general',
        suggestedReply: fallbackReply,
        actions: ['escalate'],
        context: { userInfo: null, recentTransactions: [], knowledgeArticles: [] },
      };
    }

    ticket.updatedAt = new Date();
    await ticket.save();

    return res.json({
      ticket: {
        _id: ticket._id,
        token: ticket.token,
        phone: ticket.phone,
        status: ticket.status,
        category: ticket.category,
        messages: ticket.messages,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      },
      aiResponse: aiResult.suggestedReply,
    });
  } catch (error) {
    console.error('[Tickets] Create error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/tickets
 * List all tickets (admin view).
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const filter: Record<string, unknown> = {};
    if (status && ['open', 'in_progress', 'resolved'].includes(status)) {
      filter.status = status;
    }

    let tickets = await Ticket.find(filter)
      .sort({ updatedAt: -1 })
      .lean();

    // Search filter: match token, phone, or message content
    if (search) {
      const q = search.toLowerCase();
      tickets = tickets.filter(
        (t) =>
          t.token.toLowerCase().includes(q) ||
          t.phone.includes(q) ||
          t.messages.some((m) => m.content.toLowerCase().includes(q))
      );
    }

    // Attach user info to each ticket
    const phones = [...new Set(tickets.map((t) => t.phone))];
    const users = await User.find({ phone: { $in: phones } }).lean();
    const userMap = new Map(users.map((u) => [u.phone, u]));

    const ticketsWithUser = tickets.map((t) => ({
      ...t,
      user: userMap.get(t.phone) || null,
    }));

    return res.json(ticketsWithUser);
  } catch (error) {
    console.error('[Tickets] List error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/tickets/:id
 * Get a single ticket by ID.
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const ticket = await Ticket.findById(req.params.id).lean();
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const user = await User.findOne({ phone: ticket.phone }).lean();

    return res.json({ ...ticket, user });
  } catch (error) {
    console.error('[Tickets] Get error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/tickets/:id/messages
 * Add a message to a ticket (from agent or customer).
 */
router.post('/:id/messages', async (req: Request, res: Response) => {
  try {
    const message = validateMessage(req.body.message);
    const role = req.body.role as 'customer' | 'agent';

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    if (!['customer', 'agent'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    ticket.messages.push({
      role,
      content: message,
      timestamp: new Date(),
    });

    // If customer message, also run AI for copilot suggestion
    if (role === 'customer') {
      try {
        const aiResult = await runSupportAgent(ticket.phone, message, ticket.messages);
        ticket.messages.push({
          role: 'ai',
          content: aiResult.suggestedReply,
          timestamp: new Date(),
        });
      } catch {
        // Silently fail AI — don't block the message
      }
    }

    if (role === 'agent' && ticket.status === 'open') {
      ticket.status = 'in_progress';
    }

    ticket.updatedAt = new Date();
    await ticket.save();

    return res.json(ticket);
  } catch (error) {
    console.error('[Tickets] Add message error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/tickets/:id/suggest
 * Generate (or regenerate) AI suggestion for admin copilot.
 */
router.post('/:id/suggest', async (req: Request, res: Response) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Find last customer message
    const lastCustomerMsg = [...ticket.messages]
      .reverse()
      .find((m) => m.role === 'customer');

    if (!lastCustomerMsg) {
      return res.status(400).json({ error: 'No customer message to respond to' });
    }

    const aiResult = await runSupportAgent(
      ticket.phone,
      lastCustomerMsg.content,
      ticket.messages
    );

    return res.json({
      suggestion: aiResult.suggestedReply,
      intent: aiResult.intent,
      actions: aiResult.actions,
      context: aiResult.context,
    });
  } catch (error) {
    console.error('[Tickets] Suggest error:', error);
    return res.status(500).json({ error: 'Failed to generate suggestion' });
  }
});

/**
 * PATCH /api/tickets/:id/status
 * Update ticket status.
 */
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!['open', 'in_progress', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    return res.json(ticket);
  } catch (error) {
    console.error('[Tickets] Status update error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

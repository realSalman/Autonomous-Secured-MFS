import { Router, Request, Response } from 'express';
import { getDb } from '../db/connection';
import { tickets, users, counters } from '../db/schema';
import { eq, sql, or, inArray, desc } from 'drizzle-orm';
import { runSupportAgent } from '../ai/graph';
import { validatePhone, validateMessage } from '../validation/index';
import { IMessage } from '../types/index';

const router = Router();

/**
 * Get next sequential ticket token.
 * Atomically increments and returns formatted token like TKT-0001.
 */
async function getNextTicketToken(): Promise<string> {
  const db = getDb();
  const [counter] = await db.insert(counters)
    .values({ name: 'ticket', value: 1 })
    .onConflictDoUpdate({
      target: counters.name,
      set: { value: sql`${counters.value} + 1` },
    })
    .returning();
  const num = counter.value.toString().padStart(4, '0');
  return `TKT-${num}`;
}

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

    const db = getDb();

    // Check for existing open ticket for this user
    const [existingTicket] = await db.select().from(tickets)
      .where(
        sql`${tickets.phone} = ${phone} AND ${tickets.status} IN ('open', 'in_progress')`
      )
      .limit(1);

    let ticketId: number;
    let token: string;
    let ticketMessages: IMessage[];
    let ticketStatus: string;
    let ticketCategory: string;
    let ticketCreatedAt: Date;

    if (existingTicket) {
      ticketId = existingTicket.id;
      token = existingTicket.token;
      ticketMessages = (existingTicket.messages as IMessage[]) || [];
      ticketStatus = existingTicket.status;
      ticketCategory = existingTicket.category;
      ticketCreatedAt = existingTicket.createdAt;
    } else {
      token = await getNextTicketToken();
      const [newTicket] = await db.insert(tickets).values({
        token,
        phone,
        status: 'open',
        category: 'general',
        messages: [],
      }).returning();
      ticketId = newTicket.id;
      ticketMessages = [];
      ticketStatus = 'open';
      ticketCategory = 'general';
      ticketCreatedAt = newTicket.createdAt;
    }

    // Add customer message
    ticketMessages.push({
      role: 'customer',
      content: message,
      timestamp: new Date(),
    });

    // Run AI agent
    let aiResult;
    try {
      aiResult = await runSupportAgent(phone, message, ticketMessages);
      ticketCategory = aiResult.intent;

      // Add AI response as a message
      ticketMessages.push({
        role: 'ai',
        content: aiResult.suggestedReply,
        timestamp: new Date(),
      });
    } catch (aiError) {
      console.error('[Tickets] AI agent error:', aiError);
      const fallbackReply = 'Thank you for reaching out. A support agent will assist you shortly.';
      ticketMessages.push({
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

    const now = new Date();
    const [updatedTicket] = await db.update(tickets)
      .set({
        messages: ticketMessages,
        category: ticketCategory,
        updatedAt: now,
      })
      .where(eq(tickets.id, ticketId))
      .returning();

    return res.json({
      ticket: {
        _id: updatedTicket.id,
        token: updatedTicket.token,
        phone: updatedTicket.phone,
        status: updatedTicket.status,
        category: updatedTicket.category,
        messages: updatedTicket.messages,
        createdAt: updatedTicket.createdAt,
        updatedAt: updatedTicket.updatedAt,
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

    const db = getDb();

    let query = db.select().from(tickets).orderBy(desc(tickets.updatedAt));

    let ticketList;
    if (status && ['open', 'in_progress', 'resolved'].includes(status)) {
      ticketList = await db.select().from(tickets)
        .where(eq(tickets.status, status))
        .orderBy(desc(tickets.updatedAt));
    } else {
      ticketList = await db.select().from(tickets).orderBy(desc(tickets.updatedAt));
    }

    // Search filter: match token, phone, or message content
    let filtered = ticketList;
    if (search) {
      const q = search.toLowerCase();
      filtered = ticketList.filter(
        (t) =>
          t.token.toLowerCase().includes(q) ||
          t.phone.includes(q) ||
          (t.messages as IMessage[]).some((m) => m.content.toLowerCase().includes(q))
      );
    }

    // Attach user info to each ticket
    const phones = [...new Set(filtered.map((t) => t.phone))];
    let userList: any[] = [];
    if (phones.length > 0) {
      userList = await db.select().from(users).where(inArray(users.phone, phones));
    }
    const userMap = new Map(userList.map((u) => [u.phone, u]));

    const ticketsWithUser = filtered.map((t) => ({
      _id: t.id,
      ...t,
      user: userMap.get(t.phone)
        ? {
            phone: userMap.get(t.phone)!.phone,
            name: userMap.get(t.phone)!.name,
            balance: Number(userMap.get(t.phone)!.balance),
          }
        : null,
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
    const db = getDb();
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({ error: 'Invalid ticket ID' });
    }

    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const [user] = await db.select().from(users).where(eq(users.phone, ticket.phone));

    return res.json({
      _id: ticket.id,
      ...ticket,
      user: user ? { phone: user.phone, name: user.name, balance: Number(user.balance) } : null,
    });
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
    const messageContent = validateMessage(req.body.message);
    const role = req.body.role as 'customer' | 'agent';

    if (!messageContent) {
      return res.status(400).json({ error: 'Message is required' });
    }
    if (!['customer', 'agent'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const db = getDb();
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({ error: 'Invalid ticket ID' });
    }

    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticketMessages = (ticket.messages as IMessage[]) || [];

    ticketMessages.push({
      role,
      content: messageContent,
      timestamp: new Date(),
    });

    // If customer message, also run AI for copilot suggestion
    if (role === 'customer') {
      try {
        const aiResult = await runSupportAgent(ticket.phone, messageContent, ticketMessages);
        ticketMessages.push({
          role: 'ai',
          content: aiResult.suggestedReply,
          timestamp: new Date(),
        });
      } catch {
        // Silently fail AI — don't block the message
      }
    }

    let newStatus = ticket.status;
    if (role === 'agent' && ticket.status === 'open') {
      newStatus = 'in_progress';
    }

    const [updatedTicket] = await db.update(tickets)
      .set({
        messages: ticketMessages,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, ticketId))
      .returning();

    return res.json({
      _id: updatedTicket.id,
      ...updatedTicket,
    });
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
    const db = getDb();
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({ error: 'Invalid ticket ID' });
    }

    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticketMessages = (ticket.messages as IMessage[]) || [];

    // Find last customer message
    const lastCustomerMsg = [...ticketMessages]
      .reverse()
      .find((m) => m.role === 'customer');

    if (!lastCustomerMsg) {
      return res.status(400).json({ error: 'No customer message to respond to' });
    }

    const aiResult = await runSupportAgent(
      ticket.phone,
      lastCustomerMsg.content,
      ticketMessages
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

    const db = getDb();
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({ error: 'Invalid ticket ID' });
    }

    const [updatedTicket] = await db.update(tickets)
      .set({ status, updatedAt: new Date() })
      .where(eq(tickets.id, ticketId))
      .returning();

    if (!updatedTicket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    return res.json({
      _id: updatedTicket.id,
      ...updatedTicket,
    });
  } catch (error) {
    console.error('[Tickets] Status update error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { ojuriAdminRequest } from '../services/ojuri';

const router = Router();

/**
 * GET /api/fraud/rules
 * List all fraud rules.
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await ojuriAdminRequest('GET', '/v1/admin/rules');
    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error('[FraudRules] List error:', error);
    return res.status(500).json({ error: 'Failed to fetch rules' });
  }
});

/**
 * POST /api/fraud/rules
 * Create a new fraud rule.
 *
 * Body: { name, stage, action, priority, expression, active? }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const result = await ojuriAdminRequest('POST', '/v1/admin/rules', req.body);
    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error('[FraudRules] Create error:', error);
    return res.status(500).json({ error: 'Failed to create rule' });
  }
});

/**
 * PATCH /api/fraud/rules/:id
 * Update an existing fraud rule.
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const result = await ojuriAdminRequest('PATCH', `/v1/admin/rules/${req.params.id}`, req.body);
    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error('[FraudRules] Update error:', error);
    return res.status(500).json({ error: 'Failed to update rule' });
  }
});

/**
 * DELETE /api/fraud/rules/:id
 * Delete a fraud rule.
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await ojuriAdminRequest('DELETE', `/v1/admin/rules/${req.params.id}`);
    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error('[FraudRules] Delete error:', error);
    return res.status(500).json({ error: 'Failed to delete rule' });
  }
});

/**
 * POST /api/fraud/rules/:id/toggle
 * Toggle a rule on/off.
 */
router.post('/:id/toggle', async (req: Request, res: Response) => {
  try {
    // First get the current rule
    const getResult = await ojuriAdminRequest('GET', `/v1/admin/rules/${req.params.id}`);
    if (getResult.status !== 200) {
      return res.status(getResult.status).json(getResult.data);
    }
    const rule = (getResult.data as any).data || getResult.data;
    const newActive = !rule.active;

    const result = await ojuriAdminRequest('PATCH', `/v1/admin/rules/${req.params.id}`, {
      active: newActive,
    });
    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error('[FraudRules] Toggle error:', error);
    return res.status(500).json({ error: 'Failed to toggle rule' });
  }
});

export default router;

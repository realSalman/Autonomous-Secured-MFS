import { Router, Request, Response } from 'express';
import { ojuriAdminRequest } from '../services/ojuri';

const router = Router();

/**
 * POST /api/fraud/training/import
 * Import labelled training data (CSV upload or JSON array).
 *
 * Body: { data: Array<{ transaction_id: string; is_fraud: boolean }> }
 */
router.post('/import', async (req: Request, res: Response) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: 'Data must be a non-empty array' });
    }

    // Validate format
    const valid = data.every(
      (d: any) =>
        typeof d.transaction_id === 'string' &&
        typeof d.is_fraud === 'boolean'
    );
    if (!valid) {
      return res.status(400).json({
        error: 'Each item must have { transaction_id: string, is_fraud: boolean }',
      });
    }

    const result = await ojuriAdminRequest('POST', '/v1/admin/training/import', { data });
    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error('[FraudTraining] Import error:', error);
    return res.status(500).json({ error: 'Failed to import training data' });
  }
});

/**
 * GET /api/fraud/training/status
 * Get MLA training status — last retrain, drift metrics, etc.
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const result = await ojuriAdminRequest('GET', '/v1/admin/training/status');
    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error('[FraudTraining] Status error:', error);
    return res.status(500).json({ error: 'Failed to fetch training status' });
  }
});

export default router;

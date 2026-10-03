import { Router, Request, Response } from 'express';
import { ojuriAdminRequest } from '../services/ojuri';

const router = Router();

// ── Model Registry ──

/**
 * GET /api/fraud/models
 * List all registered model versions.
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await ojuriAdminRequest('GET', '/v1/admin/models');
    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error('[FraudModels] List error:', error);
    return res.status(500).json({ error: 'Failed to fetch models' });
  }
});

/**
 * POST /api/fraud/models
 * Register a new model version.
 *
 * Body: { version, sourceUri, sha256, defaultThreshold?, metrics?, metadata? }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const result = await ojuriAdminRequest('POST', '/v1/admin/models', req.body);
    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error('[FraudModels] Register error:', error);
    return res.status(500).json({ error: 'Failed to register model' });
  }
});

/**
 * POST /api/fraud/models/:version/activate
 * Promote a model to ACTIVE (champion).
 */
router.post('/:version/activate', async (req: Request, res: Response) => {
  try {
    const result = await ojuriAdminRequest(
      'POST',
      `/v1/admin/models/${req.params.version}/status`,
      { status: 'ACTIVE' }
    );
    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error('[FraudModels] Activate error:', error);
    return res.status(500).json({ error: 'Failed to activate model' });
  }
});

/**
 * POST /api/fraud/models/:version/shadow
 * Set a model as SHADOW (A/B test mode).
 */
router.post('/:version/shadow', async (req: Request, res: Response) => {
  try {
    const result = await ojuriAdminRequest(
      'POST',
      `/v1/admin/models/${req.params.version}/status`,
      { status: 'SHADOW' }
    );
    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error('[FraudModels] Shadow error:', error);
    return res.status(500).json({ error: 'Failed to set shadow model' });
  }
});

/**
 * POST /api/fraud/models/:version/retire
 * Retire a model.
 */
router.post('/:version/retire', async (req: Request, res: Response) => {
  try {
    const result = await ojuriAdminRequest(
      'POST',
      `/v1/admin/models/${req.params.version}/status`,
      { status: 'RETIRED' }
    );
    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error('[FraudModels] Retire error:', error);
    return res.status(500).json({ error: 'Failed to retire model' });
  }
});

// ── Segment Thresholds ──

/**
 * GET /api/fraud/thresholds
 * List all per-segment thresholds.
 */
router.get('/thresholds', async (_req: Request, res: Response) => {
  try {
    const result = await ojuriAdminRequest('GET', '/v1/admin/segment-thresholds');
    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error('[FraudModels] Thresholds list error:', error);
    return res.status(500).json({ error: 'Failed to fetch thresholds' });
  }
});

/**
 * POST /api/fraud/thresholds
 * Create a per-segment threshold.
 *
 * Body: { segment, threshold, modelVersion }
 */
router.post('/thresholds', async (req: Request, res: Response) => {
  try {
    const result = await ojuriAdminRequest('POST', '/v1/admin/segment-thresholds', req.body);
    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error('[FraudModels] Threshold create error:', error);
    return res.status(500).json({ error: 'Failed to create threshold' });
  }
});

/**
 * DELETE /api/fraud/thresholds/:id
 * Delete a per-segment threshold.
 */
router.delete('/thresholds/:id', async (req: Request, res: Response) => {
  try {
    const result = await ojuriAdminRequest('DELETE', `/v1/admin/segment-thresholds/${req.params.id}`);
    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error('[FraudModels] Threshold delete error:', error);
    return res.status(500).json({ error: 'Failed to delete threshold' });
  }
});

export default router;

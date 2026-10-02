import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import { validatePhone, validateName } from '../validation/index';

const router = Router();

/**
 * POST /api/auth/login
 * Login or register with phone number.
 * If user exists, return user. If not, create with defaults.
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const phone = validatePhone(req.body.phone);
    if (!phone) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({
        phone,
        name: '',
        balance: 10000,
      });
      console.log(`[Auth] New user created: ${phone}`);
    }

    return res.json({
      phone: user.phone,
      name: user.name,
      balance: user.balance,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/user/:phone
 * Get user profile.
 */
router.get('/user/:phone', async (req: Request, res: Response) => {
  try {
    const phone = validatePhone(req.params.phone);
    if (!phone) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      phone: user.phone,
      name: user.name,
      balance: user.balance,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('[Auth] Get user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/auth/user/:phone
 * Update user profile (name).
 */
router.put('/user/:phone', async (req: Request, res: Response) => {
  try {
    const phone = validatePhone(req.params.phone);
    if (!phone) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    const name = validateName(req.body.name);
    if (!name) {
      return res.status(400).json({ error: 'Invalid name' });
    }

    const user = await User.findOneAndUpdate(
      { phone },
      { name },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      phone: user.phone,
      name: user.name,
      balance: user.balance,
    });
  } catch (error) {
    console.error('[Auth] Update user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

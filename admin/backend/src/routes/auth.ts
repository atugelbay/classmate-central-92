import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config.js';
import { authMiddleware } from '../middleware/auth.js';
import { AuthenticatedRequest, AdminUser } from '../types/index.js';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = loginSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: validation.error.errors,
      });
      return;
    }

    const { username, password } = validation.data;

    // Check username
    if (username !== config.adminUsername) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
      return;
    }

    // Check password
    // If no hash is configured, use a default password in development
    let isValidPassword = false;
    
    if (config.adminPasswordHash) {
      isValidPassword = await bcrypt.compare(password, config.adminPasswordHash);
    } else if (config.nodeEnv === 'development') {
      // Default password for development: "admin123"
      isValidPassword = password === 'admin123';
    }

    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
      return;
    }

    // Generate JWT
    const payload: AdminUser = {
      username: config.adminUsername,
      role: 'super_admin',
    };

    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });

    res.json({
      success: true,
      data: {
        token,
        user: payload,
        expiresIn: config.jwtExpiresIn,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
});

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response): void => {
  // JWT is stateless, so logout is handled client-side
  // This endpoint is for consistency and future token blacklisting
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    success: true,
    data: {
      user: req.admin,
    },
  });
});

// POST /api/auth/generate-hash (utility endpoint for development)
router.post('/generate-hash', async (req: Request, res: Response): Promise<void> => {
  if (config.nodeEnv !== 'development') {
    res.status(403).json({
      success: false,
      error: 'Only available in development mode',
    });
    return;
  }

  const { password } = req.body;
  
  if (!password || typeof password !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Password is required',
    });
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  
  res.json({
    success: true,
    data: {
      hash,
      usage: 'Set this as ADMIN_PASSWORD_HASH in your .env file',
    },
  });
});

export { router as authRouter };

import { Router, Response } from 'express';
import { dbService } from '../services/db.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();

// GET /api/users
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);
    
    const filters: {
      companyId?: string;
      email?: string;
      isVerified?: boolean;
    } = {};

    if (req.query.company_id) {
      filters.companyId = req.query.company_id as string;
    }
    if (req.query.email) {
      filters.email = req.query.email as string;
    }
    if (req.query.is_verified !== undefined) {
      filters.isVerified = req.query.is_verified === 'true';
    }

    const result = await dbService.getUsers(page, limit, filters);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
    });
  }
});

// GET /api/users/:id
router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = parseInt(id, 10);
    
    const result = await dbService.executeQuery(`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.company_id,
        c.name as company_name,
        u.role_id,
        r.name as role_name,
        u.is_email_verified,
        u.onboarding_completed,
        u.current_branch_id,
        b.name as current_branch_name,
        u.created_at,
        u.updated_at
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN branches b ON u.current_branch_id = b.id
      WHERE u.id = ${userId}
    `);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Get user's roles
    const rolesResult = await dbService.executeQuery(`
      SELECT r.id, r.name, r.description
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ${userId}
    `);

    // Get user's branches
    const branchesResult = await dbService.executeQuery(`
      SELECT b.id, b.name
      FROM user_branches ub
      JOIN branches b ON ub.branch_id = b.id
      WHERE ub.user_id = ${userId}
    `);

    res.json({
      success: true,
      data: {
        user: result.rows[0],
        roles: rolesResult.rows,
        branches: branchesResult.rows,
      },
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user details',
    });
  }
});

// GET /api/users/stats
router.get('/stats/overview', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await dbService.executeQuery(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_email_verified = true) as verified,
        COUNT(*) FILTER (WHERE is_email_verified = false) as unverified,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as new_this_week,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_this_month
      FROM users
    `);

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user stats',
    });
  }
});

export { router as usersRouter };

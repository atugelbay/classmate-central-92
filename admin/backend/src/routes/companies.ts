import { Router, Response } from 'express';
import { dbService } from '../services/db.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();

// GET /api/companies
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);

    const result = await dbService.getCompanies(page, limit);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch companies',
    });
  }
});

// GET /api/companies/:id
router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await dbService.getCompanyDetails(id);

    if (!result) {
      res.status(404).json({
        success: false,
        error: 'Company not found',
      });
      return;
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get company details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch company details',
    });
  }
});

// GET /api/companies/:id/users
router.get('/:id/users', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);

    const result = await dbService.getUsers(page, limit, { companyId: id });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Get company users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch company users',
    });
  }
});

// GET /api/companies/:id/stats
router.get('/:id/stats', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await dbService.getCompanyDetails(id);

    if (!result) {
      res.status(404).json({
        success: false,
        error: 'Company not found',
      });
      return;
    }

    res.json({
      success: true,
      data: result.stats,
    });
  } catch (error) {
    console.error('Get company stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch company stats',
    });
  }
});

export { router as companiesRouter };

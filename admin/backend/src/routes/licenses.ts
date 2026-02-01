import { Router, Response } from 'express';
import { dbService } from '../services/db.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();

// GET /api/licenses/stats - License statistics
router.get('/stats', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const stats = await dbService.getLicenseStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get license stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch license statistics',
    });
  }
});

// GET /api/licenses/plans - Get all plans
router.get('/plans', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const plans = await dbService.getPlans();
    res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch plans',
    });
  }
});

// GET /api/licenses/unassigned - Get companies without license
router.get('/unassigned', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companies = await dbService.getCompaniesWithoutLicense();
    res.json({
      success: true,
      data: companies,
    });
  } catch (error) {
    console.error('Get unassigned companies error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch unassigned companies',
    });
  }
});

// GET /api/licenses - Get all licenses with pagination and filters
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);
    const status = req.query.status as string | undefined;
    const planId = req.query.plan_id as string | undefined;
    const search = req.query.search as string | undefined;

    const result = await dbService.getLicenses(page, limit, { status, planId, search });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Get licenses error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch licenses',
    });
  }
});

// GET /api/licenses/:companyId - Get license for specific company
router.get('/:companyId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.params.companyId;
    const license = await dbService.getLicenseByCompany(companyId);

    if (!license) {
      res.status(404).json({
        success: false,
        error: 'License not found for this company',
      });
      return;
    }

    res.json({
      success: true,
      data: license,
    });
  } catch (error) {
    console.error('Get license error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch license',
    });
  }
});

// POST /api/licenses - Create/assign license to a company
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { companyId, planId, status, periodMonths, notes } = req.body;

    if (!companyId || !planId) {
      res.status(400).json({
        success: false,
        error: 'companyId and planId are required',
      });
      return;
    }

    const result = await dbService.createLicense({
      companyId,
      planId,
      status,
      periodMonths,
      notes,
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'License created successfully',
    });
  } catch (error) {
    console.error('Create license error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create license',
    });
  }
});

// PUT /api/licenses/:companyId - Update license
router.put('/:companyId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.params.companyId;
    const {
      planId,
      status,
      periodEnd,
      extendMonths,
      reduceMonths,
      customMaxStudents,
      customMaxUsers,
      customMaxTeachers,
      customMaxBranches,
      notes,
    } = req.body;

    const result = await dbService.updateLicense(companyId, {
      planId,
      status,
      periodEnd,
      extendMonths,
      reduceMonths,
      customMaxStudents,
      customMaxUsers,
      customMaxTeachers,
      customMaxBranches,
      notes,
    });

    if (!result.success) {
      res.status(404).json({
        success: false,
        error: result.message,
      });
      return;
    }

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Update license error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update license',
    });
  }
});

// DELETE /api/licenses/:companyId - Delete license
router.delete('/:companyId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.params.companyId;
    const result = await dbService.deleteLicense(companyId);

    if (!result.success) {
      res.status(404).json({
        success: false,
        error: result.message,
      });
      return;
    }

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Delete license error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete license',
    });
  }
});

// POST /api/licenses/:companyId/extend - Quick extend license
router.post('/:companyId/extend', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.params.companyId;
    const { months = 1 } = req.body;

    const result = await dbService.updateLicense(companyId, {
      extendMonths: months,
    });

    if (!result.success) {
      res.status(404).json({
        success: false,
        error: result.message,
      });
      return;
    }

    res.json({
      success: true,
      message: `License extended by ${months} month(s)`,
    });
  } catch (error) {
    console.error('Extend license error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to extend license',
    });
  }
});

// POST /api/licenses/:companyId/suspend - Suspend license
router.post('/:companyId/suspend', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.params.companyId;

    const result = await dbService.updateLicense(companyId, {
      status: 'suspended',
    });

    if (!result.success) {
      res.status(404).json({
        success: false,
        error: result.message,
      });
      return;
    }

    res.json({
      success: true,
      message: 'License suspended',
    });
  } catch (error) {
    console.error('Suspend license error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to suspend license',
    });
  }
});

// POST /api/licenses/:companyId/activate - Activate license
router.post('/:companyId/activate', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.params.companyId;

    const result = await dbService.updateLicense(companyId, {
      status: 'active',
    });

    if (!result.success) {
      res.status(404).json({
        success: false,
        error: result.message,
      });
      return;
    }

    res.json({
      success: true,
      message: 'License activated',
    });
  } catch (error) {
    console.error('Activate license error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to activate license',
    });
  }
});

export { router as licensesRouter };

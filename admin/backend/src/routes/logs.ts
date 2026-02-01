import { Router, Response } from 'express';
import { getLogs, getErrors, getLogStats } from '../services/logger.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();

// GET /api/logs
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const level = req.query.level as 'info' | 'warn' | 'error' | undefined;
    const search = req.query.search as string | undefined;
    const startDate = req.query.start_date as string | undefined;
    const endDate = req.query.end_date as string | undefined;
    const source = req.query.source as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 100, 500);
    const offset = parseInt(req.query.offset as string, 10) || 0;

    const result = getLogs({
      level,
      search,
      startDate,
      endDate,
      source,
      limit,
      offset,
    });

    res.json({
      success: true,
      data: result.logs,
      total: result.total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch logs',
    });
  }
});

// GET /api/logs/errors
router.get('/errors', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const search = req.query.search as string | undefined;
    const startDate = req.query.start_date as string | undefined;
    const endDate = req.query.end_date as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 100, 500);
    const offset = parseInt(req.query.offset as string, 10) || 0;

    const result = getErrors({
      search,
      startDate,
      endDate,
      limit,
      offset,
    });

    res.json({
      success: true,
      data: result.logs,
      total: result.total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get errors error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch errors',
    });
  }
});

// GET /api/logs/stats
router.get('/stats', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const stats = getLogStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get log stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch log stats',
    });
  }
});

export { router as logsRouter };

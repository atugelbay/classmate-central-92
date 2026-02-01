import { Router, Response } from 'express';
import { dbService } from '../services/db.js';
import { mainApiService } from '../services/mainApi.js';
import { getLogStats } from '../services/logger.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const stats = await dbService.getDashboardStats();
    const logStats = getLogStats();
    
    // Try to get main API health
    let mainApiStatus = 'unknown';
    try {
      const health = await mainApiService.healthCheck();
      mainApiStatus = health.status || 'ok';
    } catch {
      mainApiStatus = 'unavailable';
    }

    res.json({
      success: true,
      data: {
        ...stats,
        logs: logStats,
        mainApiStatus,
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard stats',
    });
  }
});

// GET /api/dashboard/activity
router.get('/activity', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const days = parseInt(req.query.days as string, 10) || 30;
    const validDays = Math.min(Math.max(days, 7), 90);
    
    const activity = await dbService.getActivityData(validDays);

    res.json({
      success: true,
      data: activity,
    });
  } catch (error) {
    console.error('Activity data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity data',
    });
  }
});

// GET /api/dashboard/system
router.get('/system', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [apiInfo, tables] = await Promise.all([
      mainApiService.getApiInfo(),
      dbService.getTables(),
    ]);

    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      mainApi: apiInfo,
      database: {
        tablesCount: tables.length,
        totalRows: tables.reduce((sum, t) => sum + t.rowCount, 0),
      },
    };

    res.json({
      success: true,
      data: systemInfo,
    });
  } catch (error) {
    console.error('System info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system info',
    });
  }
});

export { router as dashboardRouter };

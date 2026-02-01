import { Router, Response } from 'express';
import { z } from 'zod';
import { dbService } from '../services/db.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();

// GET /api/database/tables
router.get('/tables', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const tables = await dbService.getTables();

    res.json({
      success: true,
      data: tables,
    });
  } catch (error) {
    console.error('Get tables error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tables',
    });
  }
});

// GET /api/database/tables/:name
router.get('/tables/:name', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const name = req.params.name as string;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 200);
    const orderBy = (req.query.order_by as string) || 'id';
    const orderDir = (req.query.order_dir as string) === 'asc' ? 'asc' : 'desc';

    const result = await dbService.getTableData(name, page, limit, orderBy, orderDir);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not accessible')) {
      res.status(403).json({
        success: false,
        error: error.message,
      });
      return;
    }

    console.error('Get table data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch table data',
    });
  }
});

// GET /api/database/tables/:name/columns
router.get('/tables/:name/columns', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const name = req.params.name as string;
    const columns = await dbService.getTableColumns(name);

    res.json({
      success: true,
      data: columns,
    });
  } catch (error) {
    console.error('Get columns error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch columns',
    });
  }
});

const querySchema = z.object({
  sql: z.string().min(1, 'SQL query is required').max(5000, 'Query too long'),
});

// POST /api/database/query
router.post('/query', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const validation = querySchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: validation.error.errors,
      });
      return;
    }

    const { sql } = validation.data;
    const result = await dbService.executeQuery(sql);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      // Return safe error messages for query validation errors
      if (
        error.message.includes('Only SELECT') ||
        error.message.includes('forbidden keyword')
      ) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
        return;
      }
    }

    console.error('Execute query error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Query execution failed',
    });
  }
});

// GET /api/database/export/:table
router.get('/export/:table', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const table = req.params.table as string;
    const format = (req.query.format as string) || 'json';
    
    // Get all data (limited to 10000 rows for safety)
    const result = await dbService.getTableData(table, 1, 10000);

    if (format === 'csv') {
      if (result.data.length === 0) {
        res.status(404).json({
          success: false,
          error: 'No data to export',
        });
        return;
      }

      const headers = Object.keys(result.data[0]);
      const csvRows = [
        headers.join(','),
        ...result.data.map(row =>
          headers
            .map(h => {
              const val = row[h];
              if (val === null || val === undefined) return '';
              const str = String(val);
              // Escape quotes and wrap in quotes if contains comma
              if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
              }
              return str;
            })
            .join(',')
        ),
      ];

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${table}.csv"`);
      res.send(csvRows.join('\n'));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${table}.json"`);
      res.json(result.data);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('not accessible')) {
      res.status(403).json({
        success: false,
        error: error.message,
      });
      return;
    }

    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export data',
    });
  }
});

export { router as databaseRouter };

import pg from 'pg';
import { config } from '../config.js';
import { TableInfo, ColumnInfo, PaginatedResponse } from '../types/index.js';

const { Pool } = pg;

// Create a connection pool
const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('📦 Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

// Whitelist of allowed tables for security
const ALLOWED_TABLES = [
  'users',
  'companies',
  'branches',
  'students',
  'teachers',
  'groups',
  'group_students',
  'student_groups',
  'lessons',
  'lesson_attendance',
  'lesson_occurrence',
  'roles',
  'permissions',
  'role_permissions',
  'user_roles',
  'student_subscriptions',
  'subscription_types',
  'subscription_consumption',
  'transaction',
  'payment_transactions',
  'tariffs',
  'rooms',
  'leads',
  'lead_activities',
  'lead_tasks',
  'invitations',
  'refresh_tokens',
  'individual_enrollment',
  'enrollment',
  'user_branches',
  'settings',
  'schedule_rule',
  'group_schedule',
  'discounts',
  'student_discounts',
  'invoice',
  'invoice_item',
  'debt_records',
  'student_balance',
  'student_notes',
  'student_activity_log',
  'notifications',
  'teacher_rates',
];

// Tables that contain sensitive data and should be masked
const SENSITIVE_COLUMNS: Record<string, string[]> = {
  users: ['password_hash'],
  refresh_tokens: ['token'],
  invitations: ['token'],
};

export class DatabaseService {
  /**
   * Get list of all tables with row counts
   */
  async getTables(): Promise<TableInfo[]> {
    const query = `
      SELECT 
        t.table_name as name,
        (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') as column_count
      FROM information_schema.tables t
      WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name
    `;
    
    const result = await pool.query(query);
    
    // Get row counts for each table
    const tablesWithCounts: TableInfo[] = await Promise.all(
      result.rows.map(async (row) => {
        const countResult = await pool.query(
          `SELECT COUNT(*) as count FROM "${row.name}"`
        );
        const columns = await this.getTableColumns(row.name);
        
        return {
          name: row.name,
          rowCount: parseInt(countResult.rows[0].count, 10),
          columns,
        };
      })
    );
    
    return tablesWithCounts;
  }

  /**
   * Get columns for a specific table
   */
  async getTableColumns(tableName: string): Promise<ColumnInfo[]> {
    const query = `
      SELECT 
        column_name as name,
        data_type as type,
        is_nullable = 'YES' as nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `;
    
    const result = await pool.query(query, [tableName]);
    return result.rows;
  }

  /**
   * Get data from a table with pagination
   */
  async getTableData(
    tableName: string,
    page: number = 1,
    limit: number = 50,
    orderBy: string = 'id',
    orderDir: 'asc' | 'desc' = 'desc'
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    // Security check
    if (!ALLOWED_TABLES.includes(tableName)) {
      throw new Error(`Table "${tableName}" is not accessible`);
    }

    // Validate orderBy to prevent SQL injection
    const columns = await this.getTableColumns(tableName);
    const columnNames = columns.map(c => c.name);
    
    if (!columnNames.includes(orderBy)) {
      orderBy = columnNames.includes('id') ? 'id' : columnNames[0];
    }

    const offset = (page - 1) * limit;
    
    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM "${tableName}"`
    );
    const total = parseInt(countResult.rows[0].total, 10);
    
    // Get data
    const query = `
      SELECT * FROM "${tableName}"
      ORDER BY "${orderBy}" ${orderDir === 'asc' ? 'ASC' : 'DESC'}
      LIMIT $1 OFFSET $2
    `;
    
    const result = await pool.query(query, [limit, offset]);
    
    // Mask sensitive columns
    const sensitiveColumns = SENSITIVE_COLUMNS[tableName] || [];
    const maskedData = result.rows.map(row => {
      const maskedRow = { ...row };
      sensitiveColumns.forEach(col => {
        if (col in maskedRow) {
          maskedRow[col] = '[REDACTED]';
        }
      });
      return maskedRow;
    });
    
    return {
      data: maskedData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Execute a readonly SQL query
   */
  async executeQuery(sql: string): Promise<{
    rows: Record<string, unknown>[];
    rowCount: number;
    fields: string[];
  }> {
    // Security: Only allow SELECT statements
    const trimmedSql = sql.trim().toLowerCase();
    
    if (!trimmedSql.startsWith('select')) {
      throw new Error('Only SELECT queries are allowed');
    }

    // Check for potentially dangerous keywords
    const dangerousKeywords = ['insert', 'update', 'delete', 'drop', 'truncate', 'alter', 'create', 'grant', 'revoke'];
    for (const keyword of dangerousKeywords) {
      if (trimmedSql.includes(keyword)) {
        throw new Error(`Query contains forbidden keyword: ${keyword}`);
      }
    }

    // Add LIMIT if not present to prevent huge result sets
    let safeQuery = sql;
    if (!trimmedSql.includes('limit')) {
      safeQuery = `${sql} LIMIT 1000`;
    }

    const result = await pool.query(safeQuery);
    
    return {
      rows: result.rows,
      rowCount: result.rowCount || 0,
      fields: result.fields.map(f => f.name),
    };
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<{
    totalCompanies: number;
    totalUsers: number;
    totalStudents: number;
    totalTeachers: number;
    totalGroups: number;
    totalTransactions: number;
    activeUsersToday: number;
    newUsersThisWeek: number;
  }> {
    // Helper function to safely count rows in a table
    const safeCount = async (tableName: string, whereClause?: string): Promise<number> => {
      try {
        const query = whereClause 
          ? `SELECT COUNT(*) as count FROM "${tableName}" WHERE ${whereClause}`
          : `SELECT COUNT(*) as count FROM "${tableName}"`;
        const result = await pool.query(query);
        return parseInt(result.rows[0].count, 10);
      } catch (error) {
        console.error(`Error counting ${tableName}:`, error);
        return 0;
      }
    };

    const [
      totalCompanies,
      totalUsers,
      totalStudents,
      totalTeachers,
      totalGroups,
      totalTransactions,
      activeUsersToday,
      newUsersThisWeek,
    ] = await Promise.all([
      safeCount('companies'),
      safeCount('users'),
      safeCount('students'),
      safeCount('teachers'),
      safeCount('groups'),
      safeCount('transaction'),  // Note: table is named 'transaction' not 'transactions'
      safeCount('users', "updated_at >= CURRENT_DATE"),
      safeCount('users', "created_at >= CURRENT_DATE - INTERVAL '7 days'"),
    ]);

    return {
      totalCompanies,
      totalUsers,
      totalStudents,
      totalTeachers,
      totalGroups,
      totalTransactions,
      activeUsersToday,
      newUsersThisWeek,
    };
  }

  /**
   * Get activity data for charts
   */
  async getActivityData(days: number = 30): Promise<{
    date: string;
    users: number;
    students: number;
    transactions: number;
  }[]> {
    try {
      const query = `
        WITH dates AS (
          SELECT generate_series(
            CURRENT_DATE - INTERVAL '${days} days',
            CURRENT_DATE,
            '1 day'::interval
          )::date as date
        )
        SELECT 
          d.date::text,
          COALESCE(u.count, 0) as users,
          COALESCE(s.count, 0) as students,
          COALESCE(t.count, 0) as transactions
        FROM dates d
        LEFT JOIN (
          SELECT DATE(created_at) as date, COUNT(*) as count 
          FROM users 
          WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
          GROUP BY DATE(created_at)
        ) u ON d.date = u.date
        LEFT JOIN (
          SELECT DATE(created_at) as date, COUNT(*) as count 
          FROM students 
          WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
          GROUP BY DATE(created_at)
        ) s ON d.date = s.date
        LEFT JOIN (
          SELECT DATE(created_at) as date, COUNT(*) as count 
          FROM transaction 
          WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
          GROUP BY DATE(created_at)
        ) t ON d.date = t.date
        ORDER BY d.date
      `;

      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error getting activity data:', error);
      return [];
    }
  }

  /**
   * Get all companies with stats
   */
  async getCompanies(page: number = 1, limit: number = 20): Promise<PaginatedResponse<{
    id: string;
    name: string;
    created_at: string;
    usersCount: number;
    studentsCount: number;
  }>> {
    const offset = (page - 1) * limit;
    
    const countResult = await pool.query('SELECT COUNT(*) as total FROM companies');
    const total = parseInt(countResult.rows[0].total, 10);
    
    const query = `
      SELECT 
        c.id,
        c.name,
        c.created_at,
        (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id) as users_count,
        (SELECT COUNT(*) FROM students s WHERE s.company_id = c.id) as students_count
      FROM companies c
      ORDER BY c.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await pool.query(query, [limit, offset]);
    
    return {
      data: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        created_at: row.created_at,
        usersCount: parseInt(row.users_count, 10),
        studentsCount: parseInt(row.students_count, 10),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get company details with full stats
   */
  async getCompanyDetails(companyId: string): Promise<{
    company: Record<string, unknown>;
    stats: {
      usersCount: number;
      studentsCount: number;
      teachersCount: number;
      groupsCount: number;
      transactionsCount: number;
    };
  } | null> {
    const companyResult = await pool.query(
      'SELECT * FROM companies WHERE id = $1',
      [companyId]
    );
    
    if (companyResult.rows.length === 0) {
      return null;
    }
    
    // Helper function to safely count
    const safeCountByCompany = async (tableName: string): Promise<number> => {
      try {
        const result = await pool.query(
          `SELECT COUNT(*) as count FROM "${tableName}" WHERE company_id = $1`,
          [companyId]
        );
        return parseInt(result.rows[0].count, 10);
      } catch (error) {
        console.error(`Error counting ${tableName} for company:`, error);
        return 0;
      }
    };

    const [usersCount, studentsCount, teachersCount, groupsCount, transactionsCount] = await Promise.all([
      safeCountByCompany('users'),
      safeCountByCompany('students'),
      safeCountByCompany('teachers'),
      safeCountByCompany('groups'),
      safeCountByCompany('transaction'),
    ]);
    
    return {
      company: companyResult.rows[0],
      stats: {
        usersCount,
        studentsCount,
        teachersCount,
        groupsCount,
        transactionsCount,
      },
    };
  }

  /**
   * Get all users with company info
   */
  async getUsers(
    page: number = 1,
    limit: number = 50,
    filters?: {
      companyId?: string;
      email?: string;
      isVerified?: boolean;
    }
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters?.companyId) {
      conditions.push(`u.company_id = $${paramIndex++}`);
      params.push(filters.companyId);
    }
    if (filters?.email) {
      conditions.push(`u.email ILIKE $${paramIndex++}`);
      params.push(`%${filters.email}%`);
    }
    if (filters?.isVerified !== undefined) {
      conditions.push(`u.is_email_verified = $${paramIndex++}`);
      params.push(filters.isVerified);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const countQuery = `SELECT COUNT(*) as total FROM users u ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10);
    
    const query = `
      SELECT 
        u.id,
        u.email,
        u.name,
        u.company_id,
        c.name as company_name,
        u.role_id,
        r.name as role_name,
        u.is_email_verified,
        u.created_at,
        u.updated_at
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      LEFT JOIN roles r ON u.role_id = r.id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    
    const result = await pool.query(query, [...params, limit, offset]);
    
    return {
      data: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Close the pool
   */
  async close(): Promise<void> {
    await pool.end();
  }
}

export const dbService = new DatabaseService();

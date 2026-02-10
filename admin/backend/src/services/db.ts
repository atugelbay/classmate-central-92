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
  // Billing tables
  'plans',
  'company_licenses',
  'billing_history',
  'usage_metrics',
  'billing_addons',
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

    // Check for potentially dangerous SQL statements (whole words only)
    // Word boundary \b ensures we don't match "created_at" when checking for "create"
    const dangerousPatterns = [
      /\binsert\s+into\b/i,
      /\bupdate\s+\w+\s+set\b/i,
      /\bdelete\s+from\b/i,
      /\bdrop\s+(table|database|index)\b/i,
      /\btruncate\b/i,
      /\balter\s+table\b/i,
      /\bcreate\s+(table|database|index)\b/i,
      /\bgrant\b/i,
      /\brevoke\b/i,
    ];
    for (const pattern of dangerousPatterns) {
      if (pattern.test(trimmedSql)) {
        throw new Error('Query contains forbidden SQL statement');
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
   * Delete user and all related data: user, their company, company_licenses, branches (CASCADE),
   * and settings for that company (no FK, so explicit delete).
   */
  async deleteUserWithAllData(userId: number): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userResult = await client.query<{ company_id: string }>(
        'SELECT company_id FROM users WHERE id = $1',
        [userId]
      );
      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }
      const companyId = userResult.rows[0].company_id;

      await client.query('DELETE FROM users WHERE id = $1', [userId]);

      await client.query('DELETE FROM settings WHERE company_id = $1', [companyId]);
      await client.query('DELETE FROM companies WHERE id = $1', [companyId]);

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // LICENSE MANAGEMENT METHODS
  // ============================================================================

  /**
   * Get all plans
   */
  async getPlans(): Promise<{
    id: string;
    name: string;
    description: string;
    price_monthly: number;
    price_yearly: number;
    max_students: number | null;
    max_users: number | null;
    max_teachers: number | null;
    max_branches: number | null;
    features: Record<string, unknown>;
    is_active: boolean;
    sort_order: number;
  }[]> {
    const query = `
      SELECT * FROM plans
      WHERE is_active = true
      ORDER BY sort_order ASC
    `;
    const result = await pool.query(query);
    return result.rows.map(row => ({
      ...row,
      price_monthly: parseFloat(row.price_monthly),
      price_yearly: row.price_yearly ? parseFloat(row.price_yearly) : null,
    }));
  }

  /**
   * Get all licenses with company and plan info
   */
  async getLicenses(
    page: number = 1,
    limit: number = 50,
    filters?: {
      status?: string;
      planId?: string;
      search?: string;
    }
  ): Promise<PaginatedResponse<{
    id: number;
    company_id: string;
    company_name: string;
    plan_id: string;
    plan_name: string;
    status: string;
    current_period_start: string;
    current_period_end: string;
    trial_ends_at: string | null;
    students_count: number;
    users_count: number;
    max_students: number | null;
    max_users: number | null;
    notes: string | null;
    created_at: string;
  }>> {
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters?.status) {
      conditions.push(`cl.status = $${paramIndex++}`);
      params.push(filters.status);
    }
    if (filters?.planId) {
      conditions.push(`cl.plan_id = $${paramIndex++}`);
      params.push(filters.planId);
    }
    if (filters?.search) {
      conditions.push(`c.name ILIKE $${paramIndex++}`);
      params.push(`%${filters.search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*) as total 
      FROM company_licenses cl
      JOIN companies c ON cl.company_id = c.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10);

    const query = `
      SELECT 
        cl.id,
        cl.company_id,
        c.name as company_name,
        cl.plan_id,
        p.name as plan_name,
        cl.status,
        cl.current_period_start,
        cl.current_period_end,
        cl.trial_ends_at,
        cl.custom_max_students,
        cl.custom_max_users,
        cl.notes,
        cl.created_at,
        p.max_students,
        p.max_users,
        (SELECT COUNT(*) FROM students s WHERE s.company_id = cl.company_id) as students_count,
        (SELECT COUNT(*) FROM users u WHERE u.company_id = cl.company_id) as users_count
      FROM company_licenses cl
      JOIN companies c ON cl.company_id = c.id
      JOIN plans p ON cl.plan_id = p.id
      ${whereClause}
      ORDER BY cl.current_period_end ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    const result = await pool.query(query, [...params, limit, offset]);

    return {
      data: result.rows.map(row => ({
        id: row.id,
        company_id: row.company_id,
        company_name: row.company_name,
        plan_id: row.plan_id,
        plan_name: row.plan_name,
        status: row.status,
        current_period_start: row.current_period_start,
        current_period_end: row.current_period_end,
        trial_ends_at: row.trial_ends_at,
        students_count: parseInt(row.students_count, 10),
        users_count: parseInt(row.users_count, 10),
        max_students: row.custom_max_students || row.max_students,
        max_users: row.custom_max_users || row.max_users,
        notes: row.notes,
        created_at: row.created_at,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get license by company ID
   */
  async getLicenseByCompany(companyId: string): Promise<{
    id: number;
    company_id: string;
    company_name: string;
    plan_id: string;
    plan_name: string;
    plan: Record<string, unknown>;
    status: string;
    current_period_start: string;
    current_period_end: string;
    trial_ends_at: string | null;
    custom_max_students: number | null;
    custom_max_users: number | null;
    custom_max_teachers: number | null;
    custom_max_branches: number | null;
    notes: string | null;
    students_count: number;
    users_count: number;
    teachers_count: number;
    branches_count: number;
    created_at: string;
    updated_at: string;
  } | null> {
    const query = `
      SELECT 
        cl.*,
        c.name as company_name,
        p.name as plan_name,
        p.max_students as plan_max_students,
        p.max_users as plan_max_users,
        p.max_teachers as plan_max_teachers,
        p.max_branches as plan_max_branches,
        p.price_monthly,
        p.features,
        (SELECT COUNT(*) FROM students s WHERE s.company_id = cl.company_id) as students_count,
        (SELECT COUNT(*) FROM users u WHERE u.company_id = cl.company_id) as users_count,
        (SELECT COUNT(*) FROM teachers t WHERE t.company_id = cl.company_id) as teachers_count,
        (SELECT COUNT(*) FROM branches b WHERE b.company_id = cl.company_id) as branches_count
      FROM company_licenses cl
      JOIN companies c ON cl.company_id = c.id
      JOIN plans p ON cl.plan_id = p.id
      WHERE cl.company_id = $1
    `;

    const result = await pool.query(query, [companyId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      company_id: row.company_id,
      company_name: row.company_name,
      plan_id: row.plan_id,
      plan_name: row.plan_name,
      plan: {
        max_students: row.plan_max_students,
        max_users: row.plan_max_users,
        max_teachers: row.plan_max_teachers,
        max_branches: row.plan_max_branches,
        price_monthly: parseFloat(row.price_monthly),
        features: row.features,
      },
      status: row.status,
      current_period_start: row.current_period_start,
      current_period_end: row.current_period_end,
      trial_ends_at: row.trial_ends_at,
      custom_max_students: row.custom_max_students,
      custom_max_users: row.custom_max_users,
      custom_max_teachers: row.custom_max_teachers,
      custom_max_branches: row.custom_max_branches,
      notes: row.notes,
      students_count: parseInt(row.students_count, 10),
      users_count: parseInt(row.users_count, 10),
      teachers_count: parseInt(row.teachers_count, 10),
      branches_count: parseInt(row.branches_count, 10),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Create or assign license to a company
   */
  async createLicense(data: {
    companyId: string;
    planId: string;
    status?: string;
    periodMonths?: number;
    notes?: string;
  }): Promise<{ id: number; company_id: string }> {
    const periodMonths = data.periodMonths || 1;
    const status = data.status || 'active';

    const query = `
      INSERT INTO company_licenses (
        company_id, 
        plan_id, 
        status, 
        current_period_start, 
        current_period_end,
        notes
      )
      VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '${periodMonths} months', $4)
      ON CONFLICT (company_id) 
      DO UPDATE SET
        plan_id = EXCLUDED.plan_id,
        status = EXCLUDED.status,
        current_period_start = NOW(),
        current_period_end = NOW() + INTERVAL '${periodMonths} months',
        notes = EXCLUDED.notes,
        updated_at = NOW()
      RETURNING id, company_id
    `;

    const result = await pool.query(query, [
      data.companyId,
      data.planId,
      status,
      data.notes || null,
    ]);

    return result.rows[0];
  }

  /**
   * Update license
   */
  async updateLicense(
    companyId: string,
    data: {
      planId?: string;
      status?: string;
      periodEnd?: string;
      extendMonths?: number;
      reduceMonths?: number;
      customMaxStudents?: number | null;
      customMaxUsers?: number | null;
      customMaxTeachers?: number | null;
      customMaxBranches?: number | null;
      notes?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (data.planId) {
      updates.push(`plan_id = $${paramIndex++}`);
      params.push(data.planId);
    }

    if (data.status) {
      updates.push(`status = $${paramIndex++}`);
      params.push(data.status);
    }

    if (data.periodEnd) {
      updates.push(`current_period_end = $${paramIndex++}`);
      params.push(data.periodEnd);
    }

    if (data.extendMonths) {
      updates.push(`current_period_end = current_period_end + INTERVAL '${data.extendMonths} months'`);
    }

    if (data.reduceMonths) {
      updates.push(`current_period_end = current_period_end - INTERVAL '${data.reduceMonths} months'`);
    }

    if (data.customMaxStudents !== undefined) {
      updates.push(`custom_max_students = $${paramIndex++}`);
      params.push(data.customMaxStudents);
    }

    if (data.customMaxUsers !== undefined) {
      updates.push(`custom_max_users = $${paramIndex++}`);
      params.push(data.customMaxUsers);
    }

    if (data.customMaxTeachers !== undefined) {
      updates.push(`custom_max_teachers = $${paramIndex++}`);
      params.push(data.customMaxTeachers);
    }

    if (data.customMaxBranches !== undefined) {
      updates.push(`custom_max_branches = $${paramIndex++}`);
      params.push(data.customMaxBranches);
    }

    if (data.notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      params.push(data.notes);
    }

    if (updates.length === 0) {
      return { success: false, message: 'No updates provided' };
    }

    updates.push('updated_at = NOW()');

    const query = `
      UPDATE company_licenses
      SET ${updates.join(', ')}
      WHERE company_id = $${paramIndex}
      RETURNING id
    `;

    params.push(companyId);

    const result = await pool.query(query, params);

    if (result.rowCount === 0) {
      return { success: false, message: 'License not found' };
    }

    return { success: true, message: 'License updated successfully' };
  }

  /**
   * Delete license
   */
  async deleteLicense(companyId: string): Promise<{ success: boolean; message: string }> {
    const query = `DELETE FROM company_licenses WHERE company_id = $1 RETURNING id`;
    const result = await pool.query(query, [companyId]);

    if (result.rowCount === 0) {
      return { success: false, message: 'License not found' };
    }

    return { success: true, message: 'License deleted successfully' };
  }

  /**
   * Get companies without license (for assigning)
   */
  async getCompaniesWithoutLicense(): Promise<{ id: string; name: string; created_at: string }[]> {
    const query = `
      SELECT c.id, c.name, c.created_at
      FROM companies c
      LEFT JOIN company_licenses cl ON c.id = cl.company_id
      WHERE cl.id IS NULL
      ORDER BY c.created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Get license statistics
   */
  async getLicenseStats(): Promise<{
    total: number;
    active: number;
    trial: number;
    suspended: number;
    expired: number;
    expiringSoon: number;
  }> {
    const query = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'trial') as trial,
        COUNT(*) FILTER (WHERE status = 'suspended') as suspended,
        COUNT(*) FILTER (WHERE status = 'expired' OR status = 'cancelled') as expired,
        COUNT(*) FILTER (WHERE current_period_end <= NOW() + INTERVAL '7 days' AND status = 'active') as expiring_soon
      FROM company_licenses
    `;
    const result = await pool.query(query);
    const row = result.rows[0];
    return {
      total: parseInt(row.total, 10),
      active: parseInt(row.active, 10),
      trial: parseInt(row.trial, 10),
      suspended: parseInt(row.suspended, 10),
      expired: parseInt(row.expired, 10),
      expiringSoon: parseInt(row.expiring_soon, 10),
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

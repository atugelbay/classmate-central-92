import { Request } from 'express';

export interface AdminUser {
  username: string;
  role: 'super_admin';
}

export interface AuthenticatedRequest extends Request {
  admin?: AdminUser;
}

export interface DashboardStats {
  totalCompanies: number;
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalGroups: number;
  totalTransactions: number;
  activeUsersToday: number;
  newUsersThisWeek: number;
}

export interface Company {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  is_blocked?: boolean;
}

export interface CompanyStats {
  usersCount: number;
  studentsCount: number;
  teachersCount: number;
  groupsCount: number;
  transactionsCount: number;
  totalRevenue: number;
}

export interface User {
  id: number;
  email: string;
  name: string;
  company_id: string;
  company_name?: string;
  role_id: string | null;
  role_name?: string;
  is_email_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface TableInfo {
  name: string;
  rowCount: number;
  columns: ColumnInfo[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
}

export interface LogEntry {
  id: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
  source?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

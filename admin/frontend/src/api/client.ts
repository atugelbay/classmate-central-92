import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (username: string, password: string) => {
    const response = await apiClient.post('/auth/login', { username, password });
    return response.data;
  },
  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },
  me: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};

// Dashboard API
export const dashboardApi = {
  getStats: async () => {
    const response = await apiClient.get('/dashboard/stats');
    return response.data;
  },
  getActivity: async (days: number = 30) => {
    const response = await apiClient.get(`/dashboard/activity?days=${days}`);
    return response.data;
  },
  getSystem: async () => {
    const response = await apiClient.get('/dashboard/system');
    return response.data;
  },
};

// Companies API
export const companiesApi = {
  getAll: async (page: number = 1, limit: number = 20) => {
    const response = await apiClient.get(`/companies?page=${page}&limit=${limit}`);
    return response.data;
  },
  getById: async (id: string) => {
    const response = await apiClient.get(`/companies/${id}`);
    return response.data;
  },
  getUsers: async (id: string, page: number = 1, limit: number = 50) => {
    const response = await apiClient.get(`/companies/${id}/users?page=${page}&limit=${limit}`);
    return response.data;
  },
  getStats: async (id: string) => {
    const response = await apiClient.get(`/companies/${id}/stats`);
    return response.data;
  },
};

// Users API
export const usersApi = {
  getAll: async (params: {
    page?: number;
    limit?: number;
    company_id?: string;
    email?: string;
    is_verified?: boolean;
  }) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.company_id) searchParams.set('company_id', params.company_id);
    if (params.email) searchParams.set('email', params.email);
    if (params.is_verified !== undefined) searchParams.set('is_verified', params.is_verified.toString());
    
    const response = await apiClient.get(`/users?${searchParams.toString()}`);
    return response.data;
  },
  getById: async (id: number) => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },
  getStats: async () => {
    const response = await apiClient.get('/users/stats/overview');
    return response.data;
  },
};

// Database API
export const databaseApi = {
  getTables: async () => {
    const response = await apiClient.get('/database/tables');
    return response.data;
  },
  getTableData: async (
    tableName: string,
    page: number = 1,
    limit: number = 50,
    orderBy: string = 'id',
    orderDir: 'asc' | 'desc' = 'desc'
  ) => {
    const response = await apiClient.get(
      `/database/tables/${tableName}?page=${page}&limit=${limit}&order_by=${orderBy}&order_dir=${orderDir}`
    );
    return response.data;
  },
  getColumns: async (tableName: string) => {
    const response = await apiClient.get(`/database/tables/${tableName}/columns`);
    return response.data;
  },
  executeQuery: async (sql: string) => {
    const response = await apiClient.post('/database/query', { sql });
    return response.data;
  },
  exportTable: async (tableName: string, format: 'json' | 'csv' = 'json') => {
    const response = await apiClient.get(`/database/export/${tableName}?format=${format}`, {
      responseType: format === 'csv' ? 'blob' : 'json',
    });
    return response.data;
  },
};

// Logs API
export const logsApi = {
  getAll: async (params: {
    level?: 'info' | 'warn' | 'error';
    search?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params.level) searchParams.set('level', params.level);
    if (params.search) searchParams.set('search', params.search);
    if (params.start_date) searchParams.set('start_date', params.start_date);
    if (params.end_date) searchParams.set('end_date', params.end_date);
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.offset) searchParams.set('offset', params.offset.toString());
    
    const response = await apiClient.get(`/logs?${searchParams.toString()}`);
    return response.data;
  },
  getErrors: async (params: {
    search?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set('search', params.search);
    if (params.start_date) searchParams.set('start_date', params.start_date);
    if (params.end_date) searchParams.set('end_date', params.end_date);
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.offset) searchParams.set('offset', params.offset.toString());
    
    const response = await apiClient.get(`/logs/errors?${searchParams.toString()}`);
    return response.data;
  },
  getStats: async () => {
    const response = await apiClient.get('/logs/stats');
    return response.data;
  },
};

import axios from 'axios';
import { Branch } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Create axios instance with auth token
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    Authorization: `Bearer ${token}`,
  };
};

// Get current branch ID from localStorage or context
export const getCurrentBranchId = (): string | null => {
  return localStorage.getItem('currentBranchId');
};

// Set current branch ID
export const setCurrentBranchId = (branchId: string) => {
  localStorage.setItem('currentBranchId', branchId);
};

// Create axios instance with branch header
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptor to include branch ID in requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    console.warn('[branchesAPI] No token found in localStorage');
  }
  
  const branchId = getCurrentBranchId();
  if (branchId) {
    config.headers['X-Branch-ID'] = branchId;
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Add response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          console.log('[branchesAPI] Attempting to refresh token...');
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refreshToken,
          });

          const { token, refreshToken: newRefreshToken } = response.data;
          localStorage.setItem('token', token);
          localStorage.setItem('refreshToken', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('[branchesAPI] Token refresh failed:', refreshError);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const branchesAPI = {
  // Get all branches accessible to the user
  getBranches: async (): Promise<Branch[]> => {
    console.log('[branchesAPI] Fetching branches from:', `${API_BASE_URL}/api/branches`);
    const token = localStorage.getItem('token');
    console.log('[branchesAPI] Token exists:', !!token);
    
    if (!token) {
      console.error('[branchesAPI] No token found in localStorage');
      throw new Error('No authentication token found');
    }
    
    try {
      const response = await api.get('/api/branches');
      console.log('[branchesAPI] Received branches:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('[branchesAPI] Error fetching branches:', error);
      if (error.response?.status === 401) {
        console.error('[branchesAPI] 401 Unauthorized - token may be invalid or expired');
      }
      throw error;
    }
  },

  // Get a specific branch by ID
  getBranch: async (branchId: string): Promise<Branch> => {
    const response = await api.get(`/api/branches/${branchId}`);
    return response.data;
  },

  // Create a new branch
  createBranch: async (data: {
    name: string;
    address?: string;
    phone?: string;
  }): Promise<Branch> => {
    const response = await api.post('/api/branches', data);
    return response.data;
  },

  // Update a branch
  updateBranch: async (
    branchId: string,
    data: {
      name?: string;
      address?: string;
      phone?: string;
      status?: 'active' | 'inactive';
    }
  ): Promise<Branch> => {
    const response = await api.put(`/api/branches/${branchId}`, data);
    return response.data;
  },

  // Delete a branch
  deleteBranch: async (branchId: string): Promise<void> => {
    await api.delete(`/api/branches/${branchId}`);
  },

  // Switch to a different branch
  switchBranch: async (branchId: string): Promise<{
    token: string;
    refreshToken: string;
    branchId: string;
  }> => {
    const response = await api.post('/api/branches/switch', { branchId });
    return response.data;
  },

  // Get users assigned to a branch
  getBranchUsers: async (branchId: string): Promise<{ userIds: number[] }> => {
    const response = await api.get(`/api/branches/${branchId}/users`);
    return response.data;
  },

  // Assign a user to a branch
  assignUserToBranch: async (
    branchId: string,
    userId: number,
    roleId?: string
  ): Promise<void> => {
    await api.post(`/api/branches/${branchId}/users`, { userId, roleId });
  },

  // Remove a user from a branch
  removeUserFromBranch: async (branchId: string, userId: number): Promise<void> => {
    await api.delete(`/api/branches/${branchId}/users/${userId}`);
  },
};

export default api;


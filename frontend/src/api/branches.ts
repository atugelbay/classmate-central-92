import axios from 'axios';
import { Branch } from '@/types';

// Use same env variable as client.ts for consistency
// VITE_API_URL should be like 'http://localhost:8080/api' or 'https://api.example.com/api'
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
// Extract base URL - remove trailing /api if present
const API_BASE_URL = API_URL.replace(/\/api\/?$/, '') || 'http://localhost:8080';

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
  // Always ensure headers object exists
  if (!config.headers) {
    config.headers = {} as any;
  }
  
  // Always get fresh token from localStorage
  const token = localStorage.getItem('token');
  if (!token) {
    return Promise.reject(new Error('No authentication token found'));
  }
  
  // Set Authorization header
  config.headers.Authorization = `Bearer ${token}`;
  
  // Add branch ID if available
  const branchId = getCurrentBranchId();
  if (branchId) {
    config.headers['X-Branch-ID'] = branchId;
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor - just pass through, let errors bubble up
api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export const branchesAPI = {
  // Get all branches accessible to the user
  getBranches: async (): Promise<Branch[]> => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    try {
      const response = await api.get('/api/branches');
      // Ensure we return an array
      if (Array.isArray(response.data)) {
        return response.data;
      }
      // If response is not an array, return empty array
      return [];
    } catch (error: any) {
      // If error is 401, throw it to trigger re-auth
      if (error.response?.status === 401) {
        throw error;
      }
      // For other errors, return empty array to prevent crashes
      return [];
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


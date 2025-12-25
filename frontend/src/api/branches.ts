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
});

// Add interceptor to include branch ID in requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  const branchId = getCurrentBranchId();
  if (branchId) {
    config.headers['X-Branch-ID'] = branchId;
  }
  
  return config;
});

export const branchesAPI = {
  // Get all branches accessible to the user
  getBranches: async (): Promise<Branch[]> => {
    const response = await axios.get(`${API_BASE_URL}/api/branches`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // Get a specific branch by ID
  getBranch: async (branchId: string): Promise<Branch> => {
    const response = await axios.get(`${API_BASE_URL}/api/branches/${branchId}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // Create a new branch
  createBranch: async (data: {
    name: string;
    address?: string;
    phone?: string;
  }): Promise<Branch> => {
    const response = await axios.post(`${API_BASE_URL}/api/branches`, data, {
      headers: getAuthHeaders(),
    });
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
    const response = await axios.put(`${API_BASE_URL}/api/branches/${branchId}`, data, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // Delete a branch
  deleteBranch: async (branchId: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/api/branches/${branchId}`, {
      headers: getAuthHeaders(),
    });
  },

  // Switch to a different branch
  switchBranch: async (branchId: string): Promise<{
    token: string;
    refreshToken: string;
    branchId: string;
  }> => {
    const response = await axios.post(
      `${API_BASE_URL}/api/branches/switch`,
      { branchId },
      {
        headers: getAuthHeaders(),
      }
    );
    return response.data;
  },

  // Get users assigned to a branch
  getBranchUsers: async (branchId: string): Promise<{ userIds: number[] }> => {
    const response = await axios.get(`${API_BASE_URL}/api/branches/${branchId}/users`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // Assign a user to a branch
  assignUserToBranch: async (
    branchId: string,
    userId: number,
    roleId?: string
  ): Promise<void> => {
    await axios.post(
      `${API_BASE_URL}/api/branches/${branchId}/users`,
      { userId, roleId },
      {
        headers: getAuthHeaders(),
      }
    );
  },

  // Remove a user from a branch
  removeUserFromBranch: async (branchId: string, userId: number): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/api/branches/${branchId}/users/${userId}`, {
      headers: getAuthHeaders(),
    });
  },
};

export default api;


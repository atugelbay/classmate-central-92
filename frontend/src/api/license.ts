import apiClient from './client';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// Get base URL without /api suffix for public endpoints
const getBaseURL = () => {
  const url = API_URL.replace(/\/api\/?$/, ''); // Remove /api or /api/ from end
  return url;
};

// Types for billing/license
export interface Plan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly?: number;
  maxStudents?: number;
  maxUsers?: number;
  maxTeachers?: number;
  maxBranches?: number;
  features: Record<string, boolean | string>;
  isActive: boolean;
  sortOrder: number;
}

export interface CompanyLicense {
  id: number;
  companyId: string;
  planId: string;
  status: 'trial' | 'active' | 'suspended' | 'cancelled' | 'expired';
  trialEndsAt?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  customMaxStudents?: number;
  customMaxUsers?: number;
  customMaxTeachers?: number;
  customMaxBranches?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  planName: string;
  planFeatures: Record<string, boolean | string>;
  maxStudents?: number;
  maxUsers?: number;
  maxTeachers?: number;
  maxBranches?: number;
  priceMonthly: number;
}

export interface CompanyUsage {
  studentsCount: number;
  usersCount: number;
  teachersCount: number;
  branchesCount: number;
}

export interface LicenseWithUsage {
  license: CompanyLicense | null;
  usage: CompanyUsage;
}

export interface SelectPlanResponse {
  message: string;
  license: LicenseWithUsage;
}

export const licenseAPI = {
  // Get all available plans (public endpoint, no auth required)
  getPlans: async (): Promise<Plan[]> => {
    // Use plain axios without auth interceptor for public endpoint
    const baseURL = getBaseURL();
    const response = await axios.get(`${baseURL}/api/plans`);
    // Ensure we return an array
    return Array.isArray(response.data) ? response.data : [];
  },

  // Get current company license (requires auth)
  getCurrentLicense: async (): Promise<LicenseWithUsage> => {
    const response = await apiClient.get('/company/license');
    return response.data;
  },

  // Select or change plan (requires auth)
  selectPlan: async (planId: string): Promise<SelectPlanResponse> => {
    const response = await apiClient.post('/company/license', { planId });
    return response.data;
  },
};

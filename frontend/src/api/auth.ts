import apiClient from './client';
import { User } from '@/types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  companyName: string;
}

export interface InviteUserRequest {
  name: string;
  email: string;
  roleId: string;
}

export interface AcceptInviteRequest {
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export const authAPI = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  me: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  verifyEmail: async (email: string, code: string) => {
    const response = await apiClient.post('/auth/verify-email', { email, code });
    return response.data;
  },

  resendVerification: async (email: string) => {
    const response = await apiClient.post('/auth/resend-verification', { email });
    return response.data;
  },

  invite: async (data: InviteUserRequest) => {
    const response = await apiClient.post('/auth/invite', data);
    return response.data;
  },

  acceptInvite: async (data: AcceptInviteRequest): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/accept-invite', data);
    return response.data;
  },

  getUsers: async (): Promise<User[]> => {
    const response = await apiClient.get('/auth/users');
    return response.data;
  },
};

export default authAPI;


import apiClient from './client';
import { Role, Permission, CreateRoleRequest, UpdateRoleRequest, AssignRoleRequest } from '@/types';

export const rolesAPI = {
  // Permissions
  getAllPermissions: async (): Promise<Permission[]> => {
    const response = await apiClient.get('/permissions');
    return response.data;
  },

  // Roles
  getAll: async (): Promise<Role[]> => {
    const response = await apiClient.get('/roles');
    return response.data;
  },

  getById: async (id: string): Promise<Role> => {
    const response = await apiClient.get(`/roles/${id}`);
    return response.data;
  },

  create: async (data: CreateRoleRequest): Promise<Role> => {
    const response = await apiClient.post('/roles', data);
    return response.data;
  },

  update: async (id: string, data: UpdateRoleRequest): Promise<Role> => {
    const response = await apiClient.put(`/roles/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/roles/${id}`);
  },

  getRolePermissions: async (roleId: string): Promise<Permission[]> => {
    const response = await apiClient.get(`/roles/${roleId}/permissions`);
    return response.data;
  },

  // User Roles
  getUserRoles: async (userId: number): Promise<Role[]> => {
    const response = await apiClient.get(`/users/${userId}/roles`);
    return response.data;
  },

  assignRole: async (data: AssignRoleRequest): Promise<void> => {
    await apiClient.post('/users/roles/assign', data);
  },

  removeRole: async (data: AssignRoleRequest): Promise<void> => {
    await apiClient.post('/users/roles/remove', data);
  },
};


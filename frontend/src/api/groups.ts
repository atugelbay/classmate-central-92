import apiClient from './client';
import { Group } from '@/types';

export const groupsAPI = {
  getAll: async (): Promise<Group[]> => {
    const response = await apiClient.get('/groups');
    return response.data;
  },

  getById: async (id: string): Promise<Group> => {
    const response = await apiClient.get(`/groups/${id}`);
    return response.data;
  },

  create: async (group: Omit<Group, 'id'>): Promise<Group> => {
    const groupWithId = {
      ...group,
      id: Date.now().toString(),
    };
    const response = await apiClient.post('/groups', groupWithId);
    return response.data;
  },

  update: async (id: string, group: Partial<Group>): Promise<Group> => {
    const response = await apiClient.put(`/groups/${id}`, group);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/groups/${id}`);
  },
};


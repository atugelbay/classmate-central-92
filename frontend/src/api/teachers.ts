import apiClient from './client';
import { Teacher } from '@/types';

export const teachersAPI = {
  getAll: async (): Promise<Teacher[]> => {
    const response = await apiClient.get('/teachers');
    return response.data;
  },

  getById: async (id: string): Promise<Teacher> => {
    const response = await apiClient.get(`/teachers/${id}`);
    return response.data;
  },

  create: async (teacher: Omit<Teacher, 'id'>): Promise<Teacher> => {
    const teacherWithId = {
      ...teacher,
      id: Date.now().toString(),
    };
    const response = await apiClient.post('/teachers', teacherWithId);
    return response.data;
  },

  update: async (id: string, teacher: Partial<Teacher>): Promise<Teacher> => {
    const response = await apiClient.put(`/teachers/${id}`, teacher);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/teachers/${id}`);
  },
};


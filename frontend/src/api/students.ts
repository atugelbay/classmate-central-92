import apiClient from './client';
import { Student } from '@/types';

export const studentsAPI = {
  getAll: async (): Promise<Student[]> => {
    const response = await apiClient.get('/students');
    return response.data;
  },

  getById: async (id: string): Promise<Student> => {
    const response = await apiClient.get(`/students/${id}`);
    return response.data;
  },

  create: async (student: Omit<Student, 'id'>): Promise<Student> => {
    const studentWithId = {
      ...student,
      id: Date.now().toString(),
    };
    const response = await apiClient.post('/students', studentWithId);
    return response.data;
  },

  update: async (id: string, student: Partial<Student>): Promise<Student> => {
    const response = await apiClient.put(`/students/${id}`, student);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/students/${id}`);
  },
};


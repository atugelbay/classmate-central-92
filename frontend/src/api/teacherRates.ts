import apiClient from './client';
import { TeacherRate } from '@/types';

export const teacherRatesAPI = {
  getByTeacher: async (teacherId: string): Promise<TeacherRate[]> => {
    const response = await apiClient.get(`/teachers/${teacherId}/rates`);
    return response.data;
  },

  create: async (teacherId: string, rate: Omit<TeacherRate, 'id' | 'createdAt' | 'teacherId' | 'companyId'>): Promise<TeacherRate> => {
    const response = await apiClient.post(`/teachers/${teacherId}/rates`, rate);
    return response.data;
  },

  update: async (teacherId: string, rateId: string, rate: Partial<Omit<TeacherRate, 'id' | 'createdAt' | 'teacherId' | 'companyId'>>): Promise<TeacherRate> => {
    const response = await apiClient.put(`/teachers/${teacherId}/rates/${rateId}`, rate);
    return response.data;
  },

  delete: async (teacherId: string, rateId: string): Promise<void> => {
    await apiClient.delete(`/teachers/${teacherId}/rates/${rateId}`);
  },

  calculateSalary: async (teacherId: string, startDate: string, endDate: string): Promise<{
    period: { start: string; end: string };
    breakdown: Array<{
      lessonType: string;
      hours: number;
      lessons: number;
      rate: { type: string; value: number };
      salary: number;
    }>;
    total: number;
    message?: string;
  }> => {
    const response = await apiClient.post(`/teachers/${teacherId}/salary/calculate`, {
      startDate,
      endDate,
    });
    return response.data;
  },
};

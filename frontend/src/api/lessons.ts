import apiClient from './client';
import { Lesson } from '@/types';

export const lessonsAPI = {
  getAll: async (): Promise<Lesson[]> => {
    const response = await apiClient.get('/lessons');
    // Convert date strings to Date objects
    return response.data.map((lesson: any) => ({
      ...lesson,
      start: new Date(lesson.start),
      end: new Date(lesson.end),
    }));
  },

  getById: async (id: string): Promise<Lesson> => {
    const response = await apiClient.get(`/lessons/${id}`);
    return {
      ...response.data,
      start: new Date(response.data.start),
      end: new Date(response.data.end),
    };
  },

  create: async (lesson: Omit<Lesson, 'id'>): Promise<Lesson> => {
    const lessonWithId = {
      ...lesson,
      id: Date.now().toString(),
    };
    const response = await apiClient.post('/lessons', lessonWithId);
    return {
      ...response.data,
      start: new Date(response.data.start),
      end: new Date(response.data.end),
    };
  },

  update: async (id: string, lesson: Partial<Lesson>): Promise<Lesson> => {
    const response = await apiClient.put(`/lessons/${id}`, lesson);
    return {
      ...response.data,
      start: new Date(response.data.start),
      end: new Date(response.data.end),
    };
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/lessons/${id}`);
  },
};


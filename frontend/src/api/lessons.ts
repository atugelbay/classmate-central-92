import apiClient from './client';
import { Lesson, CheckConflictsRequest, CheckConflictsResponse, BulkCreateLessonRequest, BulkCreateLessonResponse } from '@/types';

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

  getIndividual: async (): Promise<Lesson[]> => {
    const response = await apiClient.get('/lessons/individual');
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

  getByTeacher: async (teacherId: string, startDate?: string, endDate?: string): Promise<Lesson[]> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await apiClient.get(`/lessons/teacher/${teacherId}?${params.toString()}`);
    return response.data.map((lesson: any) => ({
      ...lesson,
      start: new Date(lesson.start),
      end: new Date(lesson.end),
    }));
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

  checkConflicts: async (data: CheckConflictsRequest): Promise<CheckConflictsResponse> => {
    const response = await apiClient.post('/lessons/check-conflicts', data);
    // Convert date strings to Date objects in conflicts
    return {
      ...response.data,
      conflicts: response.data.conflicts.map((conflict: any) => ({
        ...conflict,
        start: new Date(conflict.start),
        end: new Date(conflict.end),
      })),
    };
  },

  createBulk: async (data: BulkCreateLessonRequest): Promise<BulkCreateLessonResponse> => {
    const response = await apiClient.post('/lessons/bulk', data);
    return response.data;
  },
};


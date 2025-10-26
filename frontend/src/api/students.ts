import apiClient from './client';
import { 
  Student, 
  StudentActivityLog, 
  StudentNote, 
  Notification, 
  AttendanceJournalEntry,
  StudentStatus 
} from '@/types';

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

  // Activities
  getActivities: async (id: string, limit = 50, offset = 0): Promise<StudentActivityLog[]> => {
    const response = await apiClient.get(`/students/${id}/activities`, {
      params: { limit, offset },
    });
    return response.data;
  },

  // Notes
  addNote: async (id: string, note: string): Promise<StudentNote> => {
    const response = await apiClient.post(`/students/${id}/notes`, { note });
    return response.data;
  },

  getNotes: async (id: string): Promise<StudentNote[]> => {
    const response = await apiClient.get(`/students/${id}/notes`);
    return response.data;
  },

  // Status
  updateStatus: async (id: string, status: StudentStatus): Promise<void> => {
    await apiClient.put(`/students/${id}/status`, { status });
  },

  // Attendance
  getAttendanceJournal: async (id: string): Promise<AttendanceJournalEntry[]> => {
    const response = await apiClient.get(`/students/${id}/attendance`);
    return response.data;
  },

  // Notifications
  getNotifications: async (id: string): Promise<Notification[]> => {
    const response = await apiClient.get(`/students/${id}/notifications`);
    return response.data;
  },

  markNotificationRead: async (notificationId: number): Promise<void> => {
    await apiClient.put(`/notifications/${notificationId}/read`);
  },
};


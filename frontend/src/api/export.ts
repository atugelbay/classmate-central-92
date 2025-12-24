import apiClient from './client';

export interface ScheduleExportFilters {
  startDate?: string;
  endDate?: string;
  teacherId?: string;
  groupId?: string;
  roomId?: string;
  status?: string; // 'scheduled' | 'cancelled' | 'completed'
  studentId?: string;
}

export interface StudentsExportFilters {
  status?: string; // 'active' | 'inactive' | 'frozen' | 'graduated'
  groupId?: string;
  teacherId?: string;
  hasBalance?: boolean;
  query?: string;
}

export interface TransactionsExportFilters {
  startDate?: string;
  endDate?: string;
  type?: string; // 'payment' | 'writeoff'
  studentId?: string;
  teacherId?: string;
  groupId?: string;
}

export const exportAPI = {
  exportTransactionsPDF: async (filters?: TransactionsExportFilters): Promise<Blob> => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.studentId) params.append('studentId', filters.studentId);
    if (filters?.teacherId) params.append('teacherId', filters.teacherId);
    if (filters?.groupId) params.append('groupId', filters.groupId);
    const queryString = params.toString();
    const response = await apiClient.get(`/export/transactions/pdf${queryString ? `?${queryString}` : ''}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  exportTransactionsExcel: async (filters?: TransactionsExportFilters): Promise<Blob> => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.studentId) params.append('studentId', filters.studentId);
    if (filters?.teacherId) params.append('teacherId', filters.teacherId);
    if (filters?.groupId) params.append('groupId', filters.groupId);
    const queryString = params.toString();
    const response = await apiClient.get(`/export/transactions/excel${queryString ? `?${queryString}` : ''}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  exportStudentsPDF: async (filters?: StudentsExportFilters): Promise<Blob> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.groupId) params.append('groupId', filters.groupId);
    if (filters?.teacherId) params.append('teacherId', filters.teacherId);
    if (filters?.hasBalance !== undefined) params.append('hasBalance', filters.hasBalance.toString());
    if (filters?.query) params.append('query', filters.query);
    const queryString = params.toString();
    const response = await apiClient.get(`/export/students/pdf${queryString ? `?${queryString}` : ''}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  exportStudentsExcel: async (filters?: StudentsExportFilters): Promise<Blob> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.groupId) params.append('groupId', filters.groupId);
    if (filters?.teacherId) params.append('teacherId', filters.teacherId);
    if (filters?.hasBalance !== undefined) params.append('hasBalance', filters.hasBalance.toString());
    if (filters?.query) params.append('query', filters.query);
    const queryString = params.toString();
    const response = await apiClient.get(`/export/students/excel${queryString ? `?${queryString}` : ''}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  exportSchedulePDF: async (filters?: ScheduleExportFilters): Promise<Blob> => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.teacherId) params.append('teacherId', filters.teacherId);
    if (filters?.groupId) params.append('groupId', filters.groupId);
    if (filters?.roomId) params.append('roomId', filters.roomId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.studentId) params.append('studentId', filters.studentId);
    const queryString = params.toString();
    const response = await apiClient.get(`/export/schedule/pdf${queryString ? `?${queryString}` : ''}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  exportScheduleExcel: async (filters?: ScheduleExportFilters): Promise<Blob> => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.teacherId) params.append('teacherId', filters.teacherId);
    if (filters?.groupId) params.append('groupId', filters.groupId);
    if (filters?.roomId) params.append('roomId', filters.roomId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.studentId) params.append('studentId', filters.studentId);
    const queryString = params.toString();
    const response = await apiClient.get(`/export/schedule/excel${queryString ? `?${queryString}` : ''}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

// Helper function to download blob
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};


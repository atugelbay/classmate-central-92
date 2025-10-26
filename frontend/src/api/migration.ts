import apiClient from './client';

export interface MigrationRequest {
  alfacrmUrl: string;
  email: string;
  apiKey: string;
  migrateRooms?: boolean;
  migrateLessons?: boolean;
}

export interface MigrationStatus {
  status: 'running' | 'completed' | 'failed';
  currentStep: string;
  progress: number;
  teachersCount: number;
  studentsCount: number;
  groupsCount: number;
  roomsCount: number;
  lessonsCount: number;
  error?: string;
  logs?: string;
  startedAt: string;
  completedAt?: string;
}

export const migrationAPI = {
  // Test connection to AlfaCRM
  testConnection: async (data: {
    alfacrmUrl: string;
    email: string;
    apiKey: string;
  }): Promise<{ success: boolean; message?: string; error?: string }> => {
    const response = await apiClient.post('/migration/test-connection', data);
    return response.data;
  },

  // Start migration process
  startMigration: async (data: MigrationRequest): Promise<{
    message: string;
    status: MigrationStatus;
  }> => {
    const response = await apiClient.post('/migration/start', data);
    return response.data;
  },

  // Get current migration status
  getStatus: async (): Promise<MigrationStatus> => {
    const response = await apiClient.get('/migration/status');
    return response.data;
  },

  // Clear all company data
  clearData: async (): Promise<{ message: string }> => {
    const response = await apiClient.post('/migration/clear-data');
    return response.data;
  },
};


import apiClient from './client';
import { Settings } from '@/types';

export const settingsAPI = {
  get: async (): Promise<Settings> => {
    const response = await apiClient.get('/settings');
    return response.data;
  },

  update: async (settings: Partial<Settings>): Promise<Settings> => {
    const response = await apiClient.put('/settings', settings);
    return response.data;
  },
};


import apiClient from "./client";
import {
  Lead,
  LeadActivity,
  LeadTask,
  LeadConversionStats,
} from "@/types";

export const leadsApi = {
  getAll: async (filters?: { status?: string; source?: string }): Promise<Lead[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.source) params.append("source", filters.source);
    
    const response = await apiClient.get(`/leads?${params.toString()}`);
    return response.data.map((lead: any) => ({
      ...lead,
      createdAt: new Date(lead.createdAt),
      updatedAt: new Date(lead.updatedAt),
    }));
  },

  getById: async (id: string): Promise<Lead> => {
    const response = await apiClient.get(`/leads/${id}`);
    return {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
    };
  },

  create: async (lead: Omit<Lead, "id" | "createdAt" | "updatedAt">): Promise<Lead> => {
    const response = await apiClient.post("/leads", lead);
    return {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
    };
  },

  update: async (id: string, lead: Partial<Lead>): Promise<Lead> => {
    const response = await apiClient.put(`/leads/${id}`, lead);
    return {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
    };
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/leads/${id}`);
  },

  getStats: async (): Promise<LeadConversionStats> => {
    const response = await apiClient.get("/leads/stats");
    return response.data;
  },

  // Activities
  getActivities: async (leadId: string): Promise<LeadActivity[]> => {
    const response = await apiClient.get(`/leads/${leadId}/activities`);
    return response.data.map((activity: any) => ({
      ...activity,
      createdAt: new Date(activity.createdAt),
    }));
  },

  addActivity: async (
    leadId: string,
    activity: Omit<LeadActivity, "id" | "leadId" | "createdAt" | "createdBy">
  ): Promise<LeadActivity> => {
    const response = await apiClient.post(`/leads/${leadId}/activities`, activity);
    return {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
    };
  },

  // Tasks
  getTasks: async (leadId: string): Promise<LeadTask[]> => {
    const response = await apiClient.get(`/leads/${leadId}/tasks`);
    return response.data.map((task: any) => ({
      ...task,
      createdAt: new Date(task.createdAt),
      dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
    }));
  },

  createTask: async (
    leadId: string,
    task: Omit<LeadTask, "id" | "leadId" | "createdAt" | "completedAt">
  ): Promise<LeadTask> => {
    const response = await apiClient.post(`/leads/${leadId}/tasks`, task);
    return {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      dueDate: response.data.dueDate ? new Date(response.data.dueDate) : undefined,
      completedAt: response.data.completedAt ? new Date(response.data.completedAt) : undefined,
    };
  },

  updateTask: async (
    leadId: string,
    taskId: number,
    task: Partial<LeadTask>
  ): Promise<LeadTask> => {
    const response = await apiClient.put(`/leads/${leadId}/tasks/${taskId}`, task);
    return {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      dueDate: response.data.dueDate ? new Date(response.data.dueDate) : undefined,
      completedAt: response.data.completedAt ? new Date(response.data.completedAt) : undefined,
    };
  },
};


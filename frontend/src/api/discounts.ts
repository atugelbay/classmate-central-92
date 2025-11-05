import apiClient from "./client";
import { Discount, StudentDiscount } from "@/types";

export const discountsAPI = {
  getAll: async (): Promise<Discount[]> => {
    const response = await apiClient.get("/discounts");
    return response.data;
  },

  getById: async (id: string): Promise<Discount> => {
    const response = await apiClient.get(`/discounts/${id}`);
    return response.data;
  },

  create: async (data: Omit<Discount, "id" | "createdAt">): Promise<Discount> => {
    const response = await apiClient.post("/discounts", data);
    return response.data;
  },

  update: async (id: string, data: Partial<Discount>): Promise<Discount> => {
    const response = await apiClient.put(`/discounts/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/discounts/${id}`);
  },

  getStudentDiscounts: async (studentId: string): Promise<StudentDiscount[]> => {
    const response = await apiClient.get(`/students/${studentId}/discounts`);
    return response.data;
  },

  applyToStudent: async (
    studentId: string,
    data: { discountId: string; expiresAt?: string }
  ): Promise<StudentDiscount> => {
    const response = await apiClient.post(`/students/${studentId}/discounts`, data);
    return response.data;
  },

  removeStudentDiscount: async (studentId: string, discountId: string): Promise<void> => {
    await apiClient.delete(`/students/${studentId}/discounts/${discountId}`);
  },
};

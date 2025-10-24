import apiClient from "./client";
import { Room } from "@/types";

export const roomsApi = {
  getAll: async (): Promise<Room[]> => {
    const response = await apiClient.get("/rooms");
    return response.data;
  },

  getById: async (id: string): Promise<Room> => {
    const response = await apiClient.get(`/rooms/${id}`);
    return response.data;
  },

  create: async (room: Omit<Room, "id">): Promise<Room> => {
    const response = await apiClient.post("/rooms", room);
    return response.data;
  },

  update: async (id: string, room: Partial<Room>): Promise<Room> => {
    const response = await apiClient.put(`/rooms/${id}`, room);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/rooms/${id}`);
  },
};


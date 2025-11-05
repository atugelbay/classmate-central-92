import apiClient from "./client";
import {
  SubscriptionType,
  StudentSubscription,
  SubscriptionFreeze,
  LessonAttendance,
  MarkAttendanceRequest,
} from "@/types";

// ============= Subscription Types =============

export const getSubscriptionTypes = async (): Promise<SubscriptionType[]> => {
  const response = await apiClient.get("/subscriptions/types");
  return response.data;
};

export const getSubscriptionTypeById = async (
  id: string
): Promise<SubscriptionType> => {
  const response = await apiClient.get(`/subscriptions/types/${id}`);
  return response.data;
};

export const createSubscriptionType = async (
  data: Omit<SubscriptionType, "id" | "createdAt">
): Promise<SubscriptionType> => {
  const response = await apiClient.post("/subscriptions/types", data);
  return response.data;
};

export const updateSubscriptionType = async (
  id: string,
  data: Partial<SubscriptionType>
): Promise<SubscriptionType> => {
  const response = await apiClient.put(`/subscriptions/types/${id}`, data);
  return response.data;
};

export const deleteSubscriptionType = async (id: string): Promise<void> => {
  await apiClient.delete(`/subscriptions/types/${id}`);
};

// ============= Student Subscriptions =============

export const getAllSubscriptions = async (): Promise<StudentSubscription[]> => {
  const response = await apiClient.get("/subscriptions");
  return response.data;
};

export const getStudentSubscriptions = async (
  studentId: string
): Promise<StudentSubscription[]> => {
  const response = await apiClient.get(
    `/subscriptions/student/${studentId}`
  );
  return response.data;
};

export const getSubscriptionById = async (
  id: string
): Promise<StudentSubscription> => {
  const response = await apiClient.get(`/subscriptions/${id}`);
  return response.data;
};

export const createStudentSubscription = async (
  data: Omit<StudentSubscription, "id" | "createdAt">
): Promise<StudentSubscription> => {
  const response = await apiClient.post("/subscriptions", data);
  return response.data;
};

export const updateSubscription = async (
  id: string,
  data: Partial<StudentSubscription>
): Promise<StudentSubscription> => {
  const response = await apiClient.put(`/subscriptions/${id}`, data);
  return response.data;
};

export const deleteSubscription = async (id: string): Promise<void> => {
  await apiClient.delete(`/subscriptions/${id}`);
};

// ============= Subscription Freezes =============

export const getSubscriptionFreezes = async (
  subscriptionId: string
): Promise<SubscriptionFreeze[]> => {
  const response = await apiClient.get(
    `/subscriptions/${subscriptionId}/freezes`
  );
  const items = Array.isArray(response.data) ? response.data : [];
  // Normalize snake_case from backend to camelCase expected by frontend types
  return items.map((f: any) => ({
    id: f.id,
    subscriptionId: f.subscription_id ?? f.subscriptionId,
    freezeStart: f.freeze_start ?? f.freezeStart,
    freezeEnd: f.freeze_end ?? f.freezeEnd,
    reason: f.reason ?? "",
    createdAt: f.created_at ?? f.createdAt,
  }));
};

export const freezeSubscription = async (
  subscriptionId: string,
  data: { freezeStart: string; freezeEnd: string; reason?: string }
): Promise<StudentSubscription> => {
  const response = await apiClient.post(
    `/subscriptions/${subscriptionId}/freeze`,
    data
  );
  return response.data;
};

export const createFreeze = async (
  subscriptionId: string,
  data: Omit<SubscriptionFreeze, "id" | "subscriptionId" | "createdAt">
): Promise<SubscriptionFreeze> => {
  const response = await apiClient.post(
    `/subscriptions/${subscriptionId}/freezes`,
    data
  );
  return response.data;
};

export const updateFreeze = async (
  data: SubscriptionFreeze
): Promise<SubscriptionFreeze> => {
  const response = await apiClient.put("/subscriptions/freezes", data);
  return response.data;
};

// ============= Lesson Attendance =============

export const markAttendance = async (
  data: MarkAttendanceRequest
): Promise<LessonAttendance> => {
  const response = await apiClient.post("/attendance", data);
  return response.data;
};

export const getAttendanceByLesson = async (
  lessonId: string
): Promise<LessonAttendance[]> => {
  const response = await apiClient.get(`/attendance/lesson/${lessonId}`);
  return response.data;
};

export const getAttendanceByStudent = async (
  studentId: string
): Promise<LessonAttendance[]> => {
  const response = await apiClient.get(`/attendance/student/${studentId}`);
  return response.data;
};


import apiClient from "./client";
import {
  PaymentTransaction,
  StudentBalance,
  Tariff,
  DebtRecord,
} from "@/types";

// ============= Payment Transactions =============

export const createTransaction = async (
  data: Omit<PaymentTransaction, "id" | "createdAt">
): Promise<PaymentTransaction> => {
  const response = await apiClient.post("/payments/transactions", data);
  return response.data;
};

export const getAllTransactions = async (): Promise<PaymentTransaction[]> => {
  const response = await apiClient.get("/payments/transactions");
  return response.data;
};

export const getTransactionsByStudent = async (
  studentId: string
): Promise<PaymentTransaction[]> => {
  const response = await apiClient.get(
    `/payments/transactions/student/${studentId}`
  );
  return response.data;
};

export const updateTransaction = async (
  id: number,
  data: Partial<PaymentTransaction>
): Promise<PaymentTransaction> => {
  const response = await apiClient.put(`/payments/transactions/${id}`, data);
  return response.data;
};

// ============= Student Balances =============

export const getStudentBalance = async (
  studentId: string
): Promise<StudentBalance> => {
  const response = await apiClient.get(`/payments/balance/${studentId}`);
  return response.data;
};

export const getAllBalances = async (): Promise<StudentBalance[]> => {
  const response = await apiClient.get("/payments/balances");
  return response.data;
};

// ============= Tariffs =============

export const getTariffs = async (): Promise<Tariff[]> => {
  const response = await apiClient.get("/tariffs");
  return response.data;
};

export const getTariffById = async (id: string): Promise<Tariff> => {
  const response = await apiClient.get(`/tariffs/${id}`);
  return response.data;
};

export const createTariff = async (
  data: Omit<Tariff, "id" | "createdAt">
): Promise<Tariff> => {
  const response = await apiClient.post("/tariffs", data);
  return response.data;
};

export const updateTariff = async (
  id: string,
  data: Partial<Tariff>
): Promise<Tariff> => {
  const response = await apiClient.put(`/tariffs/${id}`, data);
  return response.data;
};

export const deleteTariff = async (id: string): Promise<void> => {
  await apiClient.delete(`/tariffs/${id}`);
};

// ============= Debts =============

export const getDebts = async (status?: string): Promise<DebtRecord[]> => {
  const response = await apiClient.get("/debts", {
    params: status ? { status } : undefined,
  });
  return response.data;
};

export const getDebtsByStudent = async (
  studentId: string
): Promise<DebtRecord[]> => {
  const response = await apiClient.get(`/debts/student/${studentId}`);
  return response.data;
};

export const createDebt = async (
  data: Omit<DebtRecord, "id" | "createdAt">
): Promise<DebtRecord> => {
  const response = await apiClient.post("/debts", data);
  return response.data;
};

export const updateDebt = async (
  id: number,
  data: Partial<DebtRecord>
): Promise<DebtRecord> => {
  const response = await apiClient.put(`/debts/${id}`, data);
  return response.data;
};

export const deleteDebt = async (id: number): Promise<void> => {
  await apiClient.delete(`/debts/${id}`);
};


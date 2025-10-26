import apiClient from "./client";

export interface RevenuePoint {
  date: string;
  amount: number;
}

export interface AttendancePoint {
  date: string;
  attended: number;
  missed: number;
}

export interface DashboardStats {
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    data: RevenuePoint[];
  };
  attendance: {
    rate: number;
    todayPresent: number;
    todayAbsent: number;
    weeklyData: AttendancePoint[];
  };
  students: {
    active: number;
    new: number;
    frozen: number;
  };
  lessons: {
    today: number;
    thisWeek: number;
    completed: number;
    scheduled: number;
    cancelled: number;
  };
  financial: {
    totalBalance: number;
    pendingDebts: number;
    totalDebtAmount: number;
  };
  leads: {
    new: number;
    inProgress: number;
    conversion: number;
  };
}

// Get comprehensive dashboard statistics
export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await apiClient.get("/dashboard/stats");
  return response.data;
};

// Get today's lessons only
export const getTodayLessons = async (): Promise<any[]> => {
  const response = await apiClient.get("/dashboard/today-lessons");
  return response.data;
};

// Get revenue chart data
export const getRevenueChart = async (period: "week" | "month" | "year" = "week"): Promise<RevenuePoint[]> => {
  const response = await apiClient.get("/dashboard/revenue-chart", {
    params: { period },
  });
  return response.data;
};

// Get attendance statistics
export const getAttendanceStats = async (period: "week" | "month" = "week"): Promise<AttendancePoint[]> => {
  const response = await apiClient.get("/dashboard/attendance-stats", {
    params: { period },
  });
  return response.data;
};


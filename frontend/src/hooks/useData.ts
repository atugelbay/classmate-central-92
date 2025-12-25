import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { teachersAPI } from "@/api/teachers";
import { studentsAPI } from "@/api/students";
import { groupsAPI } from "@/api/groups";
import { lessonsAPI } from "@/api/lessons";
import { settingsAPI } from "@/api/settings";
import { roomsApi } from "@/api/rooms";
import { leadsApi } from "@/api/leads";
import * as financeApi from "@/api/finance";
import * as subscriptionsApi from "@/api/subscriptions";
import * as dashboardApi from "@/api/dashboard";
import * as discountsApi from "@/api/discounts";
import { rolesAPI } from "@/api/roles";
import { 
  Teacher, 
  Student, 
  Group, 
  Lesson, 
  Settings, 
  Room, 
  Lead,
  LeadActivity,
  LeadTask,
  PaymentTransaction,
  StudentBalance,
  Tariff,
  Discount,
  DebtRecord,
  SubscriptionType,
  StudentSubscription,
  SubscriptionFreeze,
  LessonAttendance,
  StudentActivityLog,
  StudentNote,
  Notification,
  AttendanceJournalEntry,
  StudentStatus,
  Role,
  Permission,
  CreateRoleRequest,
  UpdateRoleRequest,
  AssignRoleRequest,
  InviteUserRequest,
  AcceptInviteRequest,
} from "@/types";
import { toast } from "sonner";
import { authAPI } from "@/api/auth";

// Teachers hooks
export const useTeachers = () => {
  return useQuery({
    queryKey: ["teachers"],
    queryFn: teachersAPI.getAll,
  });
};

export const useCreateTeacher = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: teachersAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      toast.success("Учитель успешно добавлен");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при добавлении учителя");
    },
  });
};

export const useUpdateTeacher = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Teacher> }) =>
      teachersAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      toast.success("Учитель успешно обновлен");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при обновлении учителя");
    },
  });
};

export const useDeleteTeacher = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: teachersAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      toast.success("Учитель успешно удален");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при удалении учителя");
    },
  });
};

// Students hooks
export const useStudents = () => {
  return useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const res = await studentsAPI.getAll();
      return Array.isArray(res) ? res : ((res as any)?.items ?? []);
    },
  });
};

export const useStudentsPaged = (query: string, page: number, pageSize: number) => {
  return useQuery({
    queryKey: ["students", "paged", query, page, pageSize],
    queryFn: () => studentsAPI.getPaged(query, page, pageSize),
    keepPreviousData: true,
  });
};

export const useCreateStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: studentsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Ученик успешно добавлен");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при добавлении ученика");
    },
  });
};

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Student> }) =>
      studentsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Ученик успешно обновлен");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при обновлении ученика");
    },
  });
};

export const useDeleteStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: studentsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Ученик успешно удален");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при удалении ученика");
    },
  });
};

// Groups hooks
export const useGroups = () => {
  return useQuery({
    queryKey: ["groups"],
    queryFn: groupsAPI.getAll,
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: groupsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast.success("Группа успешно создана");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при создании группы");
    },
  });
};

export const useUpdateGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Group> }) =>
      groupsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast.success("Группа успешно обновлена");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при обновлении группы");
    },
  });
};

export const useDeleteGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: groupsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast.success("Группа успешно удалена");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при удалении группы");
    },
  });
};

export const useGenerateGroupLessons = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: groupsAPI.generateLessons,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      toast.success(`Создано уроков: ${data.count}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при создании уроков");
    },
  });
};

export const useExtendGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: groupsAPI.extend,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success(`Группа продлена. Создано ${data.count} новых уроков`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при продлении группы");
    },
  });
};

// Lessons hooks
export const useLessons = () => {
  return useQuery({
    queryKey: ["lessons"],
    queryFn: lessonsAPI.getAll,
  });
};

export const useIndividualLessons = () => {
  return useQuery({
    queryKey: ["individual-lessons"],
    queryFn: lessonsAPI.getIndividual,
  });
};

export const useCreateLesson = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: lessonsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      queryClient.invalidateQueries({ queryKey: ["individual-lessons"] });
      toast.success("Урок успешно создан");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при создании урока");
    },
  });
};

export const useUpdateLesson = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Lesson> }) =>
      lessonsAPI.update(id, data),
    // Optimistic update: update UI immediately before server responds
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["lessons"] });

      // Snapshot the previous value
      const previousLessons = queryClient.getQueryData<Lesson[]>(["lessons"]);

      // Optimistically update to the new value
      if (previousLessons) {
        queryClient.setQueryData<Lesson[]>(
          ["lessons"],
          previousLessons.map((lesson) =>
            lesson.id === id ? { ...lesson, ...data } : lesson
          )
        );
      }

      // Return context with the previous value (for rollback on error)
      return { previousLessons };
    },
    onError: (error: any, variables, context) => {
      // If mutation fails, roll back to previous value
      if (context?.previousLessons) {
        queryClient.setQueryData(["lessons"], context.previousLessons);
      }
      toast.error(error.response?.data?.error || "Ошибка при обновлении урока");
    },
    onSuccess: () => {
      toast.success("Урок успешно обновлен");
    },
    // Always refetch after error or success to ensure data is in sync with server
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      queryClient.invalidateQueries({ queryKey: ["individual-lessons"] });
    },
  });
};

export const useDeleteLesson = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: lessonsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      queryClient.invalidateQueries({ queryKey: ["individual-lessons"] });
      toast.success("Урок успешно удален");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при удалении урока");
    },
  });
};

export const useCheckConflicts = () => {
  return useMutation({
    mutationFn: lessonsAPI.checkConflicts,
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при проверке конфликтов");
    },
  });
};

export const useTeacherLessons = (teacherId: string, startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ["lessons", "teacher", teacherId, startDate, endDate],
    queryFn: () => lessonsAPI.getByTeacher(teacherId, startDate, endDate),
    enabled: !!teacherId,
  });
};

export const useCreateBulkLessons = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: lessonsAPI.createBulk,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      queryClient.invalidateQueries({ queryKey: ["individual-lessons"] });
      if (data.created > 0) {
        toast.success(`Создано уроков: ${data.created}${data.skipped > 0 ? `, пропущено: ${data.skipped}` : ""}`);
      } else {
        toast.warning(`Все уроки были пропущены из-за конфликтов`);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при создании уроков");
    },
  });
};

// Settings hooks
export const useSettings = () => {
  return useQuery({
    queryKey: ["settings"],
    queryFn: settingsAPI.get,
  });
};

export const useUpdateSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingsAPI.update,
    onMutate: async (newSettings) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["settings"] });
      
      // Snapshot the previous value
      const previousSettings = queryClient.getQueryData(["settings"]);
      
      // Optimistically update to the new value
      queryClient.setQueryData(["settings"], (old: any) => ({
        ...old,
        ...newSettings,
      }));
      
      // Return context with the snapshotted value
      return { previousSettings };
    },
    onSuccess: (data) => {
      // Update cache with the actual data from server
      queryClient.setQueryData(["settings"], data);
      toast.success("Настройки успешно обновлены");
    },
    onError: (error: any, newSettings, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousSettings) {
        queryClient.setQueryData(["settings"], context.previousSettings);
      }
      toast.error(error.response?.data?.error || "Ошибка при обновлении настроек");
    },
  });
};

// Rooms hooks
export const useRooms = () => {
  return useQuery({
    queryKey: ["rooms"],
    queryFn: roomsApi.getAll,
  });
};

export const useCreateRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: roomsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast.success("Аудитория успешно создана");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при создании аудитории");
    },
  });
};

export const useUpdateRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Room> }) =>
      roomsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast.success("Аудитория успешно обновлена");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при обновлении аудитории");
    },
  });
};

export const useDeleteRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: roomsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast.success("Аудитория успешно удалена");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при удалении аудитории");
    },
  });
};

// Leads hooks
export const useLeads = (filters?: { status?: string; source?: string }) => {
  return useQuery({
    queryKey: ["leads", filters],
    queryFn: () => leadsApi.getAll(filters),
  });
};

export const useLeadById = (id: string) => {
  return useQuery({
    queryKey: ["leads", id],
    queryFn: () => leadsApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: leadsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Лид успешно добавлен");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при добавлении лида");
    },
  });
};

export const useUpdateLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Lead> }) =>
      leadsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Лид успешно обновлен");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при обновлении лида");
    },
  });
};

export const useDeleteLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: leadsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Лид успешно удален");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при удалении лида");
    },
  });
};

export const useLeadStats = () => {
  return useQuery({
    queryKey: ["leads", "stats"],
    queryFn: leadsApi.getStats,
  });
};

// Lead Activities hooks
export const useLeadActivities = (leadId: string) => {
  return useQuery({
    queryKey: ["leads", leadId, "activities"],
    queryFn: () => leadsApi.getActivities(leadId),
    enabled: !!leadId,
  });
};

export const useAddLeadActivity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, activity }: { leadId: string; activity: Omit<LeadActivity, "id" | "leadId" | "createdAt" | "createdBy"> }) =>
      leadsApi.addActivity(leadId, activity),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leads", variables.leadId, "activities"] });
      toast.success("Активность добавлена");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при добавлении активности");
    },
  });
};

// Lead Tasks hooks
export const useLeadTasks = (leadId: string) => {
  return useQuery({
    queryKey: ["leads", leadId, "tasks"],
    queryFn: () => leadsApi.getTasks(leadId),
    enabled: !!leadId,
  });
};

export const useCreateLeadTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, task }: { leadId: string; task: Omit<LeadTask, "id" | "leadId" | "createdAt" | "completedAt"> }) =>
      leadsApi.createTask(leadId, task),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leads", variables.leadId, "tasks"] });
      toast.success("Задача создана");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при создании задачи");
    },
  });
};

export const useUpdateLeadTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, taskId, task }: { leadId: string; taskId: number; task: Partial<LeadTask> }) =>
      leadsApi.updateTask(leadId, taskId, task),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leads", variables.leadId, "tasks"] });
      toast.success("Задача обновлена");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при обновлении задачи");
    },
  });
};

// ============= FINANCE MODULE HOOKS =============

// Payment Transactions
export const useTransactions = () => {
  return useQuery({
    queryKey: ["transactions"],
    queryFn: financeApi.getAllTransactions,
  });
};

export const useStudentTransactions = (studentId: string) => {
  return useQuery({
    queryKey: ["transactions", "student", studentId],
    queryFn: () => financeApi.getTransactionsByStudent(studentId),
    enabled: !!studentId,
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<PaymentTransaction, "id" | "createdAt">) =>
      financeApi.createTransaction(data),
    onSuccess: () => {
      // Invalidate all finance-related queries
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["balances"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Транзакция создана");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при создании транзакции");
    },
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PaymentTransaction> }) =>
      financeApi.updateTransaction(id, data),
    onSuccess: () => {
      // Invalidate all finance-related queries
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["balances"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Транзакция обновлена");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при обновлении транзакции");
    },
  });
};

// Student Balances
export const useStudentBalance = (studentId: string) => {
  return useQuery({
    queryKey: ["balance", studentId],
    queryFn: () => financeApi.getStudentBalance(studentId),
    enabled: !!studentId,
  });
};

export const useAllBalances = () => {
  return useQuery({
    queryKey: ["balances"],
    queryFn: financeApi.getAllBalances,
  });
};

// Tariffs
export const useTariffs = () => {
  return useQuery({
    queryKey: ["tariffs"],
    queryFn: financeApi.getTariffs,
  });
};

export const useTariffById = (id: string) => {
  return useQuery({
    queryKey: ["tariffs", id],
    queryFn: () => financeApi.getTariffById(id),
    enabled: !!id,
  });
};

export const useCreateTariff = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Tariff, "id" | "createdAt">) =>
      financeApi.createTariff(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tariffs"] });
      toast.success("Тариф создан");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при создании тарифа");
    },
  });
};

export const useUpdateTariff = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Tariff> }) =>
      financeApi.updateTariff(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tariffs"] });
      toast.success("Тариф обновлен");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при обновлении тарифа");
    },
  });
};

export const useDeleteTariff = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: financeApi.deleteTariff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tariffs"] });
      toast.success("Тариф удален");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при удалении тарифа");
    },
  });
};

// ============= DISCOUNT HOOKS =============

export const useDiscounts = () => {
  return useQuery({
    queryKey: ["discounts"],
    queryFn: discountsApi.getAll,
  });
};

export const useDiscountById = (id: string) => {
  return useQuery({
    queryKey: ["discounts", id],
    queryFn: () => discountsApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateDiscount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Discount, "id" | "createdAt">) =>
      discountsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      toast.success("Скидка создана");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при создании скидки");
    },
  });
};

export const useUpdateDiscount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Discount> }) =>
      discountsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      toast.success("Скидка обновлена");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при обновлении скидки");
    },
  });
};

export const useDeleteDiscount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: discountsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      toast.success("Скидка удалена");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при удалении скидки");
    },
  });
};

export const useStudentDiscounts = (studentId: string) => {
  return useQuery({
    queryKey: ["discounts", "student", studentId],
    queryFn: () => discountsApi.getStudentDiscounts(studentId),
    enabled: !!studentId,
  });
};

export const useApplyDiscountToStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, data }: { studentId: string; data: { discountId: string; expiresAt?: string } }) =>
      discountsApi.applyToStudent(studentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["discounts", "student", variables.studentId] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Скидка применена к студенту");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при применении скидки");
    },
  });
};

export const useRemoveStudentDiscount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, discountId }: { studentId: string; discountId: string }) =>
      discountsApi.removeStudentDiscount(studentId, discountId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["discounts", "student", variables.studentId] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Скидка удалена");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при удалении скидки");
    },
  });
};

// Debts
export const useDebts = (status?: string) => {
  return useQuery({
    queryKey: ["debts", status],
    queryFn: () => financeApi.getDebts(status),
  });
};

export const useStudentDebts = (studentId: string) => {
  return useQuery({
    queryKey: ["debts", "student", studentId],
    queryFn: () => financeApi.getDebtsByStudent(studentId),
    enabled: !!studentId,
  });
};

export const useCreateDebt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<DebtRecord, "id" | "createdAt">) =>
      financeApi.createDebt(data),
    onSuccess: () => {
      // Invalidate all debt and student-related queries
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["balances"] });
      toast.success("Долг создан");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при создании долга");
    },
  });
};

export const useUpdateDebt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DebtRecord> }) =>
      financeApi.updateDebt(id, data),
    onSuccess: () => {
      // Invalidate all debt and student-related queries
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["balances"] });
      toast.success("Долг обновлен");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при обновлении долга");
    },
  });
};

export const useDeleteDebt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: financeApi.deleteDebt,
    onSuccess: () => {
      // Invalidate all debt and student-related queries
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["balances"] });
      toast.success("Долг удален");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при удалении долга");
    },
  });
};

// ============= SUBSCRIPTION MODULE HOOKS =============

// Subscription Types
export const useSubscriptionTypes = () => {
  return useQuery({
    queryKey: ["subscriptionTypes"],
    queryFn: subscriptionsApi.getSubscriptionTypes,
  });
};

export const useSubscriptionTypeById = (id: string) => {
  return useQuery({
    queryKey: ["subscriptionTypes", id],
    queryFn: () => subscriptionsApi.getSubscriptionTypeById(id),
    enabled: !!id,
  });
};

export const useCreateSubscriptionType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<SubscriptionType, "id" | "createdAt">) =>
      subscriptionsApi.createSubscriptionType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptionTypes"] });
      toast.success("Тип абонемента создан");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при создании типа абонемента");
    },
  });
};

export const useUpdateSubscriptionType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SubscriptionType> }) =>
      subscriptionsApi.updateSubscriptionType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptionTypes"] });
      toast.success("Тип абонемента обновлен");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при обновлении типа абонемента");
    },
  });
};

export const useDeleteSubscriptionType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: subscriptionsApi.deleteSubscriptionType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptionTypes"] });
      toast.success("Тип абонемента удален");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при удалении типа абонемента");
    },
  });
};

// Student Subscriptions
export const useAllSubscriptions = () => {
  return useQuery({
    queryKey: ["subscriptions"],
    queryFn: subscriptionsApi.getAllSubscriptions,
  });
};

export const useStudentSubscriptions = (studentId: string) => {
  return useQuery({
    queryKey: ["subscriptions", "student", studentId],
    queryFn: () => subscriptionsApi.getStudentSubscriptions(studentId),
    enabled: !!studentId,
  });
};

export const useSubscriptionById = (id: string) => {
  return useQuery({
    queryKey: ["subscriptions", id],
    queryFn: () => subscriptionsApi.getSubscriptionById(id),
    enabled: !!id,
  });
};

export const useCreateStudentSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<StudentSubscription, "id" | "createdAt">) =>
      subscriptionsApi.createStudentSubscription(data),
    onSuccess: () => {
      // Invalidate all subscription-related queries to ensure UI updates everywhere
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["balances"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Абонемент создан");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при создании абонемента");
    },
  });
};

export const useUpdateSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StudentSubscription> }) =>
      subscriptionsApi.updateSubscription(id, data),
    onSuccess: () => {
      // Invalidate all subscription-related queries to ensure UI updates everywhere
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["balances"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Абонемент обновлен");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при обновлении абонемента");
    },
  });
};

export const useDeleteSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: subscriptionsApi.deleteSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      toast.success("Абонемент удален");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при удалении абонемента");
    },
  });
};

export const useFreezeSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ subscriptionId, data }: { subscriptionId: string; data: { freezeStart: string; freezeEnd: string; reason?: string } }) =>
      subscriptionsApi.freezeSubscription(subscriptionId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      // Invalidate freezes for this subscription so calendar shows frozen days immediately
      if (variables?.subscriptionId) {
        queryClient.invalidateQueries({ queryKey: ["subscriptions", variables.subscriptionId, "freezes"] });
      }
      toast.success("Абонемент заморожен");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при заморозке абонемента");
    },
  });
};

// Subscription Freezes
export const useSubscriptionFreezes = (subscriptionId: string) => {
  return useQuery({
    queryKey: ["subscriptions", subscriptionId, "freezes"],
    queryFn: () => subscriptionsApi.getSubscriptionFreezes(subscriptionId),
    enabled: !!subscriptionId,
  });
};

export const useCreateFreeze = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ subscriptionId, data }: { subscriptionId: string; data: Omit<SubscriptionFreeze, "id" | "subscriptionId" | "createdAt"> }) =>
      subscriptionsApi.createFreeze(subscriptionId, data),
    onSuccess: (_, variables) => {
      // Invalidate all subscription-related queries to ensure UI updates everywhere
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["balances"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      if (variables?.subscriptionId) {
        queryClient.invalidateQueries({ queryKey: ["subscriptions", variables.subscriptionId, "freezes"] });
      }
      toast.success("Заморозка создана");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при создании заморозки");
    },
  });
};

export const useUpdateFreeze = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: subscriptionsApi.updateFreeze,
    onSuccess: () => {
      // Invalidate all subscription-related queries to ensure UI updates everywhere
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      // Broadly invalidate all freezes
      queryClient.invalidateQueries({ queryKey: ["subscriptions", undefined as any, "freezes" ] });
      queryClient.invalidateQueries({ queryKey: ["balances"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Заморозка обновлена");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при обновлении заморозки");
    },
  });
};

// Lesson Attendance
export const useMarkAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: subscriptionsApi.markAttendance,
    onSuccess: () => {
      // Invalidate all related queries to ensure complete UI update
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendances"] });
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["balances"] });
      toast.success("Посещаемость отмечена");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при отметке посещаемости");
    },
  });
};

export const useLessonAttendance = (lessonId: string) => {
  return useQuery({
    queryKey: ["attendance", "lesson", lessonId],
    queryFn: () => subscriptionsApi.getAttendanceByLesson(lessonId),
    enabled: !!lessonId,
  });
};

export const useStudentAttendance = (studentId: string) => {
  return useQuery({
    queryKey: ["attendance", "student", studentId],
    queryFn: () => subscriptionsApi.getAttendanceByStudent(studentId),
    enabled: !!studentId,
  });
};

// ============= STUDENT MANAGEMENT HOOKS =============

// Student Activities
export const useStudentActivities = (studentId: string, limit = 50, offset = 0) => {
  return useQuery({
    queryKey: ["students", studentId, "activities", limit, offset],
    queryFn: () => studentsAPI.getActivities(studentId, limit, offset),
    enabled: !!studentId,
  });
};

// Student Notes
export const useStudentNotes = (studentId: string) => {
  return useQuery({
    queryKey: ["students", studentId, "notes"],
    queryFn: () => studentsAPI.getNotes(studentId),
    enabled: !!studentId,
  });
};

export const useAddStudentNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, note }: { studentId: string; note: string }) =>
      studentsAPI.addNote(studentId, note),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["students", variables.studentId, "notes"] });
      queryClient.invalidateQueries({ queryKey: ["students", variables.studentId, "activities"] });
      toast.success("Заметка добавлена");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при добавлении заметки");
    },
  });
};

// Student Status
export const useUpdateStudentStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, status }: { studentId: string; status: StudentStatus }) =>
      studentsAPI.updateStatus(studentId, status),
    onMutate: async ({ studentId, status }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["students"] });
      await queryClient.cancelQueries({ queryKey: ["students", "paged"] });
      
      // Snapshot the previous values for rollback
      const previousStudents = queryClient.getQueryData<Student[]>(["students"]);
      
      // Optimistically update all student caches
      queryClient.setQueriesData<Student[]>({ queryKey: ["students"] }, (old) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((s) => (s.id === studentId ? { ...s, status } : s));
      });
      
      // Update all paged queries
      queryClient.setQueriesData<{ items: Student[]; total: number }>(
        { queryKey: ["students", "paged"] },
        (old) => {
          if (!old || !old.items || !Array.isArray(old.items)) return old;
          return {
            ...old,
            items: old.items.map((s) => (s.id === studentId ? { ...s, status } : s)),
          };
        }
      );
      
      // Also update individual student query if it exists
      queryClient.setQueryData<Student>(["students", studentId], (old) => {
        if (!old) return old;
        return { ...old, status };
      });
      
      return { previousStudents };
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousStudents) {
        queryClient.setQueryData(["students"], context.previousStudents);
      }
      toast.error(error.response?.data?.error || "Ошибка при обновлении статуса");
    },
    onSuccess: (_, variables) => {
      // Invalidate all student-related queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["students", "paged"] });
      queryClient.invalidateQueries({ queryKey: ["students", variables.studentId] });
      queryClient.invalidateQueries({ queryKey: ["students", variables.studentId, "activities"] });
      toast.success("Статус ученика обновлен");
    },
  });
};

// Student Attendance Journal
export const useStudentAttendanceJournal = (studentId: string) => {
  return useQuery({
    queryKey: ["students", studentId, "attendance-journal"],
    queryFn: () => studentsAPI.getAttendanceJournal(studentId),
    enabled: !!studentId,
  });
};

// Student Notifications
export const useStudentNotifications = (studentId: string) => {
  return useQuery({
    queryKey: ["students", studentId, "notifications"],
    queryFn: () => studentsAPI.getNotifications(studentId),
    enabled: !!studentId,
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: number) => studentsAPI.markNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Уведомление отмечено как прочитанное");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при обновлении уведомления");
    },
  });
};

// ============= DASHBOARD MODULE HOOKS =============

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: dashboardApi.getDashboardStats,
    refetchInterval: 60000, // Refetch every minute
  });
};

export const useTodayLessons = () => {
  return useQuery({
    queryKey: ["dashboard", "today-lessons"],
    queryFn: dashboardApi.getTodayLessons,
    refetchInterval: 60000,
  });
};

export const useRevenueChart = (period: "week" | "month" | "year" = "week") => {
  return useQuery({
    queryKey: ["dashboard", "revenue-chart", period],
    queryFn: () => dashboardApi.getRevenueChart(period),
  });
};

export const useAttendanceChart = (period: "week" | "month" = "week") => {
  return useQuery({
    queryKey: ["dashboard", "attendance-stats", period],
    queryFn: () => dashboardApi.getAttendanceStats(period),
  });
};

// ============= RBAC HOOKS =============

// Permissions
export const usePermissions = () => {
  return useQuery({
    queryKey: ["permissions"],
    queryFn: rolesAPI.getAllPermissions,
  });
};

// Roles
export const useRoles = () => {
  return useQuery({
    queryKey: ["roles"],
    queryFn: rolesAPI.getAll,
  });
};

export const useRole = (id: string) => {
  return useQuery({
    queryKey: ["roles", id],
    queryFn: () => rolesAPI.getById(id),
    enabled: !!id,
  });
};

export const useCreateRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRoleRequest) => rolesAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Роль успешно создана");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при создании роли");
    },
  });
};

export const useUpdateRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoleRequest }) =>
      rolesAPI.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["roles", variables.id] });
      toast.success("Роль успешно обновлена");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при обновлении роли");
    },
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rolesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Роль успешно удалена");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при удалении роли");
    },
  });
};

export const useRolePermissions = (roleId: string) => {
  return useQuery({
    queryKey: ["roles", roleId, "permissions"],
    queryFn: () => rolesAPI.getRolePermissions(roleId),
    enabled: !!roleId,
  });
};

// User Roles
export const useUserRoles = (userId: number) => {
  return useQuery({
    queryKey: ["users", userId, "roles"],
    queryFn: () => rolesAPI.getUserRoles(userId),
    enabled: !!userId,
  });
};

export const useAssignRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AssignRoleRequest) => rolesAPI.assignRole(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users", variables.userId, "roles"] });
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("Роль успешно назначена");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при назначении роли");
    },
  });
};

export const useRemoveRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AssignRoleRequest) => rolesAPI.removeRole(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users", variables.userId, "roles"] });
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("Роль успешно удалена");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при удалении роли");
    },
  });
};

export const useInviteUser = () => {
  return useMutation({
    mutationFn: (data: InviteUserRequest) => authAPI.invite(data),
    onSuccess: (response: any) => {
      toast.success("Приглашение отправлено");
      // Log to browser console for local development
      if (response?.inviteLink && response?.code) {
        console.log("📧 Приглашение отправлено:");
        console.log("   Email:", response.email);
        console.log("   Ссылка:", response.inviteLink);
        console.log("   Код:", response.code);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Ошибка при приглашении");
    },
  });
};

export const useAcceptInvite = () => {
  return useMutation({
    mutationFn: (data: AcceptInviteRequest) => authAPI.acceptInvite(data),
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Не удалось принять приглашение");
    },
  });
};

export const useUsers = () => {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => authAPI.getUsers(),
  });
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { branchesAPI, setCurrentBranchId } from '@/api/branches';
import { Branch } from '@/types';
import { toast } from 'sonner';

// Get all branches accessible to the user
export const useBranches = () => {
  const token = localStorage.getItem('token');
  
  return useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: branchesAPI.getBranches,
    enabled: !!token, // Only fetch if user is authenticated
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus
    retry: false, // Don't retry on error
  });
};

// Get a specific branch
export const useBranch = (branchId: string) => {
  return useQuery<Branch>({
    queryKey: ['branches', branchId],
    queryFn: () => branchesAPI.getBranch(branchId),
    enabled: !!branchId,
  });
};

// Create a new branch
export const useCreateBranch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: branchesAPI.createBranch,
    onSuccess: async (newBranch) => {
      // Invalidate branches query to refetch the list
      await queryClient.invalidateQueries({ queryKey: ['branches'] });
      
      // Wait a bit to ensure the database transaction is committed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refetch branches to ensure the new branch is in the list
      await queryClient.refetchQueries({ queryKey: ['branches'] });
      
      // Automatically switch to the newly created branch
      try {
        const switchData = await branchesAPI.switchBranch(newBranch.id);
        localStorage.setItem('token', switchData.token);
        localStorage.setItem('refreshToken', switchData.refreshToken);
        setCurrentBranchId(switchData.branchId);
        
        // Invalidate all queries to refetch with new branch context
        queryClient.invalidateQueries();
        
        toast.success('Филиал успешно создан и активирован');
        
        // Reload the page to ensure all components use the new branch context
        window.location.reload();
      } catch (switchError: any) {
        // If switch fails, still show success for creation
        toast.success('Филиал успешно создан');
        toast.warning(switchError?.response?.data?.error || 'Не удалось автоматически переключиться на новый филиал. Вы можете переключиться вручную.');
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Ошибка при создании филиала');
    },
  });
};

// Update a branch
export const useUpdateBranch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      branchId,
      data,
    }: {
      branchId: string;
      data: {
        name?: string;
        address?: string;
        phone?: string;
        status?: 'active' | 'inactive';
      };
    }) => branchesAPI.updateBranch(branchId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      queryClient.invalidateQueries({ queryKey: ['branches', variables.branchId] });
      toast.success('Филиал успешно обновлен');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Ошибка при обновлении филиала');
    },
  });
};

// Delete a branch
export const useDeleteBranch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: branchesAPI.deleteBranch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast.success('Филиал успешно удален');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Ошибка при удалении филиала');
    },
  });
};

// Switch to a different branch
export const useSwitchBranch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: branchesAPI.switchBranch,
    onSuccess: (data) => {
      // Update tokens in localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      setCurrentBranchId(data.branchId);
      
      // Invalidate all queries to refetch with new branch context
      queryClient.invalidateQueries();
      
      toast.success('Филиал успешно переключен');
      
      // Reload the page to ensure all components use the new branch context
      window.location.reload();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Ошибка при переключении филиала');
    },
  });
};

// Get branch users
export const useBranchUsers = (branchId: string) => {
  return useQuery({
    queryKey: ['branches', branchId, 'users'],
    queryFn: () => branchesAPI.getBranchUsers(branchId),
    enabled: !!branchId,
  });
};

// Assign user to branch
export const useAssignUserToBranch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      branchId,
      userId,
      roleId,
    }: {
      branchId: string;
      userId: number;
      roleId?: string;
    }) => branchesAPI.assignUserToBranch(branchId, userId, roleId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['branches', variables.branchId, 'users'],
      });
      toast.success('Пользователь успешно назначен на филиал');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Ошибка при назначении пользователя');
    },
  });
};

// Remove user from branch
export const useRemoveUserFromBranch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ branchId, userId }: { branchId: string; userId: number }) =>
      branchesAPI.removeUserFromBranch(branchId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['branches', variables.branchId, 'users'],
      });
      toast.success('Пользователь удален из филиала');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Ошибка при удалении пользователя');
    },
  });
};


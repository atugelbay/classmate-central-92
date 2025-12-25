import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Branch } from '@/types';
import { useBranches, useSwitchBranch } from '@/hooks/useBranches';
import { getCurrentBranchId, setCurrentBranchId as saveCurrentBranchId } from '@/api/branches';

interface BranchContextType {
  branches: Branch[];
  currentBranch: Branch | null;
  currentBranchId: string | null;
  isLoading: boolean;
  switchBranch: (branchId: string) => Promise<void>;
  isSwitching: boolean;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export const BranchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentBranchId, setCurrentBranchId] = useState<string | null>(null);
  const { data: branchesData, isLoading } = useBranches();
  
  // Ensure branches is always an array
  const branches = Array.isArray(branchesData) ? branchesData : [];
  
  const { mutateAsync: switchBranchMutation, isPending: isSwitching } = useSwitchBranch();

  // Initialize current branch ID from localStorage or use first available branch
  useEffect(() => {
    const savedBranchId = getCurrentBranchId();
    
    if (savedBranchId) {
      setCurrentBranchId(savedBranchId);
    } else if (branches.length > 0 && !currentBranchId) {
      // If no saved branch and we have branches, use the first one
      const firstBranch = branches[0];
      setCurrentBranchId(firstBranch.id);
      saveCurrentBranchId(firstBranch.id);
    }
  }, [branches, currentBranchId]);

  const currentBranch = branches.find(b => b.id === currentBranchId) || null;

  const switchBranch = async (branchId: string) => {
    await switchBranchMutation(branchId);
    setCurrentBranchId(branchId);
  };

  return (
    <BranchContext.Provider
      value={{
        branches,
        currentBranch,
        currentBranchId,
        isLoading,
        switchBranch,
        isSwitching,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
};

export const useBranchContext = () => {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error('useBranchContext must be used within a BranchProvider');
  }
  return context;
};


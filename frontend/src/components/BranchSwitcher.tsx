import { useState } from 'react';
import { Check, ChevronsUpDown, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useBranchContext } from '@/context/BranchContext';

export function BranchSwitcher() {
  const { branches, currentBranch, switchBranch, isSwitching, isLoading } = useBranchContext();
  const [open, setOpen] = useState(false);

  const handleSwitchBranch = async (branchId: string) => {
    if (branchId === currentBranch?.id) {
      setOpen(false);
      return;
    }
    
    try {
      await switchBranch(branchId);
      setOpen(false);
    } catch (error) {
      console.error('Failed to switch branch:', error);
    }
  };

  if (isLoading || !branches.length) {
    return null;
  }

  // Don't show switcher if user only has access to one branch
  if (branches.length === 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span>{currentBranch?.name || 'Филиал'}</span>
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between min-w-[200px]"
          disabled={isSwitching}
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="truncate">{currentBranch?.name || 'Выберите филиал'}</span>
          </div>
          {isSwitching ? (
            <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[200px]" align="end">
        {branches.map((branch) => (
          <DropdownMenuItem
            key={branch.id}
            onSelect={() => handleSwitchBranch(branch.id)}
            className={cn(
              'flex items-center justify-between cursor-pointer',
              branch.id === currentBranch?.id && 'bg-accent'
            )}
          >
            <div className="flex flex-col">
              <span>{branch.name}</span>
              {branch.address && (
                <span className="text-xs text-muted-foreground truncate">
                  {branch.address}
                </span>
              )}
            </div>
            {branch.id === currentBranch?.id && (
              <Check className="h-4 w-4" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


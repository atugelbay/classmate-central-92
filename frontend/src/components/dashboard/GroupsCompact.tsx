import { UsersRound, ArrowRight, Loader2, UserCheck } from "lucide-react";
import { useGroups } from "@/hooks/useData";
import { useNavigate } from "react-router-dom";

export function GroupsCompact() {
  const navigate = useNavigate();
  const { data: groups = [], isLoading } = useGroups();

  const activeGroups = Array.isArray(groups) 
    ? groups.filter((g: any) => g.status === "active")
    : [];

  const totalStudents = activeGroups.reduce((sum: number, g: any) => sum + (g.studentIds?.length || 0), 0);
  const totalGroups = Array.isArray(groups) ? groups.length : 0;

  return (
    <div 
      className="h-full rounded-2xl bg-card border border-border p-4 flex flex-col cursor-pointer transition-all hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-800"
      onClick={() => navigate("/groups")}
    >
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-500">
                <UsersRound className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-foreground text-sm">Группы</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Total */}
          <div className="mb-3">
            <div className="text-3xl font-bold text-foreground">
              {totalGroups}
            </div>
            <div className="text-xs text-muted-foreground">
              всего групп
            </div>
          </div>

          {/* Stats breakdown */}
          <div className="flex items-center gap-4 mt-auto">
            <div className="flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs text-muted-foreground">{activeGroups.length} актив.</span>
            </div>
            <div className="flex items-center gap-1.5">
              <UsersRound className="h-3.5 w-3.5 text-indigo-500" />
              <span className="text-xs text-muted-foreground">{totalStudents} учен.</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import { Users, ArrowRight, Loader2 } from "lucide-react";
import { useGroups } from "@/hooks/useData";
import { useNavigate } from "react-router-dom";

export function GroupsCompact() {
  const navigate = useNavigate();
  const { data: groups = [], isLoading } = useGroups();

  const activeGroups = Array.isArray(groups) 
    ? groups.filter((g: any) => g.status === "active").slice(0, 4)
    : [];

  const totalStudents = activeGroups.reduce((sum: number, g: any) => sum + (g.studentIds?.length || 0), 0);

  return (
    <div 
      className="h-full rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-indigo-950 dark:to-purple-900 p-3 flex flex-col cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] overflow-hidden"
      onClick={() => navigate("/groups")}
    >
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="p-1.5 rounded-lg bg-indigo-500/20">
              <Users className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-indigo-400" />
          </div>

          {/* Stats */}
          <div className="flex-1 flex flex-col justify-end">
            <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-100 leading-none">
              {activeGroups.length}
            </div>
            <div className="text-[10px] text-indigo-600 dark:text-indigo-400">
              активных групп
            </div>
            <div className="text-[10px] text-indigo-500/70 dark:text-indigo-400/70">
              {totalStudents} учеников
            </div>
          </div>
        </>
      )}
    </div>
  );
}

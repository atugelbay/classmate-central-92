import { UserPlus, ArrowRight, Loader2 } from "lucide-react";
import { useLeads } from "@/hooks/useData";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import "moment/locale/ru";

moment.locale("ru");

export function LeadsCompact() {
  const navigate = useNavigate();
  const { data: leads = [], isLoading } = useLeads();

  const newLeads = Array.isArray(leads) 
    ? leads
        .filter((l: any) => l.status === "new")
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3)
    : [];

  const totalNew = Array.isArray(leads) ? leads.filter((l: any) => l.status === "new").length : 0;

  return (
    <div 
      className="h-full rounded-2xl bg-gradient-to-br from-cyan-50 to-teal-100 dark:from-cyan-950 dark:to-teal-900 p-4 flex flex-col cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
      onClick={() => navigate("/leads")}
    >
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-500" />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/20">
                <UserPlus className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              </div>
              <span className="text-xs font-medium text-cyan-700 dark:text-cyan-300">Заявки</span>
            </div>
            <ArrowRight className="h-4 w-4 text-cyan-400" />
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col justify-end">
            <div className="text-2xl font-bold text-cyan-900 dark:text-cyan-100">
              {totalNew}
            </div>
            <div className="text-xs text-cyan-600 dark:text-cyan-400">
              {totalNew === 0 ? "нет новых" : "новых заявок"}
            </div>
            {newLeads.length > 0 && (
              <div className="text-[10px] text-cyan-500/70 dark:text-cyan-400/70 mt-1 truncate">
                Последняя: {newLeads[0]?.name}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

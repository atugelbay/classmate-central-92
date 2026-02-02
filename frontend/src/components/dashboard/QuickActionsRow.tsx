import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Calendar, UserPlus, DollarSign, Users, Plus } from "lucide-react";
import { LessonFormModal } from "@/components/LessonFormModal";
import { useTeachers, useGroups, useRooms, useStudents } from "@/hooks/useData";

export function QuickActionsRow() {
  const navigate = useNavigate();
  const { t } = useTranslation("dashboard");
  const [isLessonFormOpen, setIsLessonFormOpen] = useState(false);
  
  const { data: teachers = [] } = useTeachers();
  const { data: groups = [] } = useGroups();
  const { data: rooms = [] } = useRooms();
  const { data: students = [] } = useStudents();

  const quickActions = [
    {
      label: t("quickActions.addLesson"),
      description: t("quickActions.addLesson"),
      icon: Calendar,
      iconBg: "bg-[hsl(250,84%,54%)]", // Primary blue from logo
      hoverBg: "hover:bg-blue-50/50 dark:hover:bg-blue-950/30",
      borderColor: "hover:border-blue-200 dark:hover:border-blue-800",
      onClick: () => setIsLessonFormOpen(true),
    },
    {
      label: t("quickActions.addStudent"),
      description: t("quickActions.addStudent"),
      icon: UserPlus,
      iconBg: "bg-[hsl(158,64%,45%)]", // Success green
      hoverBg: "hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30",
      borderColor: "hover:border-emerald-200 dark:hover:border-emerald-800",
      onClick: () => navigate("/students"),
    },
    {
      label: t("quickActions.addPayment"),
      description: t("quickActions.addPayment"),
      icon: DollarSign,
      iconBg: "bg-[hsl(38,92%,55%)]", // Warning orange
      hoverBg: "hover:bg-amber-50/50 dark:hover:bg-amber-950/30",
      borderColor: "hover:border-amber-200 dark:hover:border-amber-800",
      onClick: () => navigate("/finance"),
    },
    {
      label: t("quickActions.viewSchedule"),
      description: t("quickActions.viewSchedule"),
      icon: Users,
      iconBg: "bg-[hsl(262,83%,58%)]", // Accent violet from logo
      hoverBg: "hover:bg-violet-50/50 dark:hover:bg-violet-950/30",
      borderColor: "hover:border-violet-200 dark:hover:border-violet-800",
      onClick: () => navigate("/groups"),
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className={`group flex items-center gap-3 p-4 rounded-xl bg-card border border-border ${action.hoverBg} ${action.borderColor} transition-all duration-200 hover:shadow-md`}
          >
            <div className={`p-2.5 rounded-xl ${action.iconBg} shadow-lg group-hover:scale-110 transition-transform`}>
              <action.icon className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-foreground text-sm">{action.label}</div>
              <div className="text-xs text-muted-foreground">{action.description}</div>
            </div>
            <Plus className="h-4 w-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>

      <LessonFormModal
        open={isLessonFormOpen}
        onOpenChange={setIsLessonFormOpen}
        teachers={teachers}
        groups={groups}
        rooms={rooms}
        students={students}
        mode="create"
      />
    </>
  );
}

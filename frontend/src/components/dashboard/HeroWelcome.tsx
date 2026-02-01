import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Calendar, UserPlus, DollarSign, Users } from "lucide-react";
import { LessonFormModal } from "@/components/LessonFormModal";
import { useTeachers, useGroups, useRooms, useStudents } from "@/hooks/useData";

// Function to get greeting based on time of day
const getGreeting = (): string => {
  const hour = new Date().getHours();
  
  if (hour >= 6 && hour < 12) {
    return "Доброе утро";
  } else if (hour >= 12 && hour < 18) {
    return "Добрый день";
  } else if (hour >= 18 && hour < 23) {
    return "Добрый вечер";
  } else {
    return "Доброй ночи";
  }
};

const getTimeEmoji = (): string => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return "☀️";
  if (hour >= 12 && hour < 18) return "🌤️";
  if (hour >= 18 && hour < 23) return "🌙";
  return "✨";
};

export function HeroWelcome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLessonFormOpen, setIsLessonFormOpen] = useState(false);
  
  const { data: teachers = [] } = useTeachers();
  const { data: groups = [] } = useGroups();
  const { data: rooms = [] } = useRooms();
  const { data: students = [] } = useStudents();

  const quickActions = [
    {
      label: "Урок",
      icon: Calendar,
      color: "from-violet-500 to-purple-600",
      onClick: () => setIsLessonFormOpen(true),
    },
    {
      label: "Ученик",
      icon: UserPlus,
      color: "from-emerald-500 to-teal-600",
      onClick: () => navigate("/students"),
    },
    {
      label: "Платёж",
      icon: DollarSign,
      color: "from-amber-500 to-orange-600",
      onClick: () => navigate("/finance"),
    },
    {
      label: "Группа",
      icon: Users,
      color: "from-sky-500 to-blue-600",
      onClick: () => navigate("/groups"),
    },
  ];

  return (
    <>
      <div className="h-full rounded-3xl bg-gradient-to-br from-primary via-primary-dark to-[hsl(280,70%,45%)] p-6 flex flex-col justify-between relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        
        {/* Content */}
        <div className="relative z-10">
          <div className="text-white/70 text-sm mb-1">{getTimeEmoji()} {getGreeting()}</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            {user?.name || 'Гость'}
          </h1>
          <p className="text-white/60 text-sm mt-1">
            Готовы к продуктивному дню?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="relative z-10">
          <div className="text-white/50 text-xs uppercase tracking-wider mb-3">Быстрые действия</div>
          <div className="grid grid-cols-4 gap-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className="group flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all duration-200 hover:scale-105"
              >
                <div className={`p-2 rounded-xl bg-gradient-to-br ${action.color} shadow-lg`}>
                  <action.icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-white/90 text-xs font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
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

import { Calendar, Clock, Loader2 } from "lucide-react";
import { useTodayLessons, useTeachers } from "@/hooks/useData";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import "moment/locale/ru";

moment.locale("ru");

export function TodayScheduleCompact() {
  const navigate = useNavigate();
  const { data: lessons = [], isLoading } = useTodayLessons();
  const { data: teachers = [] } = useTeachers();

  const sortedLessons = Array.isArray(lessons) 
    ? [...lessons]
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
        .slice(0, 4)
    : [];

  const upcomingCount = sortedLessons.filter(l => l.status === 'scheduled').length;

  return (
    <div 
      className="h-full rounded-3xl bg-gradient-to-br from-sky-50 to-blue-100 dark:from-sky-950 dark:to-blue-900 p-5 flex flex-col cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
      onClick={() => navigate("/schedule")}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-sky-500/20">
            <Calendar className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          </div>
          <span className="font-semibold text-sm text-sky-900 dark:text-sky-100">Сегодня</span>
        </div>
        <div className="px-2 py-1 rounded-full bg-sky-500/20 text-xs font-medium text-sky-700 dark:text-sky-300">
          {upcomingCount} уроков
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
        </div>
      ) : sortedLessons.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-sky-600/60 dark:text-sky-400/60">
          <Calendar className="h-8 w-8 mb-2 opacity-50" />
          <span className="text-xs">Нет уроков</span>
        </div>
      ) : (
        <div className="flex-1 space-y-2 overflow-hidden">
          {sortedLessons.map((lesson: any) => {
            const teacher = teachers.find((t) => t.id === lesson.teacherId);
            const startTime = moment(lesson.start);
            const isNow = moment().isBetween(moment(lesson.start), moment(lesson.end));
            
            return (
              <div
                key={lesson.id}
                className={`p-2.5 rounded-xl transition-all ${
                  isNow 
                    ? "bg-sky-500 text-white shadow-md" 
                    : "bg-white/60 dark:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className={`h-3 w-3 ${isNow ? "text-white/80" : "text-sky-500"}`} />
                  <span className={`text-xs font-medium ${isNow ? "text-white" : "text-sky-900 dark:text-sky-100"}`}>
                    {startTime.format("HH:mm")}
                  </span>
                </div>
                <div className={`text-xs mt-1 truncate ${isNow ? "text-white/80" : "text-sky-700 dark:text-sky-300"}`}>
                  {teacher?.name || "Учитель"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

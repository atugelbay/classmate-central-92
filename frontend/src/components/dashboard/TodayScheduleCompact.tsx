import { Calendar, Clock, Loader2, ArrowRight, MapPin } from "lucide-react";
import { useTodayLessons, useTeachers, useGroups, useRooms } from "@/hooks/useData";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import moment from "moment";
import "moment/locale/ru";
import "moment/locale/kk";

export function TodayScheduleCompact() {
  const navigate = useNavigate();
  const { data: lessons = [], isLoading } = useTodayLessons();
  const { data: teachers = [] } = useTeachers();
  const { data: groups = [] } = useGroups();
  const { data: rooms = [] } = useRooms();
  const { t, i18n } = useTranslation("dashboard");
  
  // Set moment locale based on current language
  moment.locale(i18n.language);

  const sortedLessons = Array.isArray(lessons) 
    ? [...lessons]
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
        .slice(0, 5)
    : [];

  const totalLessons = Array.isArray(lessons) ? lessons.length : 0;
  const completedCount = Array.isArray(lessons) ? lessons.filter((l: any) => l.status === 'completed').length : 0;

  return (
    <div 
      className="h-full rounded-2xl bg-card border border-border p-4 flex flex-col cursor-pointer transition-all hover:shadow-lg hover:border-sky-200 dark:hover:border-sky-800"
      onClick={() => navigate("/schedule")}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-sky-500">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-foreground">{t("todaySchedule.title")}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {t("common:all")} <ArrowRight className="h-3 w-3" />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 p-3 rounded-xl bg-sky-500/10">
          <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">{totalLessons}</div>
          <div className="text-xs text-muted-foreground">{t("stats.lessons").toLowerCase()}</div>
        </div>
        <div className="flex-1 p-3 rounded-xl bg-emerald-500/10">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{completedCount}</div>
          <div className="text-xs text-muted-foreground">{t("common:statuses.completed").toLowerCase()}</div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
        </div>
      ) : sortedLessons.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <Calendar className="h-8 w-8 mb-2 opacity-50" />
          <span className="text-sm">{t("todaySchedule.noLessons")}</span>
        </div>
      ) : (
        <div className="flex-1 space-y-2 overflow-y-auto">
          {sortedLessons.map((lesson: any) => {
            const teacher = teachers.find((t) => t.id === lesson.teacherId);
            const group = groups.find((g) => g.id === lesson.groupId);
            const room = rooms.find((r) => r.id === lesson.roomId);
            const startTime = moment(lesson.start);
            const endTime = moment(lesson.end);
            const isNow = moment().isBetween(startTime, endTime);
            const isPast = moment().isAfter(endTime);
            
            // "Now" label translations
            const getNowLabel = () => {
              const labels = { ru: "Сейчас", kk: "Қазір", en: "Now" };
              return labels[i18n.language as 'ru' | 'kk' | 'en'] || labels.ru;
            };
            
            return (
              <div
                key={lesson.id}
                className={`p-3 rounded-xl transition-all ${
                  isNow 
                    ? "bg-sky-500 text-white shadow-md" 
                    : isPast
                    ? "bg-muted/30 opacity-60"
                    : "bg-muted/50 hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Clock className={`h-3.5 w-3.5 ${isNow ? "text-white/80" : "text-sky-500"}`} />
                    <span className={`text-sm font-semibold ${isNow ? "text-white" : "text-foreground"}`}>
                      {startTime.format("HH:mm")} - {endTime.format("HH:mm")}
                    </span>
                  </div>
                  {isNow && (
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-medium">
                      {getNowLabel()}
                    </span>
                  )}
                </div>
                <div className={`text-xs truncate ${isNow ? "text-white/90" : "text-foreground"}`}>
                  {group?.name || teacher?.name || t("stats.lessons")}
                </div>
                {room && (
                  <div className={`flex items-center gap-1 text-xs mt-1 ${isNow ? "text-white/70" : "text-muted-foreground"}`}>
                    <MapPin className="h-3 w-3" />
                    {room.name}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

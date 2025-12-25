import { useMemo, useState } from "react";
import moment from "moment";
import "moment/locale/ru";
import { Lesson, StudentSubscription, LessonAttendance } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  Calendar as CalendarIcon,
  Snowflake,
  User,
  Flag,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

moment.locale("ru");

type LessonStatus =
  | "attended"
  | "missed_excused"
  | "missed_unexcused"
  | "frozen"
  | "cancelled"
  | "scheduled";

interface CalendarLesson {
  date: Date;
  lesson: Lesson;
  status: LessonStatus;
  attendance?: LessonAttendance;
}

interface StudentLessonCalendarProps {
  studentId: string;
  subscriptions: StudentSubscription[];
  lessons: Lesson[];
  attendances: LessonAttendance[];
  freezes?: Array<{ start: Date; end: Date }>;
}

export function StudentLessonCalendar({
  studentId,
  subscriptions,
  lessons,
  attendances,
  freezes = [],
}: StudentLessonCalendarProps) {
  const navigate = useNavigate();
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);

  // Get all lessons for this student within subscription periods
  const calendarLessons: CalendarLesson[] = useMemo(() => {
    const result: CalendarLesson[] = [];
    const now = moment();
    
    // 1) Precompute all frozen dates (by day) into a Set for quick lookup
    const frozenDateKeys = new Set<string>();
    freezes.forEach((freeze) => {
      const freezeStart = moment(freeze.start);
      const freezeEnd = moment(freeze.end);
      const day = freezeStart.clone();
      while (day.isSameOrBefore(freezeEnd, "day")) {
        frozenDateKeys.add(day.format("YYYY-MM-DD"));
        day.add(1, "day");
      }
    });

    subscriptions.forEach((sub) => {
      const startDate = moment(sub.startDate);
      const endDate = sub.endDate ? moment(sub.endDate) : null;

      // Get lessons for this subscription period
      const subscriptionLessons = lessons.filter((lesson) => {
        const lessonDate = moment(lesson.start);
        const isInPeriod =
          lessonDate.isSameOrAfter(startDate) &&
          (!endDate || lessonDate.isSameOrBefore(endDate));
        const isForStudent =
          lesson.studentIds?.includes(studentId) ||
          (lesson.groupId && sub.groupId === lesson.groupId);

        return isInPeriod && isForStudent;
      });

      subscriptionLessons.forEach((lesson) => {
        const lessonDate = moment(lesson.start);
        const lessonAttendance = attendances.find(
          (att) => att.lessonId === lesson.id && att.studentId === studentId
        );
        const dateKey = lessonDate.format("YYYY-MM-DD");
        const isFrozen = frozenDateKeys.has(dateKey);

        let status: LessonStatus;

        if (lesson.status === "cancelled") {
          status = "cancelled";
        } else if (isFrozen) {
          status = "frozen";
        } else if (lessonAttendance) {
          if (lessonAttendance.status === "attended") {
            status = "attended";
          } else if (lessonAttendance.status === "missed") {
            status = lessonAttendance.reason
              ? "missed_excused"
              : "missed_unexcused";
          } else {
            status = "cancelled";
          }
        } else if (lessonDate.isBefore(now)) {
          status = "missed_unexcused";
        } else {
          status = "scheduled";
        }

        result.push({
          date: lesson.start,
          lesson,
          status,
          attendance: lessonAttendance,
        });
      });
    });

    // 2) Ensure frozen dates are present even if no lessons exist on those days
    frozenDateKeys.forEach((dateKey) => {
      const alreadyHasEntry = result.some((item) => moment(item.date).format("YYYY-MM-DD") === dateKey);
      if (!alreadyHasEntry) {
        const day = moment(dateKey, "YYYY-MM-DD");
        const virtualLesson: Lesson = {
          id: `freeze-${dateKey}`,
          title: "Заморожено",
          teacherId: "",
          subject: "",
          start: day.toDate(),
          end: day.clone().add(1, "hour").toDate(),
          room: "",
          status: "scheduled",
          studentIds: [],
        };
        result.push({
          date: day.toDate(),
          lesson: virtualLesson,
          status: "frozen",
        });
      }
    });

    return result.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [subscriptions, lessons, attendances, studentId, freezes]);

  // Generate date range based on subscription periods - only show days with lessons
  const dateGrid = useMemo(() => {
    const grid: Array<{
      date: moment.Moment;
      lesson: CalendarLesson | null;
      isToday: boolean;
      status: LessonStatus | null;
    }> = [];

    // Group lessons by date
    const lessonsByDate = new Map<string, CalendarLesson[]>();
    calendarLessons.forEach((item) => {
      const dateKey = moment(item.date).format("YYYY-MM-DD");
      if (!lessonsByDate.has(dateKey)) {
        lessonsByDate.set(dateKey, []);
      }
      lessonsByDate.get(dateKey)!.push(item);
    });

    // Only include days that have lessons
    const today = moment();
    const sortedDates = Array.from(lessonsByDate.keys()).sort();

    sortedDates.forEach((dateKey) => {
      const dayLessons = lessonsByDate.get(dateKey) || [];
      const primaryLesson = dayLessons[0] || null;
      const date = moment(dateKey, "YYYY-MM-DD");
      const isToday = date.isSame(today, "day");
      const status: LessonStatus | null = primaryLesson ? primaryLesson.status : null;

      grid.push({
        date,
        lesson: primaryLesson,
        isToday,
        status,
      });
    });

    return grid;
  }, [calendarLessons]);

  // Get status configuration with visual styling
  const getStatusConfig = (status: LessonStatus | null) => {
    if (!status) {
      return {
        icon: User,
        bgColor: "bg-gray-50 dark:bg-gray-900/30",
        iconColor: "text-gray-400 dark:text-gray-500",
        borderColor: "border-gray-200 dark:border-gray-700",
        textDecoration: "",
        opacity: "opacity-100",
      };
    }

    const configs: Record<LessonStatus, {
      icon: typeof CheckCircle2;
      bgColor: string;
      iconColor: string;
      borderColor: string;
      textDecoration: string;
      opacity: string;
    }> = {
      attended: {
        icon: CheckCircle2,
        bgColor: "bg-green-100 dark:bg-green-950/30",
        iconColor: "text-green-700 dark:text-green-400",
        borderColor: "border-green-400 dark:border-green-600",
        textDecoration: "",
        opacity: "opacity-100",
      },
      missed_excused: {
        icon: Clock,
        bgColor: "bg-yellow-100 dark:bg-yellow-950/30",
        iconColor: "text-yellow-700 dark:text-yellow-400",
        borderColor: "border-yellow-400 dark:border-yellow-600",
        textDecoration: "line-through",
        opacity: "opacity-90",
      },
      missed_unexcused: {
        icon: XCircle,
        bgColor: "bg-red-100 dark:bg-red-950/30",
        iconColor: "text-red-700 dark:text-red-400",
        borderColor: "border-red-400 dark:border-red-600",
        textDecoration: "line-through",
        opacity: "opacity-90",
      },
      frozen: {
        icon: Snowflake,
        bgColor: "bg-blue-100 dark:bg-blue-950/30",
        iconColor: "text-blue-700 dark:text-blue-400",
        borderColor: "border-blue-400 dark:border-blue-600",
        textDecoration: "",
        opacity: "opacity-80",
      },
      cancelled: {
        icon: Ban,
        bgColor: "bg-gray-100 dark:bg-gray-900/30",
        iconColor: "text-gray-500 dark:text-gray-400",
        borderColor: "border-gray-300 dark:border-gray-700",
        textDecoration: "line-through",
        opacity: "opacity-60",
      },
      scheduled: {
        icon: GripVertical,
        bgColor: "bg-green-50 dark:bg-green-950/20",
        iconColor: "text-green-600 dark:text-green-400",
        borderColor: "border-green-300 dark:border-green-700",
        textDecoration: "",
        opacity: "opacity-100",
      },
    };

    return configs[status];
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Календарь посещаемости
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex flex-wrap gap-2 mb-4 text-xs text-foreground">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
            <span className="text-foreground">Посещен</span>
          </div>
          <div className="flex items-center gap-1">
            <XCircle className="h-3 w-3 text-orange-600 dark:text-orange-400" />
            <span className="text-foreground">Пропущен</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-orange-600 dark:text-orange-400" />
            <span className="text-foreground">Пропущен (ув.)</span>
          </div>
          <div className="flex items-center gap-1">
            <Snowflake className="h-3 w-3 text-gray-400 dark:text-gray-300" />
            <span className="text-foreground">Заморожен</span>
          </div>
          <div className="flex items-center gap-1">
            <GripVertical className="h-3 w-3 text-green-600 dark:text-green-400" />
            <span className="text-foreground">Запланирован</span>
          </div>
        </div>

        {/* Date Grid */}
        <div className="grid grid-cols-5 gap-2 max-h-[600px] overflow-y-auto">
          {dateGrid.length === 0 ? (
            <div className="col-span-5 text-center py-8 text-muted-foreground">
              Нет уроков в периоде абонемента
            </div>
          ) : (
            dateGrid.map((item, idx) => {
              const statusConfig = getStatusConfig(item.status);
              const Icon = statusConfig.icon;
              const dayOfWeek = item.date.format("ddd");
              const dayOfMonth = item.date.format("DD.MM");
              const isToday = item.isToday;

              const lesson = item.lesson?.lesson;
              const lessonId = lesson?.id || `freeze-${item.date.format("YYYY-MM-DD")}`;

              const title = item.status === "frozen" ? "День заморозки" : (lesson?.title || "Урок");
              const timeText = `${item.date.format("HH:mm")}${lesson ? " - " + moment(lesson.end).format("HH:mm") : ""}`;

              return (
                <Popover key={idx} open={openLessonId === lessonId} onOpenChange={(o) => setOpenLessonId(o ? lessonId : null)}>
                  <PopoverTrigger asChild>
                    <div
                      className={cn(
                        "relative p-2 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md",
                        statusConfig.bgColor,
                        statusConfig.borderColor,
                        statusConfig.opacity
                      )}
                      onClick={() => setOpenLessonId(lessonId)}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Icon className={cn("h-4 w-4", statusConfig.iconColor)} />
                        <div className={cn(
                          "text-[10px] font-medium",
                          statusConfig.textDecoration,
                          item.status === "cancelled" 
                            ? "text-gray-500 dark:text-gray-400" 
                            : "text-gray-700 dark:text-gray-200"
                        )}>
                          {dayOfWeek}
                        </div>
                        <div className={cn(
                          "text-xs font-semibold",
                          statusConfig.textDecoration,
                          item.status === "cancelled" 
                            ? "text-gray-500 dark:text-gray-400" 
                            : "text-gray-900 dark:text-gray-100"
                        )}>
                          {dayOfMonth}
                        </div>
                        {isToday && (
                          <div className="absolute top-0 right-0 flex items-center gap-0.5 text-[8px] text-green-600 dark:text-green-400 font-semibold">
                            <Flag className="h-2 w-2" />
                            <span>сейчас</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold">{title}</div>
                          <div className="text-xs text-muted-foreground">{item.date.format("dddd, DD.MM.YYYY")} {timeText}</div>
                        </div>
                        <Badge variant="outline">{item.status === "frozen" ? "Заморожен" : "Урок"}</Badge>
                      </div>
                      {lesson && (
                        <div className="text-xs text-muted-foreground">
                          {lesson.groupName ? <div>Группа: {lesson.groupName}</div> : null}
                          {lesson.teacherName ? <div>Преподаватель: {lesson.teacherName}</div> : null}
                        </div>
                      )}
                      <div className="pt-2 flex items-center gap-2">
                        {lesson ? (
                          <Button size="sm" onClick={() => navigate(`/schedule?lessonId=${lesson.id}`)}>
                            Редактировать урок
                          </Button>
                        ) : (
                          <div className="text-xs text-muted-foreground">День помечен как замороженный</div>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

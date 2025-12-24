import moment from "moment";
import "moment/dist/locale/ru";
import { Lesson, Teacher, Group, Student, Room } from "@/types";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Clock, MapPin, User, Users, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";

interface MobileScheduleViewProps {
  lessons: Lesson[];
  teachers: Teacher[];
  groups: Group[];
  students: Student[];
  rooms: Room[];
  selectedDate: Date;
  viewMode: "day" | "week";
  onLessonClick?: (lesson: Lesson) => void;
  unmarkedLessonIds?: Set<string>;
}

export default function MobileScheduleView({
  lessons,
  teachers,
  groups,
  students,
  rooms,
  selectedDate,
  viewMode,
  onLessonClick,
  unmarkedLessonIds = new Set(),
}: MobileScheduleViewProps) {
  // Filter lessons based on view mode
  const filteredLessons = lessons.filter((lesson) => {
    const lessonDate = moment.utc(lesson.start).local();
    if (viewMode === "day") {
      return lessonDate.isSame(selectedDate, "day");
    } else {
      // Week view
      const weekStart = moment(selectedDate).startOf('isoWeek');
      const weekEnd = moment(selectedDate).endOf('isoWeek');
      return lessonDate.isBetween(weekStart, weekEnd, 'day', '[]');
    }
  });

  // Sort lessons by start time
  const sortedLessons = filteredLessons.sort((a, b) => 
    moment(a.start).diff(moment(b.start))
  );

  // Group lessons by date for week view
  const lessonsByDate: Record<string, Lesson[]> = {};
  if (viewMode === "week") {
    sortedLessons.forEach((lesson) => {
      const dateKey = moment.utc(lesson.start).local().format('YYYY-MM-DD');
      if (!lessonsByDate[dateKey]) {
        lessonsByDate[dateKey] = [];
      }
      lessonsByDate[dateKey].push(lesson);
    });
  }

  const getTeacherName = (teacherId?: string) => {
    if (!teacherId) return "Не назначен";
    const teacher = teachers.find((t) => t.id === teacherId);
    return teacher?.name || "Не назначен";
  };

  const getGroupName = (groupId?: string) => {
    if (!groupId) return null;
    const group = groups.find((g) => g.id === groupId);
    return group?.name;
  };

  const getRoomName = (roomId?: string) => {
    if (!roomId) return null;
    const room = rooms.find((r) => r.id === roomId);
    return room?.name;
  };

  const getStudentName = (studentId?: string) => {
    if (!studentId) return null;
    const student = students.find((s) => s.id === studentId);
    return student?.name;
  };

  const getLessonStatusColor = (lesson: Lesson) => {
    if (lesson.status === "cancelled") {
      return "destructive";
    }
    if (unmarkedLessonIds.has(lesson.id)) {
      return "outline";
    }
    const now = moment();
    const lessonStart = moment(lesson.start);
    const lessonEnd = moment(lesson.end);
    
    if (lessonEnd.isBefore(now)) {
      return "secondary";
    }
    if (lessonStart.isBefore(now) && lessonEnd.isAfter(now)) {
      return "default";
    }
    return "outline";
  };

  const getLessonStatusText = (lesson: Lesson, short: boolean = false) => {
    if (lesson.status === "cancelled") {
      return short ? "Отм." : "Отменён";
    }
    if (unmarkedLessonIds.has(lesson.id)) {
      return short ? "Не отм." : "Не отмечен";
    }
    const now = moment();
    const lessonStart = moment(lesson.start);
    const lessonEnd = moment(lesson.end);
    
    if (lessonEnd.isBefore(now)) {
      return short ? "Завер." : "Завершён";
    }
    if (lessonStart.isBefore(now) && lessonEnd.isAfter(now)) {
      return "Сейчас";
    }
    return short ? "Запл." : "Запланирован";
  };

  const renderLesson = (lesson: Lesson) => {
    const groupName = getGroupName(lesson.groupId);
    const roomName = getRoomName(lesson.roomId);
    const studentName = getStudentName(lesson.studentId);
    const isCurrentLesson = moment().isBetween(moment(lesson.start), moment(lesson.end));

    return (
      <Card
        key={lesson.id}
        className={`cursor-pointer transition-all max-w-full ${
          isCurrentLesson ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'
        } ${lesson.status === "cancelled" ? 'opacity-60' : ''}`}
        onClick={() => onLessonClick?.(lesson)}
      >
        <CardContent className="p-4 max-w-full">
          <div className="space-y-3 max-w-full">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 max-w-full">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base truncate">{lesson.title}</h3>
                <p className="text-sm text-muted-foreground truncate">{lesson.subject}</p>
              </div>
              <Badge variant={getLessonStatusColor(lesson)} className="shrink-0 text-[10px] px-1.5 py-0.5 whitespace-nowrap">
                {getLessonStatusText(lesson, true)}
              </Badge>
            </div>

            {/* Time */}
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium whitespace-nowrap">
                {moment.utc(lesson.start).local().format("HH:mm")} - {moment.utc(lesson.end).local().format("HH:mm")}
              </span>
              <span className="text-muted-foreground whitespace-nowrap">
                ({moment.utc(lesson.end).diff(moment.utc(lesson.start), 'minutes')} мин)
              </span>
            </div>

            {/* Room */}
            {roomName && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="truncate">{roomName}</span>
              </div>
            )}

            {/* Group or Student */}
            {groupName ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                <Users className="h-4 w-4 shrink-0" />
                <span className="truncate">{groupName}</span>
              </div>
            ) : studentName ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                <User className="h-4 w-4 shrink-0" />
                <span className="truncate">{studentName}</span>
              </div>
            ) : null}

            {/* Teacher */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
              <User className="h-4 w-4 shrink-0" />
              <span className="truncate">{getTeacherName(lesson.teacherId)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (sortedLessons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Нет уроков</h3>
        <p className="text-sm text-muted-foreground">
          {viewMode === "day" 
            ? "На эту дату уроков не запланировано"
            : "На эту неделю уроков не запланировано"
          }
        </p>
      </div>
    );
  }

  // Day view - simple list
  if (viewMode === "day") {
    return (
      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="space-y-3 p-2 max-w-full">
          {sortedLessons.map(renderLesson)}
        </div>
      </ScrollArea>
    );
  }

  // Week view - grouped by date
  const weekStart = moment(selectedDate).startOf('isoWeek');
  const weekDays = Array.from({ length: 7 }, (_, i) => weekStart.clone().add(i, 'days'));

  return (
    <ScrollArea className="h-[calc(100vh-300px)]">
      <div className="space-y-4 p-2 max-w-full">
        {weekDays.map((day) => {
          const dateKey = day.format('YYYY-MM-DD');
          const dayLessons = lessonsByDate[dateKey] || [];
          const isToday = day.isSame(moment(), 'day');

          return (
            <div key={dateKey} className="space-y-2 max-w-full">
              <div className={`sticky top-0 z-10 bg-background py-2 ${isToday ? 'text-primary' : ''}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-sm capitalize truncate flex-1 min-w-0">
                    {day.format('dddd, D MMMM')}
                  </h3>
                  <Badge variant={isToday ? "default" : "outline"} className="text-xs shrink-0">
                    {dayLessons.length}
                  </Badge>
                </div>
              </div>
              
              {dayLessons.length > 0 ? (
                <div className="space-y-3 max-w-full">
                  {dayLessons.map(renderLesson)}
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground bg-muted/30 rounded-lg">
                  Нет уроков
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}


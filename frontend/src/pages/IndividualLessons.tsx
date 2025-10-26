import { useState } from "react";
import moment from "moment";
import "moment/locale/ru";
import { useIndividualLessons, useTeachers, useStudents, useRooms, useUpdateLesson, useDeleteLesson } from "@/hooks/useData";
import { LessonFormModal } from "@/components/LessonFormModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, User, Clock, MapPin, Edit, Trash2, CalendarDays, ChevronDown, ChevronUp } from "lucide-react";

moment.locale("ru");
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Lesson } from "@/types";
import { toast } from "sonner";

interface IndividualSchedule {
  id: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  dayOfWeek: number;
  timeFrom: string;
  timeTo: string;
  roomId?: string;
  roomName?: string;
  subject: string;
  lessons: Lesson[];
  upcomingCount: number;
  completedCount: number;
  nextLesson?: Lesson;
}

export default function IndividualLessons() {
  const { data: lessons = [], isLoading } = useIndividualLessons();
  const { data: teachers = [] } = useTeachers();
  const { data: students = [] } = useStudents();
  const { data: rooms = [] } = useRooms();
  const updateLesson = useUpdateLesson();
  const deleteLesson = useDeleteLesson();

  const [searchQuery, setSearchQuery] = useState("");
  const [isLessonFormOpen, setIsLessonFormOpen] = useState(false);
  const [lessonFormData, setLessonFormData] = useState<any>(null);
  const [lessonFormMode, setLessonFormMode] = useState<"create" | "edit">("create");
  const [deletingLesson, setDeletingLesson] = useState<Lesson | null>(null);
  const [expandedSchedules, setExpandedSchedules] = useState<Set<string>>(new Set());

  // Group lessons into schedules
  const groupLessonsIntoSchedules = (): IndividualSchedule[] => {
    const scheduleMap = new Map<string, IndividualSchedule>();

    lessons.forEach((lesson) => {
      const studentId = lesson.studentIds?.[0]; // Individual lessons have only one student
      if (!studentId) return;

      const student = students.find((s) => s.id === studentId);
      const teacher = teachers.find((t) => t.id === lesson.teacherId);
      const room = rooms.find((r) => r.id === lesson.roomId);
      
      if (!student || !teacher) return;

      const lessonDate = moment(lesson.start);
      const dayOfWeek = lessonDate.day();
      const timeFrom = lessonDate.format("HH:mm");
      const timeTo = moment(lesson.end).format("HH:mm");

      // Create unique key for this schedule pattern
      const scheduleKey = `${studentId}-${lesson.teacherId}-${dayOfWeek}-${timeFrom}-${timeTo}`;

      if (!scheduleMap.has(scheduleKey)) {
        scheduleMap.set(scheduleKey, {
          id: scheduleKey,
          studentId,
          studentName: student.name,
          teacherId: lesson.teacherId,
          teacherName: teacher.name,
          dayOfWeek,
          timeFrom,
          timeTo,
          roomId: lesson.roomId,
          roomName: room?.name,
          subject: lesson.subject || "Занятие",
          lessons: [],
          upcomingCount: 0,
          completedCount: 0,
        });
      }

      const schedule = scheduleMap.get(scheduleKey)!;
      schedule.lessons.push(lesson);

      if (moment(lesson.start).isAfter(moment())) {
        schedule.upcomingCount++;
        if (!schedule.nextLesson || moment(lesson.start).isBefore(moment(schedule.nextLesson.start))) {
          schedule.nextLesson = lesson;
        }
      }
      
      if (lesson.status === "completed") {
        schedule.completedCount++;
      }
    });

    return Array.from(scheduleMap.values());
  };

  const schedules = groupLessonsIntoSchedules();

  const filteredSchedules = schedules.filter((schedule) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      schedule.studentName.toLowerCase().includes(searchLower) ||
      schedule.teacherName.toLowerCase().includes(searchLower) ||
      schedule.subject.toLowerCase().includes(searchLower)
    );
  });

  const handleCreateLesson = () => {
    setLessonFormData({
      lessonType: "individual",
    });
    setLessonFormMode("create");
    setIsLessonFormOpen(true);
  };

  const handleEditLesson = (lesson: Lesson) => {
    setLessonFormData({
      ...lesson,
      date: lesson.start,
      startTime: moment(lesson.start).format("HH:mm"),
      endTime: moment(lesson.end).format("HH:mm"),
      lessonType: "individual",
    });
    setLessonFormMode("edit");
    setIsLessonFormOpen(true);
  };

  const handleDeleteLesson = async () => {
    if (!deletingLesson) return;
    
    try {
      await deleteLesson.mutateAsync(deletingLesson.id);
      toast.success("Занятие успешно удалено");
      setDeletingLesson(null);
    } catch (error) {
      toast.error("Ошибка при удалении занятия");
    }
  };

  // Calculate totals from schedules
  const totalUpcoming = filteredSchedules.reduce((sum, s) => sum + s.upcomingCount, 0);
  const totalCompleted = filteredSchedules.reduce((sum, s) => sum + s.completedCount, 0);
  const totalSchedules = filteredSchedules.length;

  const toggleScheduleExpand = (scheduleId: string) => {
    setExpandedSchedules((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(scheduleId)) {
        newSet.delete(scheduleId);
      } else {
        newSet.add(scheduleId);
      }
      return newSet;
    });
  };

  const getDayName = (dayOfWeek: number) => {
    const days = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
    return days[dayOfWeek];
  };

  const renderScheduleCard = (schedule: IndividualSchedule) => {
    const isExpanded = expandedSchedules.has(schedule.id);
    const upcomingLessons = schedule.lessons.filter((l) => moment(l.start).isAfter(moment()));
    const sortedUpcomingLessons = upcomingLessons.sort((a, b) => moment(a.start).diff(moment(b.start)));

    return (
      <Card key={schedule.id} className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{schedule.studentName}</h3>
              <p className="text-sm text-muted-foreground">{schedule.subject}</p>
            </div>
            <div className="flex gap-2">
              <Badge variant={schedule.upcomingCount > 0 ? "default" : "secondary"}>
                {schedule.upcomingCount > 0 ? "Активно" : "Завершено"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Schedule info */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-900 mb-2">
              <CalendarDays className="h-4 w-4" />
              <span>Расписание</span>
            </div>
            <p className="text-sm text-blue-800">
              {getDayName(schedule.dayOfWeek)} в {schedule.timeFrom} - {schedule.timeTo}
            </p>
          </div>

          {/* Teacher */}
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{schedule.teacherName}</span>
          </div>

          {/* Room */}
          {schedule.roomName && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{schedule.roomName}</span>
            </div>
          )}

          {/* Next lesson */}
          {schedule.nextLesson && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs font-medium text-green-900 mb-1">Ближайшее занятие:</p>
              <p className="text-sm text-green-800">
                {moment(schedule.nextLesson.start).format("DD MMMM, dddd")} в {moment(schedule.nextLesson.start).format("HH:mm")}
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="p-2 bg-orange-50 rounded text-center">
              <p className="text-xs text-muted-foreground">Запланировано</p>
              <p className="text-lg font-bold text-orange-900">{schedule.upcomingCount}</p>
            </div>
            <div className="p-2 bg-green-50 rounded text-center">
              <p className="text-xs text-muted-foreground">Проведено</p>
              <p className="text-lg font-bold text-green-900">{schedule.completedCount}</p>
            </div>
          </div>

          {/* Expand/Collapse lessons */}
          {upcomingLessons.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => toggleScheduleExpand(schedule.id)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Скрыть даты ({upcomingLessons.length})
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Показать даты ({upcomingLessons.length})
                </>
              )}
            </Button>
          )}

          {/* Expanded lesson list */}
          {isExpanded && (
            <div className="space-y-2 pt-2 border-t">
              {sortedUpcomingLessons.slice(0, 10).map((lesson) => (
                <div key={lesson.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm">
                    {moment(lesson.start).format("DD MMM")} в {moment(lesson.start).format("HH:mm")}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditLesson(lesson);
                      }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingLesson(lesson);
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              {upcomingLessons.length > 10 && (
                <p className="text-xs text-muted-foreground text-center">
                  и еще {upcomingLessons.length - 10} занятий...
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Загрузка занятий...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Индивидуальные занятия</h1>
          <p className="text-muted-foreground">Управление индивидуальными уроками</p>
        </div>
        <Button onClick={handleCreateLesson}>
          <Plus className="mr-2 h-4 w-4" />
          Создать занятие
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Поиск по названию, предмету, учителю или студенту..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <p className="text-sm text-muted-foreground">Расписаний</p>
            <p className="text-2xl font-bold">{totalSchedules}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <p className="text-sm text-muted-foreground">Запланировано уроков</p>
            <p className="text-2xl font-bold">{totalUpcoming}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <p className="text-sm text-muted-foreground">Проведено уроков</p>
            <p className="text-2xl font-bold">{totalCompleted}</p>
          </CardHeader>
        </Card>
      </div>

      {/* Schedules List */}
      {filteredSchedules.length > 0 ? (
        <div>
          <h2 className="text-xl font-semibold mb-4">Индивидуальные расписания</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSchedules.map(renderScheduleCard)}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Нет индивидуальных занятий</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery
              ? "По вашему запросу ничего не найдено"
              : "Создайте первое индивидуальное занятие"}
          </p>
          {!searchQuery && (
            <Button onClick={handleCreateLesson}>
              <Plus className="mr-2 h-4 w-4" />
              Создать занятие
            </Button>
          )}
        </div>
      )}

      {/* Lesson Form Modal */}
      <LessonFormModal
        open={isLessonFormOpen}
        onOpenChange={setIsLessonFormOpen}
        teachers={teachers}
        groups={[]}
        rooms={rooms}
        students={students}
        initialData={lessonFormData}
        mode={lessonFormMode}
        allowLessonTypeChange={false}
        onSuccess={() => {
          setLessonFormData(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingLesson} onOpenChange={() => setDeletingLesson(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить занятие?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить это занятие? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLesson} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import "moment/locale/ru";

import { useLessons, useDeleteLesson, useUpdateLesson, useTeachers, useGroups, useRooms, useCreateRoom, useStudents, useMarkAttendance } from "@/hooks/useData";
import { useLessonAttendances } from "@/hooks/useLessonAttendances";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Loader2, Trash2, ChevronLeft, ChevronRight, Building2, Calendar, CalendarDays, CalendarRange, CheckCircle2, XCircle, Clock, Edit, ClipboardCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import RoomScheduleView from "@/components/RoomScheduleView";
import WeekScheduleView from "@/components/WeekScheduleView";
import MonthScheduleView from "@/components/MonthScheduleView";
import { LessonFormModal } from "@/components/LessonFormModal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lesson } from "@/types";
import { toast } from "sonner";

moment.locale("ru");

export default function Schedule() {
  const navigate = useNavigate();
  const { data: lessons = [], isLoading } = useLessons();
  const { data: teachers = [] } = useTeachers();
  const { data: groups = [] } = useGroups();
  const { data: rooms = [] } = useRooms();
  const { data: students = [] } = useStudents();
  const deleteLesson = useDeleteLesson();
  const updateLesson = useUpdateLesson();
  const createRoom = useCreateRoom();
  const markAttendance = useMarkAttendance();
  
  const [isLessonFormOpen, setIsLessonFormOpen] = useState(false);
  const [lessonFormData, setLessonFormData] = useState<any>(null);
  const [lessonFormMode, setLessonFormMode] = useState<"create" | "edit">("create");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("day");
  const [attendanceData, setAttendanceData] = useState<Record<string, { status: string; reason: string; notes: string }>>({});
  
  // Get all passed lessons that need attendance check
  const passedLessonIds = useMemo(() => {
    const now = moment();
    return lessons
      .filter((lesson) => {
        const lessonStart = moment(lesson.start);
        return lessonStart.isBefore(now) && lesson.status !== "cancelled";
      })
      .map((lesson) => lesson.id);
  }, [lessons]);

  // Fetch attendances for all passed lessons
  const { data: attendancesMap = new Map() } = useLessonAttendances(passedLessonIds);

  // Check which lessons are unmarked
  // A lesson is unmarked if it has passed but attendance isn't complete for all students
  const unmarkedLessonIds = useMemo(() => {
    const now = moment();
    const unmarked = new Set<string>();
    
    lessons.forEach((lesson) => {
      const lessonStart = moment(lesson.start);
      
      // Only check lessons that have passed and are not cancelled
      if (lessonStart.isAfter(now) || lesson.status === "cancelled") {
        return;
      }
      
      // Get all students for this lesson
      let lessonStudentIds: string[] = [];
      if (lesson.studentIds && lesson.studentIds.length > 0) {
        lessonStudentIds = [...lesson.studentIds];
      }
      if (lesson.groupId) {
        const group = groups.find((g) => g.id === lesson.groupId);
        if (group && group.studentIds) {
          lessonStudentIds = [...new Set([...lessonStudentIds, ...group.studentIds])];
        }
      }
      
      // If lesson has students, check if attendance is marked for all
      if (lessonStudentIds.length > 0) {
        const attendances = attendancesMap.get(lesson.id) || [];
        const markedStudentIds = new Set(attendances.map((a) => a.studentId));
        const allMarked = lessonStudentIds.every((studentId) => markedStudentIds.has(studentId));
        
        if (!allMarked) {
          unmarked.add(lesson.id);
        }
      }
    });
    
    return unmarked;
  }, [lessons, groups, attendancesMap]);

  const handleSlotClick = (start: Date, end: Date, roomId: string) => {
    setLessonFormData({
      date: start,
      startTime: moment(start).format("HH:mm"),
      endTime: moment(end).format("HH:mm"),
      roomId,
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
    });
    setLessonFormMode("edit");
    setIsLessonFormOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedLesson) return;

    try {
      await deleteLesson.mutateAsync(selectedLesson.id);
      setIsDeleteDialogOpen(false);
      setSelectedLesson(null);
      toast.success("Урок удален");
    } catch (error) {
      toast.error("Ошибка при удалении урока");
    }
  };


  const handleLessonUpdate = async (lessonId: string, updates: { start: Date; end: Date; roomId?: string }) => {
    try {
      // Find the original lesson to get all its data
      const originalLesson = lessons.find(l => l.id === lessonId);
      if (!originalLesson) {
        toast.error("Урок не найден");
        return;
      }

      // Send full lesson object with updated fields
      await updateLesson.mutateAsync({
        id: lessonId,
        data: {
          ...originalLesson,
          start: updates.start,
          end: updates.end,
          roomId: updates.roomId || originalLesson.roomId,
        },
      });
      toast.success("Урок обновлен");
    } catch (error) {
      console.error("Error updating lesson:", error);
      toast.error("Ошибка при обновлении урока");
    }
  };

  const handleCancelLesson = async (lesson: Lesson) => {
    try {
      await updateLesson.mutateAsync({ id: lesson.id, data: { ...lesson, status: "cancelled" as any } });
      toast.success("Урок отменен");
    } catch {
      toast.error("Не удалось отменить урок");
    }
  };

  const handleResumeLesson = async (lesson: Lesson) => {
    try {
      await updateLesson.mutateAsync({ id: lesson.id, data: { ...lesson, status: "scheduled" as any } });
      toast.success("Урок возобновлен");
    } catch {
      toast.error("Не удалось возобновить урок");
    }
  };

  const openAttendanceForLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    const initialData: Record<string, { status: string; reason: string; notes: string }> = {};
    let lessonStudentIds: string[] = [];
    if (lesson.groupId) {
      const group = groups.find(g => g.id === lesson.groupId);
      if (group) {
        lessonStudentIds = group.studentIds || [];
      }
    }
    lessonStudentIds = [...new Set([...lessonStudentIds, ...(lesson.studentIds || [])])];
    lessonStudentIds.forEach(studentId => {
      initialData[studentId] = { status: "attended", reason: "", notes: "" };
    });
    setAttendanceData(initialData);
    setIsAttendanceDialogOpen(true);
  };

  const handleOpenAttendance = () => {
    if (!selectedLesson) return;
    // Guard: allow opening only from lesson start time
    const now = moment();
    const lessonStart = moment.utc(selectedLesson.start).local();
    if (now.isBefore(lessonStart)) {
      toast.warning("Отметка доступна только после начала урока");
      return;
    }
    
    // Initialize attendance data for all students in the lesson
    const initialData: Record<string, { status: string; reason: string; notes: string }> = {};
    
    // Get students from group or lesson
    let lessonStudentIds: string[] = [];
    if (selectedLesson.groupId) {
      const group = groups.find(g => g.id === selectedLesson.groupId);
      if (group) {
        lessonStudentIds = group.studentIds || [];
      }
    }
    lessonStudentIds = [...new Set([...lessonStudentIds, ...(selectedLesson.studentIds || [])])];
    
    lessonStudentIds.forEach(studentId => {
      initialData[studentId] = { status: "attended", reason: "", notes: "" };
    });
    
    setAttendanceData(initialData);
    setIsAttendanceDialogOpen(true);
  };

  const handlePrevious = () => {
    let newDate: Date;
    if (viewMode === "day") {
      newDate = moment(selectedDate).subtract(1, "day").toDate();
    } else if (viewMode === "week") {
      newDate = moment(selectedDate).subtract(1, "week").toDate();
    } else {
      newDate = moment(selectedDate).subtract(1, "month").toDate();
    }
    setSelectedDate(newDate);
  };

  const handleNext = () => {
    let newDate: Date;
    if (viewMode === "day") {
      newDate = moment(selectedDate).add(1, "day").toDate();
    } else if (viewMode === "week") {
      newDate = moment(selectedDate).add(1, "week").toDate();
    } else {
      newDate = moment(selectedDate).add(1, "month").toDate();
    }
    setSelectedDate(newDate);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const getDateRangeText = () => {
    if (viewMode === "day") {
      return moment(selectedDate).format("D MMMM YYYY, dddd");
    } else if (viewMode === "week") {
      const weekStart = moment(selectedDate).startOf('isoWeek');
      const weekEnd = moment(selectedDate).endOf('isoWeek');
      return `${weekStart.format("D MMM")} - ${weekEnd.format("D MMM YYYY")}`;
    } else {
      return moment(selectedDate).format("MMMM YYYY");
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setViewMode("day");
  };

  const handleRoomSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const roomData = {
      name: formData.get("name") as string,
      capacity: parseInt(formData.get("capacity") as string),
      color: formData.get("color") as string,
      status: (formData.get("status") as "active" | "inactive") || "active",
    };

    try {
      await createRoom.mutateAsync(roomData);
      setIsRoomDialogOpen(false);
      toast.success("Аудитория создана");
    } catch (error) {
      toast.error("Ошибка при создании аудитории");
    }
  };

  const handleAttendanceSubmit = async () => {
    if (!selectedLesson) return;

    try {
      // Mark attendance for all students
      const promises = Object.entries(attendanceData).map(([studentId, data]) => {
        return markAttendance.mutateAsync({
          lessonId: selectedLesson.id,
          studentId,
          status: data.status as any,
          reason: data.reason || undefined,
          notes: data.notes || undefined,
        } as any);
      });

      await Promise.all(promises);
      setIsAttendanceDialogOpen(false);
      setSelectedLesson(null);
      setAttendanceData({});
      toast.success("Посещаемость отмечена");
    } catch (error) {
      toast.error("Ошибка при отметке посещаемости");
    }
  };

  const updateAttendanceStatus = (studentId: string, status: string) => {
    setAttendanceData(prev => {
      const prevEntry = prev[studentId] || { status: "attended", reason: "", notes: "" };
      // If switching to missed and reason is empty, default to 'unexcused'
      const nextReason = status === "missed" ? (prevEntry.reason || "unexcused") : prevEntry.reason;
      return {
        ...prev,
        [studentId]: {
          ...prevEntry,
          status,
          reason: nextReason,
        },
      };
    });
  };

  const updateAttendanceReason = (studentId: string, reason: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        reason,
      },
    }));
  };

  const updateAttendanceNotes = (studentId: string, notes: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        notes,
      },
    }));
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up min-w-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Расписание по аудиториям</h1>
          <p className="text-muted-foreground">
            Кликните на временной слот для создания урока
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Building2 className="mr-2 h-4 w-4" />
                Добавить аудиторию
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Новая аудитория</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleRoomSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="room-name">Название</Label>
                  <Input
                    id="room-name"
                    name="name"
                    required
                    placeholder="Например: Аудитория 101"
                  />
                </div>
                <div>
                  <Label htmlFor="room-capacity">Вместимость</Label>
                  <Input
                    id="room-capacity"
                    name="capacity"
                    type="number"
                    min="1"
                    defaultValue={10}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="room-color">Цвет</Label>
                  <div className="flex gap-2">
                    <Input
                      id="room-color"
                      name="color"
                      type="color"
                      defaultValue="#8B5CF6"
                      className="w-20 h-10"
                    />
                    <span className="text-sm text-muted-foreground flex items-center">
                      Цвет для визуального отображения
                    </span>
                  </div>
                </div>
                <div>
                  <Label htmlFor="room-status">Статус</Label>
                  <Select name="status" defaultValue="active">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Активна</SelectItem>
                      <SelectItem value="inactive">Неактивна</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  Создать аудиторию
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          
          <Button onClick={() => {
            setLessonFormData({});
            setLessonFormMode("create");
            setIsLessonFormOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить урок
          </Button>
        </div>
      </div>

      {/* View Mode and Date Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            Сегодня
          </Button>
          <Button variant="outline" size="sm" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <h3 className="text-lg font-semibold">
          {getDateRangeText()}
        </h3>
        
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "day" | "week" | "month")}>
          <TabsList>
            <TabsTrigger value="day" className="gap-2">
              <Calendar className="h-4 w-4" />
              День
            </TabsTrigger>
            <TabsTrigger value="week" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Неделя
            </TabsTrigger>
            <TabsTrigger value="month" className="gap-2">
              <CalendarRange className="h-4 w-4" />
              Месяц
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card className="min-w-0 w-full overflow-hidden">
        <CardHeader>
          <CardTitle>
            {viewMode === "day" && "Расписание по аудиториям"}
            {viewMode === "week" && "Расписание на неделю"}
            {viewMode === "month" && "Календарь на месяц"}
          </CardTitle>
        </CardHeader>
        <CardContent className="min-w-0 w-full p-0 sm:p-6">
          {viewMode === "day" && (
            <RoomScheduleView
              rooms={rooms}
              lessons={lessons}
              teachers={teachers}
              groups={groups}
              students={students}
              selectedDate={selectedDate}
              onLessonClick={handleEditLesson}
              onSlotClick={handleSlotClick}
              onLessonUpdate={handleLessonUpdate}
              onCancelLesson={handleCancelLesson}
              onResumeLesson={handleResumeLesson}
              onOpenAttendance={openAttendanceForLesson}
              unmarkedLessonIds={unmarkedLessonIds}
            />
          )}
          {viewMode === "week" && (
            <WeekScheduleView
              rooms={rooms}
              lessons={lessons}
              teachers={teachers}
              groups={groups}
              students={students}
              selectedDate={selectedDate}
              unmarkedLessonIds={unmarkedLessonIds}
              onLessonClick={handleEditLesson}
              onSlotClick={handleSlotClick}
              onLessonUpdate={handleLessonUpdate}
            />
          )}
          {viewMode === "month" && (
            <MonthScheduleView
              lessons={lessons}
              groups={groups}
              selectedDate={selectedDate}
              onDateClick={handleDateClick}
            />
          )}
        </CardContent>
      </Card>


      {/* Lesson Form Modal */}
      <LessonFormModal
        open={isLessonFormOpen}
        onOpenChange={setIsLessonFormOpen}
        teachers={teachers}
        groups={groups}
        rooms={rooms}
        students={students}
        initialData={lessonFormData}
        mode={lessonFormMode}
        onSuccess={() => {
          setLessonFormData(null);
        }}
      />


      {/* Attendance Dialog */}
      <Dialog open={isAttendanceDialogOpen} onOpenChange={setIsAttendanceDialogOpen}>
        <DialogContent className="sm:max-w-3xl w-[95vw] overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>
              Отметка посещаемости: {selectedLesson?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedLesson && (
            <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
              <div className="bg-muted p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Дата:</span>{" "}
                    <span className="font-medium">{moment.utc(selectedLesson.start).local().format("DD.MM.YYYY")}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Время:</span>{" "}
                    <span className="font-medium">
                      {moment.utc(selectedLesson.start).local().format("HH:mm")} - {moment.utc(selectedLesson.end).local().format("HH:mm")}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Предмет:</span>{" "}
                    <span className="font-medium">{selectedLesson.subject}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Преподаватель:</span>{" "}
                    <span className="font-medium">
                      {selectedLesson.teacherName}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">Ученики ({Object.keys(attendanceData).length})</h3>
                {Object.keys(attendanceData).length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Нет учеников в этом уроке. Добавьте группу к уроку или добавьте учеников вручную.
                  </p>
                ) : (
                  Object.keys(attendanceData).map((studentId) => {
                    const student = students.find(s => s.id === studentId);
                    if (!student) return null;

                    const data = attendanceData[studentId];

                    return (
                      <Card key={studentId} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                                {student.name.charAt(0)}
                              </div>
                              <div>
                                <h4 className="font-medium">{student.name}</h4>
                                <p className="text-xs text-muted-foreground">{student.email}</p>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <Button
                              variant={data.status === "attended" ? "default" : "outline"}
                              size="sm"
                              onClick={() => updateAttendanceStatus(studentId, "attended")}
                              className="w-full"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Присутствовал
                            </Button>
                            <Button
                              variant={data.status === "missed" ? "destructive" : "outline"}
                              size="sm"
                              onClick={() => updateAttendanceStatus(studentId, "missed")}
                              className="w-full"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Отсутствовал
                            </Button>
                            <Button
                              variant={data.status === "cancelled" ? "secondary" : "outline"}
                              size="sm"
                              onClick={() => updateAttendanceStatus(studentId, "cancelled")}
                              className="w-full"
                            >
                              <Clock className="h-4 w-4 mr-2" />
                              Отменен
                            </Button>
                          </div>

                          {data.status === "missed" && (
                            <div className="space-y-2">
                              <Label htmlFor={`reason-${studentId}`}>Причина пропуска</Label>
                              <Select
                                defaultValue={data.reason || "unexcused"}
                                onValueChange={(v) => updateAttendanceReason(studentId, v)}
                              >
                                <SelectTrigger id={`reason-${studentId}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="excused">Уважительная причина (без списания)</SelectItem>
                                  <SelectItem value="unexcused">Неуважительная причина (спишется 1 занятие)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label htmlFor={`notes-${studentId}`}>Заметки (опционально)</Label>
                            <Textarea
                              id={`notes-${studentId}`}
                              placeholder="Дополнительные заметки..."
                              value={data.notes}
                              onChange={(e) => updateAttendanceNotes(studentId, e.target.value)}
                              rows={2}
                            />
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAttendanceDialogOpen(false);
                    setSelectedLesson(null);
                    setAttendanceData({});
                  }}
                >
                  Отмена
                </Button>
                <Button
                  onClick={handleAttendanceSubmit}
                  disabled={Object.keys(attendanceData).length === 0 || markAttendance.isPending}
                >
                  {markAttendance.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    "Сохранить посещаемость"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Урок "{selectedLesson?.title}" будет удален навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

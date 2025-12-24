import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import moment from "moment";
import "moment/locale/ru";
import { useTeachers, useTeacherLessons, useGroups, useRooms, useStudents, useUpdateTeacher, useDeleteTeacher } from "@/hooks/useData";
import { LessonFormModal } from "@/components/LessonFormModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Mail, Phone, Plus, Loader2, Calendar, List, Edit, Trash2, Clock, Users, MapPin } from "lucide-react";
import { Lesson } from "@/types";
import { toast } from "sonner";
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

moment.locale("ru");

export default function TeacherDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: teachers = [] } = useTeachers();
  const { data: groups = [] } = useGroups();
  const { data: rooms = [] } = useRooms();
  const { data: students = [] } = useStudents();

  const teacher = teachers.find((t) => t.id === id);

  // Get lessons for current and next month
  const startDate = moment().startOf("month").format("YYYY-MM-DD");
  const endDate = moment().add(1, "month").endOf("month").format("YYYY-MM-DD");
  const { data: lessons = [], isLoading } = useTeacherLessons(id || "", startDate, endDate);

  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [selectedWeek, setSelectedWeek] = useState(moment());
  const [isLessonFormOpen, setIsLessonFormOpen] = useState(false);
  const [lessonFormData, setLessonFormData] = useState<any>(null);
  const [lessonFormMode, setLessonFormMode] = useState<"create" | "edit">("create");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const updateTeacher = useUpdateTeacher();
  const deleteTeacher = useDeleteTeacher();

  if (!teacher) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Учитель не найден</h2>
          <Button onClick={() => navigate("/teachers")} className="mt-4">
            Вернуться к списку
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleCreateLesson = () => {
    setLessonFormData({
      teacherId: teacher.id,
      subject: teacher.subject,
      date: moment().format("YYYY-MM-DD"),
      startTime: "10:00",
      endTime: "11:30",
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

  const handlePreviousWeek = () => {
    setSelectedWeek(moment(selectedWeek).subtract(1, "week"));
  };

  const handleNextWeek = () => {
    setSelectedWeek(moment(selectedWeek).add(1, "week"));
  };

  const handleToday = () => {
    setSelectedWeek(moment());
  };

  const handleEditTeacher = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!teacher) return;

    const formData = new FormData(e.currentTarget);
    const teacherData = {
      name: formData.get("name") as string,
      subject: formData.get("subject") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      status: formData.get("status") as "active" | "inactive",
      workload: parseInt(formData.get("workload") as string),
    };

    try {
      await updateTeacher.mutateAsync({ id: teacher.id, data: teacherData });
      setIsEditDialogOpen(false);
      toast.success("Учитель обновлен");
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeleteTeacher = async () => {
    if (!teacher) return;

    try {
      await deleteTeacher.mutateAsync(teacher.id);
      toast.success("Учитель удален");
      navigate("/teachers");
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Calculate statistics
  const completedLessons = lessons.filter((l) => l.status === "completed").length;
  const scheduledLessons = lessons.filter((l) => l.status === "scheduled").length;
  const totalLessons = lessons.length;
  const completionRate = totalLessons > 0 ? ((completedLessons / totalLessons) * 100).toFixed(1) : "0";

  // Calculate workload for current week
  const currentWeekStart = moment().startOf("isoWeek");
  const currentWeekEnd = moment().endOf("isoWeek");
  const currentWeekLessons = lessons.filter((l) => {
    const lessonDate = moment(l.start);
    return lessonDate.isBetween(currentWeekStart, currentWeekEnd, null, "[]");
  });
  const currentWeekHours = currentWeekLessons.reduce((total, lesson) => {
    const duration = moment(lesson.end).diff(moment(lesson.start), "hours", true);
    return total + duration;
  }, 0).toFixed(1);

  // Get lessons for selected week (calendar view)
  const weekStart = moment(selectedWeek).startOf("isoWeek");
  const weekEnd = moment(selectedWeek).endOf("isoWeek");
  const weekLessons = lessons.filter((l) => {
    const lessonDate = moment(l.start);
    return lessonDate.isBetween(weekStart, weekEnd, null, "[]");
  });

  // Group lessons by day
  const lessonsByDay: Record<string, Lesson[]> = {};
  for (let i = 0; i < 7; i++) {
    const day = weekStart.clone().add(i, "days").format("YYYY-MM-DD");
    lessonsByDay[day] = weekLessons.filter((l) => moment(l.start).format("YYYY-MM-DD") === day);
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-2 sm:gap-4 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate("/teachers")} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">{teacher.name}</h1>
            <p className="text-sm sm:text-base text-muted-foreground truncate">{teacher.subject}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Badge variant={teacher.status === "active" ? "default" : "secondary"} className="shrink-0">
            {teacher.status === "active" ? "Активен" : "Неактивен"}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsEditDialogOpen(true)}
            className="sm:size-default"
          >
            <Edit className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Редактировать</span>
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => setIsDeleteDialogOpen(true)}
            className="sm:size-default"
          >
            <Trash2 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Удалить</span>
          </Button>
          <Button 
            size="sm" 
            onClick={handleCreateLesson}
            className="sm:size-default w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Создать урок</span>
            <span className="sm:hidden">Урок</span>
          </Button>
        </div>
      </div>

      {/* Teacher Info */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Контактная информация</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">{teacher.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">{teacher.phone}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Статистика уроков</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Всего уроков:</span>
              <span className="font-medium">{totalLessons}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Проведено:</span>
              <span className="font-medium">{completedLessons}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Запланировано:</span>
              <span className="font-medium">{scheduledLessons}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Загруженность</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {currentWeekHours}
              <span className="text-sm font-normal text-muted-foreground ml-1">ч/нед</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Текущая неделя</p>
            <p className="text-sm text-muted-foreground mt-2">
              Плановая: {teacher.workload} ч/нед
            </p>
            <p className="text-sm text-muted-foreground">Процент выполнения: {completionRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Расписание</CardTitle>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
              <TabsList>
                <TabsTrigger value="calendar" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  Календарь
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-2">
                  <List className="h-4 w-4" />
                  Список
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={viewMode}>
            {/* Calendar View */}
            <TabsContent value="calendar" className="space-y-4">
              {/* Week Navigation */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={handlePreviousWeek}>
                    <span className="hidden sm:inline">Предыдущая</span>
                    <span className="sm:hidden">Пред.</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleToday}>
                    Сегодня
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleNextWeek}>
                    <span className="hidden sm:inline">Следующая</span>
                    <span className="sm:hidden">След.</span>
                  </Button>
                </div>
                <h3 className="text-sm font-medium text-center sm:text-right">
                  {weekStart.format("D MMM")} - {weekEnd.format("D MMM YYYY")}
                </h3>
              </div>

              {/* Week Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                {Array.from({ length: 7 }, (_, i) => {
                  const day = weekStart.clone().add(i, "days");
                  const dayKey = day.format("YYYY-MM-DD");
                  const dayLessons = lessonsByDay[dayKey] || [];
                  const isToday = day.isSame(moment(), "day");

                  return (
                    <div key={dayKey} className={`border rounded-lg p-2 min-h-[120px] sm:min-h-[150px] ${isToday ? "bg-blue-50 border-blue-200" : ""}`}>
                      <div className="text-center mb-2">
                        <div className="text-[10px] sm:text-xs text-muted-foreground">{day.format("dd")}</div>
                        <div className={`text-xs sm:text-sm font-medium ${isToday ? "text-blue-600" : ""}`}>{day.format("D")}</div>
                        <div className="text-[9px] sm:text-xs text-muted-foreground hidden sm:block">{day.format("MMM")}</div>
                      </div>
                      <div className="space-y-1">
                        {dayLessons.slice(0, 3).map((lesson) => {
                          const group = groups.find((g) => g.id === lesson.groupId);
                          return (
                            <div
                              key={lesson.id}
                              onClick={() => handleEditLesson(lesson)}
                              className="text-[9px] sm:text-xs p-0.5 sm:p-1 rounded bg-primary/10 hover:bg-primary/20 cursor-pointer transition-colors"
                            >
                              <div className="font-medium truncate">
                                {group?.name || lesson.title}
                              </div>
                              <div className="text-muted-foreground truncate">
                                {moment(lesson.start).format("HH:mm")}
                              </div>
                            </div>
                          );
                        })}
                        {dayLessons.length > 3 && (
                          <div className="text-[9px] sm:text-xs text-muted-foreground text-center">
                            +{dayLessons.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* List View */}
            <TabsContent value="list">
              {/* Mobile View - Cards */}
              <div className="md:hidden space-y-3">
                {lessons.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    Уроков не найдено
                  </div>
                ) : (
                  lessons
                    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                    .map((lesson) => {
                      const group = groups.find((g) => g.id === lesson.groupId);
                      const room = rooms.find((r) => r.id === lesson.roomId);

                      return (
                        <Card key={lesson.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleEditLesson(lesson)}>
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm truncate">{lesson.title}</div>
                                <div className="text-xs text-muted-foreground">{moment(lesson.start).format("DD.MM.YYYY, dddd")}</div>
                              </div>
                              <Badge variant={lesson.status === "completed" ? "secondary" : "default"} className="shrink-0 text-[10px]">
                                {lesson.status === "completed" ? "Завер." : "Запл."}
                              </Badge>
                            </div>
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-3 w-3 shrink-0" />
                                <span>{moment(lesson.start).format("HH:mm")} - {moment(lesson.end).format("HH:mm")}</span>
                              </div>
                              {group && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Users className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{group.name}</span>
                                </div>
                              )}
                              {room && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{room.name}</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                )}
              </div>

              {/* Desktop View - Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата</TableHead>
                      <TableHead>Время</TableHead>
                      <TableHead>Название</TableHead>
                      <TableHead>Группа</TableHead>
                      <TableHead>Аудитория</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lessons.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          Уроков не найдено
                        </TableCell>
                      </TableRow>
                    ) : (
                      lessons
                        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                        .map((lesson) => {
                          const group = groups.find((g) => g.id === lesson.groupId);
                          const room = rooms.find((r) => r.id === lesson.roomId);

                        return (
                          <TableRow key={lesson.id}>
                            <TableCell>{moment(lesson.start).format("DD.MM.YYYY, dddd")}</TableCell>
                            <TableCell>
                              {moment(lesson.start).format("HH:mm")} - {moment(lesson.end).format("HH:mm")}
                            </TableCell>
                            <TableCell className="font-medium">{lesson.title}</TableCell>
                            <TableCell>{group?.name || "Индивидуальное"}</TableCell>
                            <TableCell>{room?.name || lesson.room}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  lesson.status === "completed"
                                    ? "default"
                                    : lesson.status === "cancelled"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {lesson.status === "completed"
                                  ? "Проведен"
                                  : lesson.status === "cancelled"
                                  ? "Отменен"
                                  : "Запланирован"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditLesson(lesson)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
              </div>
            </TabsContent>
          </Tabs>
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

      {/* Edit Teacher Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать учителя</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditTeacher} className="space-y-4">
            <div>
              <Label htmlFor="name">ФИО</Label>
              <Input
                id="name"
                name="name"
                defaultValue={teacher.name}
                required
              />
            </div>
            <div>
              <Label htmlFor="subject">Предмет</Label>
              <Input
                id="subject"
                name="subject"
                defaultValue={teacher.subject}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={teacher.email}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={teacher.phone}
                required
              />
            </div>
            <div>
              <Label htmlFor="status">Статус</Label>
              <Select name="status" defaultValue={teacher.status}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Активный</SelectItem>
                  <SelectItem value="inactive">Неактивный</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="workload">Загруженность (уроков/нед.)</Label>
              <Input
                id="workload"
                name="workload"
                type="number"
                defaultValue={teacher.workload}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Отмена
              </Button>
              <Button type="submit">Сохранить</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Учитель "{teacher.name}" будет удален навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTeacher} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


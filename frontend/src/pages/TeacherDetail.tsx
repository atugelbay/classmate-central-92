import { useState, useMemo, useEffect } from "react";
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
  DialogFooter,
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
import { ArrowLeft, Mail, Phone, Plus, Loader2, Calendar, List, Edit, Trash2, Clock, Users, MapPin, DollarSign, Calculator } from "lucide-react";
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

  // Get lessons for extended period (3 months back, 3 months forward) to support salary calculation
  const startDate = moment().subtract(3, "month").startOf("month").format("YYYY-MM-DD");
  const endDate = moment().add(3, "month").endOf("month").format("YYYY-MM-DD");
  const { data: lessons = [], isLoading } = useTeacherLessons(id || "", startDate, endDate);

  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [selectedWeek, setSelectedWeek] = useState(moment());
  const [isLessonFormOpen, setIsLessonFormOpen] = useState(false);
  const [lessonFormData, setLessonFormData] = useState<any>(null);
  const [lessonFormMode, setLessonFormMode] = useState<"create" | "edit">("create");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSalaryCalcOpen, setIsSalaryCalcOpen] = useState(false);
  const [salaryPeriodStart, setSalaryPeriodStart] = useState<string>(moment().startOf("month").format("YYYY-MM-DD"));
  const [salaryPeriodEnd, setSalaryPeriodEnd] = useState<string>(moment().endOf("month").format("YYYY-MM-DD"));
  const [editRateType, setEditRateType] = useState<string>("");

  const updateTeacher = useUpdateTeacher();
  const deleteTeacher = useDeleteTeacher();

  // Update editRateType when teacher changes or dialog opens
  useEffect(() => {
    if (teacher) {
      setEditRateType(teacher.rateType || "none");
    }
  }, [teacher]);

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
    const hourlyRateStr = formData.get("hourlyRate") as string;
    const lessonRateStr = formData.get("lessonRate") as string;
    
    // Get all form fields - include required fields
    const teacherData: any = {
      name: formData.get("name") as string || teacher.name,
      subject: formData.get("subject") as string || teacher.subject,
      email: formData.get("email") as string || teacher.email,
      phone: formData.get("phone") as string || teacher.phone,
      status: (formData.get("status") as "active" | "inactive") || teacher.status,
      workload: parseInt(formData.get("workload") as string) || teacher.workload,
    };

    // Add rate fields based on selected rateType (from state, not form)
    const rateTypeValue = editRateType === "none" ? "" : editRateType;
    if (rateTypeValue && rateTypeValue.trim() !== "") {
      teacherData.rateType = rateTypeValue;
      if (rateTypeValue === "hourly") {
        // Set hourly rate if provided
        if (hourlyRateStr && hourlyRateStr.trim() !== "") {
          teacherData.hourlyRate = parseFloat(hourlyRateStr);
        }
        // Explicitly clear lesson rate when using hourly
        teacherData.lessonRate = null;
      } else if (rateTypeValue === "per_lesson") {
        // Set lesson rate if provided
        if (lessonRateStr && lessonRateStr.trim() !== "") {
          teacherData.lessonRate = parseFloat(lessonRateStr);
        }
        // Explicitly clear hourly rate when using per_lesson
        teacherData.hourlyRate = null;
      }
    } else {
      // No rate type selected - clear all rate fields by sending empty string
      teacherData.rateType = "";
      teacherData.hourlyRate = null;
      teacherData.lessonRate = null;
    }

    try {
      await updateTeacher.mutateAsync({ id: teacher.id, data: teacherData });
      setIsEditDialogOpen(false);
      // toast is shown by mutation hook
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

  // Calculate workload for selected week (dynamic based on selectedWeek)
  const selectedWeekStart = moment(selectedWeek).startOf("isoWeek");
  const selectedWeekEnd = moment(selectedWeek).endOf("isoWeek");
  const selectedWeekLessons = lessons.filter((l) => {
    const lessonDate = moment(l.start);
    return lessonDate.isBetween(selectedWeekStart, selectedWeekEnd, null, "[]");
  });
  const selectedWeekHours = selectedWeekLessons.reduce((total, lesson) => {
    const duration = moment(lesson.end).diff(moment(lesson.start), "hours", true);
    return total + duration;
  }, 0).toFixed(1);
  const selectedWeekLessonsCount = selectedWeekLessons.length;

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
          {teacher && teacher.rateType && (teacher.hourlyRate || teacher.lessonRate) && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsSalaryCalcOpen(true)}
              className="sm:size-default"
            >
              <Calculator className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Зарплата</span>
            </Button>
          )}
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
              {selectedWeekHours}
              <span className="text-sm font-normal text-muted-foreground ml-1">ч/нед</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {weekStart.format("D MMM")} - {weekEnd.format("D MMM YYYY")}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {selectedWeekLessonsCount} {selectedWeekLessonsCount === 1 ? 'урок' : selectedWeekLessonsCount < 5 ? 'урока' : 'уроков'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Плановая: {teacher.workload} ч/нед
            </p>
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
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (open && teacher) {
          setEditRateType(teacher.rateType || "none");
        }
      }}>
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
              <Label htmlFor="workload">Плановая загруженность (часов/нед.)</Label>
              <Input
                id="workload"
                name="workload"
                type="number"
                defaultValue={teacher.workload}
                required
              />
            </div>
            <div className="space-y-2 border-t pt-4">
              <Label className="text-sm font-semibold">Настройки зарплаты</Label>
              <div>
                <Label htmlFor="rateType">Тип ставки</Label>
                <Select value={editRateType === "" || !editRateType ? "none" : editRateType} onValueChange={(value) => setEditRateType(value === "none" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Не указано" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не указано</SelectItem>
                    <SelectItem value="hourly">Почасовая ставка</SelectItem>
                    <SelectItem value="per_lesson">Поурочная ставка</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="hourlyRate">Почасовая ставка (₸/час)</Label>
                <Input
                  id="hourlyRate"
                  name="hourlyRate"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={teacher.hourlyRate?.toString() || ""}
                  disabled={editRateType !== "hourly"}
                  placeholder="Например, 2000"
                />
              </div>
              <div>
                <Label htmlFor="lessonRate">Поурочная ставка (₸/урок)</Label>
                <Input
                  id="lessonRate"
                  name="lessonRate"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={teacher.lessonRate?.toString() || ""}
                  disabled={editRateType !== "per_lesson"}
                  placeholder="Например, 2500"
                />
              </div>
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

      {/* Salary Calculation Dialog */}
      <Dialog open={isSalaryCalcOpen} onOpenChange={setIsSalaryCalcOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Расчет зарплаты: {teacher.name}
            </DialogTitle>
          </DialogHeader>
          <SalaryCalculationComponent
            teacher={teacher}
            lessons={lessons}
            periodStart={salaryPeriodStart}
            periodEnd={salaryPeriodEnd}
            onPeriodStartChange={setSalaryPeriodStart}
            onPeriodEndChange={setSalaryPeriodEnd}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSalaryCalcOpen(false)}>
              Закрыть
            </Button>
          </DialogFooter>
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

// Salary Calculation Component
function SalaryCalculationComponent({
  teacher,
  lessons,
  periodStart,
  periodEnd,
  onPeriodStartChange,
  onPeriodEndChange,
}: {
  teacher: any;
  lessons: Lesson[];
  periodStart: string;
  periodEnd: string;
  onPeriodStartChange: (value: string) => void;
  onPeriodEndChange: (value: string) => void;
}) {
  const calculation = useMemo(() => {
    if (!teacher?.rateType || (!teacher.hourlyRate && !teacher.lessonRate)) {
      return null;
    }

    const start = moment(periodStart).startOf("day");
    const end = moment(periodEnd).endOf("day");

    // Filter lessons for the selected period - only COMPLETED lessons (not cancelled or scheduled)
    const periodLessons = lessons.filter((l) => {
      const lessonDate = moment(l.start);
      return lessonDate.isBetween(start, end, null, "[]") && l.status === "completed";
    });

    // Check if period is within loaded range (warn user if not)
    let lessonsStart: moment.Moment | null = null;
    let lessonsEnd: moment.Moment | null = null;
    if (lessons.length > 0) {
      const sortedLessons = [...lessons].sort((a, b) => moment(a.start).valueOf() - moment(b.start).valueOf());
      lessonsStart = moment(sortedLessons[0].start);
      lessonsEnd = moment(sortedLessons[sortedLessons.length - 1].start);
    }
    const isPeriodOutOfRange = (lessonsStart && start.isBefore(lessonsStart)) || (lessonsEnd && end.isAfter(lessonsEnd));

    // Calculate total hours and lessons count
    const totalHours = periodLessons.reduce((total, lesson) => {
      const duration = moment(lesson.end).diff(moment(lesson.start), "hours", true);
      return total + duration;
    }, 0);

    const totalLessons = periodLessons.length;

    // Calculate salary based on rate type
    let salary = 0;
    let calculationDetails = "";

    if (teacher.rateType === "hourly" && teacher.hourlyRate) {
      salary = totalHours * teacher.hourlyRate;
      calculationDetails = `${totalHours.toFixed(2)} часов × ${teacher.hourlyRate.toLocaleString()} ₸/час`;
    } else if (teacher.rateType === "per_lesson" && teacher.lessonRate) {
      salary = totalLessons * teacher.lessonRate;
      calculationDetails = `${totalLessons} ${totalLessons === 1 ? "урок" : totalLessons < 5 ? "урока" : "уроков"} × ${teacher.lessonRate.toLocaleString()} ₸/урок`;
    }

    return {
      totalHours: totalHours.toFixed(2),
      totalLessons,
      salary: salary.toFixed(2),
      calculationDetails,
      periodLessons,
      isPeriodOutOfRange: isPeriodOutOfRange || false,
    };
  }, [teacher, lessons, periodStart, periodEnd]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="periodStart">Начало периода</Label>
          <Input
            id="periodStart"
            type="date"
            value={periodStart}
            onChange={(e) => onPeriodStartChange(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="periodEnd">Конец периода</Label>
          <Input
            id="periodEnd"
            type="date"
            value={periodEnd}
            onChange={(e) => onPeriodEndChange(e.target.value)}
          />
        </div>
      </div>

      {calculation ? (
        <Card className="border-2 border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="text-lg">Результат расчета</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Период:</span>
                <p className="font-medium">
                  {moment(periodStart).format("DD.MM.YYYY")} - {moment(periodEnd).format("DD.MM.YYYY")}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Тип ставки:</span>
                <p className="font-medium">
                  {teacher.rateType === "hourly" ? "Почасовая" : "Поурочная"}
                </p>
              </div>
              {teacher.rateType === "hourly" ? (
                <>
                  <div>
                    <span className="text-muted-foreground">Всего часов:</span>
                    <p className="font-medium">{calculation.totalHours} ч</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ставка:</span>
                    <p className="font-medium">{teacher.hourlyRate?.toLocaleString()} ₸/час</p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span className="text-muted-foreground">Всего уроков:</span>
                    <p className="font-medium">{calculation.totalLessons}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ставка:</span>
                    <p className="font-medium">{teacher.lessonRate?.toLocaleString()} ₸/урок</p>
                  </div>
                </>
              )}
            </div>
            {calculation.isPeriodOutOfRange && (
              <div className="border-t pt-2 mb-2">
                <p className="text-xs text-yellow-700 bg-yellow-100 p-2 rounded">
                  ⚠️ Внимание: Выбранный период может выходить за пределы загруженных данных. Результат может быть неточным.
                </p>
              </div>
            )}
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-2">Расчет:</p>
              <p className="text-sm font-medium mb-2">{calculation.calculationDetails}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-semibold text-muted-foreground">Зарплата:</span>
                <span className="text-3xl font-bold text-green-600">
                  {parseFloat(calculation.salary).toLocaleString()} ₸
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-yellow-200 bg-yellow-50/50">
          <CardContent className="p-4">
            <p className="text-sm text-yellow-800">
              Для расчета зарплаты необходимо указать тип ставки и значение ставки в настройках учителя.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


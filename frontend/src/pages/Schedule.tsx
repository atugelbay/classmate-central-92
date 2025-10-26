import { useState } from "react";
import moment from "moment";
import "moment/locale/ru";

import { useLessons, useCreateLesson, useUpdateLesson, useDeleteLesson, useTeachers, useGroups, useRooms, useCreateRoom } from "@/hooks/useData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Loader2, Trash2, ChevronLeft, ChevronRight, Building2, Calendar, CalendarDays, CalendarRange } from "lucide-react";
import RoomScheduleView from "@/components/RoomScheduleView";
import WeekScheduleView from "@/components/WeekScheduleView";
import MonthScheduleView from "@/components/MonthScheduleView";
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
  const { data: lessons = [], isLoading } = useLessons();
  const { data: teachers = [] } = useTeachers();
  const { data: groups = [] } = useGroups();
  const { data: rooms = [] } = useRooms();
  const createLesson = useCreateLesson();
  const updateLesson = useUpdateLesson();
  const deleteLesson = useDeleteLesson();
  const createRoom = useCreateRoom();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date; roomId?: string } | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("day");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const startDate = formData.get("date") as string;
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;

    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${startDate}T${endTime}`);

    const roomId = formData.get("roomId") as string;
    const selectedRoom = rooms.find(r => r.id === roomId);

    const lessonData = {
      title: formData.get("title") as string,
      teacherId: formData.get("teacherId") as string,
      groupId: formData.get("groupId") as string,
      subject: formData.get("subject") as string,
      start,
      end,
      room: selectedRoom?.name || "",
      roomId: roomId,
      status: "scheduled" as const,
      studentIds: [],
    };

    try {
      await createLesson.mutateAsync(lessonData as any);
      setIsDialogOpen(false);
      setSelectedSlot(null);
      toast.success("Урок создан");
    } catch (error) {
      toast.error("Ошибка при создании урока");
    }
  };


  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedLesson) return;

    const formData = new FormData(e.currentTarget);
    const startDate = formData.get("date") as string;
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;

    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${startDate}T${endTime}`);

    const roomId = formData.get("roomId") as string;
    const selectedRoom = rooms.find(r => r.id === roomId);

    const lessonData = {
      title: formData.get("title") as string,
      teacherId: formData.get("teacherId") as string,
      groupId: formData.get("groupId") as string,
      subject: formData.get("subject") as string,
      start,
      end,
      room: selectedRoom?.name || selectedLesson.room,
      roomId: roomId,
      status: selectedLesson.status,
      studentIds: selectedLesson.studentIds,
    };

    try {
      await updateLesson.mutateAsync({
        id: selectedLesson.id,
        data: lessonData as any,
      });
      setIsEditDialogOpen(false);
      setSelectedLesson(null);
      toast.success("Урок обновлен");
    } catch (error) {
      toast.error("Ошибка при обновлении урока");
    }
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

  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setIsEditDialogOpen(true);
  };

  const handleSlotClick = (start: Date, end: Date, roomId: string) => {
    setSelectedSlot({ start, end, roomId });
    setIsDialogOpen(true);
  };

  const handleLessonUpdate = async (lessonId: string, updates: { start: Date; end: Date; roomId?: string }) => {
    const lesson = lessons.find(l => l.id === lessonId);
    if (!lesson) return;

    const updatedData = {
      ...lesson,
      start: updates.start,
      end: updates.end,
      roomId: updates.roomId || lesson.roomId,
      room: updates.roomId ? rooms.find(r => r.id === updates.roomId)?.name || lesson.room : lesson.room,
    };

    try {
      await updateLesson.mutateAsync({
        id: lessonId,
        data: updatedData as any,
      });
      toast.success("Урок обновлен");
    } catch (error) {
      toast.error("Ошибка при обновлении урока");
    }
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
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Добавить урок
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новый урок</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Название урока</Label>
                <Input id="title" name="title" required />
              </div>
              <div>
                <Label htmlFor="subject">Предмет</Label>
                <Input id="subject" name="subject" required />
              </div>
              <div>
                <Label htmlFor="teacherId">Преподаватель</Label>
                <Select name="teacherId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите преподавателя" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name} - {teacher.subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="groupId">Группа</Label>
                <Select name="groupId">
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите группу (необязательно)" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="date">Дата</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  defaultValue={
                    selectedSlot
                      ? moment(selectedSlot.start).format("YYYY-MM-DD")
                      : moment().format("YYYY-MM-DD")
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Время начала</Label>
                  <Input 
                    id="startTime" 
                    name="startTime" 
                    type="time"
                    defaultValue={
                      selectedSlot
                        ? moment(selectedSlot.start).format("HH:mm")
                        : "10:00"
                    }
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">Время окончания</Label>
                  <Input 
                    id="endTime" 
                    name="endTime" 
                    type="time"
                    defaultValue={
                      selectedSlot
                        ? moment(selectedSlot.end).format("HH:mm")
                        : "12:00"
                    }
                    required 
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="roomId">Аудитория</Label>
                <Select name="roomId" required defaultValue={selectedSlot?.roomId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите аудиторию" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms && rooms.length > 0 ? (
                      rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name} (Вместимость: {room.capacity})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="" disabled>
                        Нет доступных аудиторий
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                Создать урок
              </Button>
            </form>
          </DialogContent>
          </Dialog>
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

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>
            {viewMode === "day" && "Расписание по аудиториям"}
            {viewMode === "week" && "Расписание на неделю"}
            {viewMode === "month" && "Календарь на месяц"}
          </CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          {viewMode === "day" && (
            <RoomScheduleView
              rooms={rooms}
              lessons={lessons}
              teachers={teachers}
              groups={groups}
              selectedDate={selectedDate}
              onLessonClick={handleLessonClick}
              onSlotClick={handleSlotClick}
              onLessonUpdate={handleLessonUpdate}
            />
          )}
          {viewMode === "week" && (
            <WeekScheduleView
              rooms={rooms}
              lessons={lessons}
              teachers={teachers}
              groups={groups}
              selectedDate={selectedDate}
              onLessonClick={handleLessonClick}
              onSlotClick={handleSlotClick}
              onLessonUpdate={handleLessonUpdate}
            />
          )}
          {viewMode === "month" && (
            <MonthScheduleView
              lessons={lessons}
              selectedDate={selectedDate}
              onDateClick={handleDateClick}
            />
          )}
        </CardContent>
      </Card>


      {/* Edit Lesson Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактировать урок</DialogTitle>
          </DialogHeader>
          {selectedLesson && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Название урока</Label>
                <Input 
                  id="edit-title" 
                  name="title" 
                  defaultValue={selectedLesson.title}
                  required 
                />
              </div>
              <div>
                <Label htmlFor="edit-subject">Предмет</Label>
                <Input 
                  id="edit-subject" 
                  name="subject" 
                  defaultValue={selectedLesson.subject}
                  required 
                />
              </div>
              <div>
                <Label htmlFor="edit-teacherId">Преподаватель</Label>
                <Select name="teacherId" defaultValue={selectedLesson.teacherId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите преподавателя" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name} - {teacher.subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-groupId">Группа</Label>
                <Select name="groupId" defaultValue={selectedLesson.groupId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите группу (необязательно)" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-date">Дата</Label>
                <Input
                  id="edit-date"
                  name="date"
                  type="date"
                  defaultValue={moment(selectedLesson.start).format("YYYY-MM-DD")}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-startTime">Время начала</Label>
                  <Input 
                    id="edit-startTime" 
                    name="startTime" 
                    type="time"
                    defaultValue={moment(selectedLesson.start).format("HH:mm")}
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="edit-endTime">Время окончания</Label>
                  <Input 
                    id="edit-endTime" 
                    name="endTime" 
                    type="time"
                    defaultValue={moment(selectedLesson.end).format("HH:mm")}
                    required 
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-roomId">Аудитория</Label>
                <Select name="roomId" required defaultValue={selectedLesson.roomId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите аудиторию" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms && rooms.length > 0 ? (
                      rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name} (Вместимость: {room.capacity})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="" disabled>
                        Нет доступных аудиторий
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setIsDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Удалить урок
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditDialogOpen(false);
                      setSelectedLesson(null);
                    }}
                  >
                    Отмена
                  </Button>
                  <Button type="submit">
                    Сохранить изменения
                  </Button>
                </div>
              </div>
            </form>
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
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false);
              setIsEditDialogOpen(true);
            }}>
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

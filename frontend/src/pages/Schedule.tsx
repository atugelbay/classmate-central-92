import { useState } from "react";
import { Calendar, momentLocalizer, SlotInfo, Formats, Event } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import moment from "moment";
import "moment/locale/ru";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import { useLessons, useCreateLesson, useUpdateLesson, useDeleteLesson, useTeachers, useGroups, useRooms } from "@/hooks/useData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Loader2, Calendar as CalendarIcon, Building2, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import RoomScheduleView from "@/components/RoomScheduleView";
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

// Настройка русской локали и 24-часового формата
moment.locale("ru");

const localizer = momentLocalizer(moment);
const DragAndDropCalendar = withDragAndDrop(Calendar);

// 24-часовой формат времени
const formats: Formats = {
  timeGutterFormat: "HH:mm",
  eventTimeRangeFormat: ({ start, end }: any) => {
    return `${moment(start).format("HH:mm")} - ${moment(end).format("HH:mm")}`;
  },
  agendaTimeRangeFormat: ({ start, end }: any) => {
    return `${moment(start).format("HH:mm")} - ${moment(end).format("HH:mm")}`;
  },
  dayHeaderFormat: "dddd, D MMMM",
  dayRangeHeaderFormat: ({ start, end }: any) => {
    return `${moment(start).format("D MMMM")} - ${moment(end).format("D MMMM")}`;
  },
  agendaHeaderFormat: ({ start, end }: any) => {
    return `${moment(start).format("D MMMM")} - ${moment(end).format("D MMMM YYYY")}`;
  },
  monthHeaderFormat: "MMMM YYYY",
  agendaDateFormat: "ddd D MMM",
  weekdayFormat: "ddd",
};

export default function Schedule() {
  const { data: lessons = [], isLoading } = useLessons();
  const { data: teachers = [] } = useTeachers();
  const { data: groups = [] } = useGroups();
  const { data: rooms = [] } = useRooms();
  const createLesson = useCreateLesson();
  const updateLesson = useUpdateLesson();
  const deleteLesson = useDeleteLesson();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [viewMode, setViewMode] = useState<"calendar" | "rooms">("calendar");
  const [roomViewDate, setRoomViewDate] = useState<Date>(new Date());

  const events = lessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    start: new Date(lesson.start),
    end: new Date(lesson.end),
    resource: lesson,
  }));

  // Custom event component for calendar
  const EventComponent = ({ event }: { event: Event }) => {
    const lesson = event.resource as Lesson;
    const teacher = teachers.find((t) => t.id === lesson.teacherId);
    const group = groups.find((g) => g.id === lesson.groupId);
    const room = rooms.find((r) => r.id === lesson.roomId);

    return (
      <div 
        className="h-full p-1 overflow-hidden border-l-4 rounded-sm bg-white dark:bg-gray-800" 
        style={{ 
          fontSize: "0.75rem",
          borderLeftColor: room?.color || "#8B5CF6",
        }}
      >
        <div className="font-semibold truncate">{lesson.title}</div>
        <div className="text-muted-foreground truncate text-xs">{teacher?.name}</div>
        {group && (
          <Badge variant="outline" className="text-xs mt-1">
            {group.name}
          </Badge>
        )}
        <div className="text-muted-foreground mt-1 text-xs">
          {moment(lesson.start).format("HH:mm")} - {moment(lesson.end).format("HH:mm")}
        </div>
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const startDate = formData.get("date") as string;
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;

    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${startDate}T${endTime}`);

    const lessonData = {
      title: formData.get("title") as string,
      teacherId: formData.get("teacherId") as string,
      groupId: formData.get("groupId") as string,
      subject: formData.get("subject") as string,
      start,
      end,
      room: formData.get("room") as string,
      roomId: formData.get("roomId") as string,
      status: "scheduled" as const,
      studentIds: [],
    };

    try {
      await createLesson.mutateAsync(lessonData as any);
      setIsDialogOpen(false);
      setSelectedSlot(null);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    // Если это выделение промежутка, используем start и end из слота
    // Если это клик, end будет равен start, добавим 2 часа
    let start = slotInfo.start;
    let end = slotInfo.end;
    
    // Проверяем если это просто клик (start === end), добавляем 2 часа
    if (start.getTime() === end.getTime()) {
      end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // +2 часа
    }
    
    setSelectedSlot({ start, end });
    setIsDialogOpen(true);
  };

  const handleEventDrop = async ({ event, start, end }: any) => {
    try {
      const lesson = lessons.find(l => l.id === event.id);
      if (!lesson) return;

      await updateLesson.mutateAsync({
        id: lesson.id,
        data: {
          ...lesson,
          start: new Date(start),
          end: new Date(end),
        },
      });
      toast.success("Урок перемещен");
    } catch (error) {
      toast.error("Ошибка при перемещении урока");
    }
  };

  const handleEventResize = async ({ event, start, end }: any) => {
    try {
      const lesson = lessons.find(l => l.id === event.id);
      if (!lesson) return;

      await updateLesson.mutateAsync({
        id: lesson.id,
        data: {
          ...lesson,
          start: new Date(start),
          end: new Date(end),
        },
      });
      toast.success("Длительность урока изменена");
    } catch (error) {
      toast.error("Ошибка при изменении урока");
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

    const lessonData = {
      title: formData.get("title") as string,
      teacherId: formData.get("teacherId") as string,
      groupId: formData.get("groupId") as string,
      subject: formData.get("subject") as string,
      start,
      end,
      room: formData.get("room") as string,
      roomId: formData.get("roomId") as string,
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

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Расписание</h1>
          <p className="text-muted-foreground">
            Управление учебным расписанием
          </p>
        </div>
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
                <Label htmlFor="room">Название аудитории</Label>
                <Input id="room" name="room" required placeholder="Например: Аудитория 101" />
              </div>
              <div>
                <Label htmlFor="roomId">Аудитория (из списка)</Label>
                <Select name="roomId">
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите аудиторию (необязательно)" />
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

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "calendar" | "rooms")}>
        <TabsList className="mb-4">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Календарь
          </TabsTrigger>
          <TabsTrigger value="rooms" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            По аудиториям
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle>Календарь занятий</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[600px]">
                <DragAndDropCalendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: "100%" }}
              views={["month", "week", "day", "agenda"]}
              defaultView="week"
              selectable
              onSelectSlot={handleSelectSlot}
              onSelectEvent={(event) => {
                const lesson = lessons.find(l => l.id === event.id);
                if (lesson) handleLessonClick(lesson);
              }}
              // Drag & Drop support
              draggableAccessor={() => true}
              resizable
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              step={30}
              showMultiDayTimes
              // Time range: 9:00 - 22:00
              min={new Date(1970, 1, 1, 9, 0, 0)}
              max={new Date(1970, 1, 1, 22, 0, 0)}
              // 24-часовой формат
              formats={formats}
              culture="ru"
              // Custom event component
              components={{
                event: EventComponent,
              }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rooms">
          <Card>
            <CardHeader>
              <CardTitle>Расписание по аудиториям</CardTitle>
            </CardHeader>
            <CardContent>
              <RoomScheduleView
                rooms={rooms}
                lessons={lessons}
                teachers={teachers}
                groups={groups}
                selectedDate={roomViewDate}
                onDateChange={setRoomViewDate}
                onLessonClick={handleLessonClick}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
                <Label htmlFor="edit-room">Название аудитории</Label>
                <Input 
                  id="edit-room" 
                  name="room" 
                  defaultValue={selectedLesson.room}
                  required 
                  placeholder="Например: Аудитория 101" 
                />
              </div>
              <div>
                <Label htmlFor="edit-roomId">Аудитория (из списка)</Label>
                <Select name="roomId" defaultValue={selectedLesson.roomId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите аудиторию (необязательно)" />
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

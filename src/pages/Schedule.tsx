import { useState } from "react";
import { Calendar as BigCalendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Lesson } from "@/types";

const localizer = momentLocalizer(moment);

export default function Schedule() {
  const { lessons, addLesson, updateLesson, teachers, groups } = useStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const events = lessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    start: new Date(lesson.start),
    end: new Date(lesson.end),
    resource: lesson,
  }));

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const startDate = formData.get("date") as string;
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;

    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${startDate}T${endTime}`);

    const lesson: Lesson = {
      id: Date.now().toString(),
      title: formData.get("title") as string,
      teacherId: formData.get("teacherId") as string,
      groupId: formData.get("groupId") as string,
      subject: formData.get("subject") as string,
      start,
      end,
      room: formData.get("room") as string,
      status: "scheduled",
      studentIds: [],
    };

    addLesson(lesson);
    setIsDialogOpen(false);
  };

  const handleSelectSlot = ({ start }: { start: Date }) => {
    setSelectedDate(start);
    setIsDialogOpen(true);
  };

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
                    selectedDate
                      ? moment(selectedDate).format("YYYY-MM-DD")
                      : moment().format("YYYY-MM-DD")
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Время начала</Label>
                  <Input id="startTime" name="startTime" type="time" required />
                </div>
                <div>
                  <Label htmlFor="endTime">Время окончания</Label>
                  <Input id="endTime" name="endTime" type="time" required />
                </div>
              </div>
              <div>
                <Label htmlFor="room">Аудитория</Label>
                <Input id="room" name="room" required />
              </div>
              <Button type="submit" className="w-full">
                Создать урок
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Календарь занятий</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[600px]">
            <BigCalendar
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
                // Handle event click
                console.log(event);
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

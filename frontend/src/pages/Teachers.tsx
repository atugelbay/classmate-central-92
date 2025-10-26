import { useState } from "react";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import "moment/locale/ru";
import { useTeachers, useCreateTeacher, useUpdateTeacher, useDeleteTeacher, useGroups, useRooms, useStudents, useLessons } from "@/hooks/useData";

moment.locale("ru");
import { LessonFormModal } from "@/components/LessonFormModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Mail, Phone, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Teacher } from "@/types";

export default function Teachers() {
  const navigate = useNavigate();
  const { data: teachers = [], isLoading } = useTeachers();
  const { data: groups = [] } = useGroups();
  const { data: rooms = [] } = useRooms();
  const { data: students = [] } = useStudents();
  const { data: lessons = [] } = useLessons();
  const createTeacher = useCreateTeacher();
  const updateTeacher = useUpdateTeacher();
  const deleteTeacher = useDeleteTeacher();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  // Lesson Form Modal state
  const [isLessonFormOpen, setIsLessonFormOpen] = useState(false);
  const [lessonFormData, setLessonFormData] = useState<any>(null);

  const filteredTeachers = teachers.filter((teacher) => {
    const matchesSearch =
      teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || teacher.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
      if (editingTeacher) {
        await updateTeacher.mutateAsync({ id: editingTeacher.id, data: teacherData });
      } else {
        await createTeacher.mutateAsync(teacherData as any);
      }
      setIsDialogOpen(false);
      setEditingTeacher(null);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Вы уверены, что хотите удалить этого преподавателя?")) {
      try {
        await deleteTeacher.mutateAsync(id);
      } catch (error) {
        // Error is handled by the mutation
      }
    }
  };

  const handleCreateLesson = (teacher: Teacher) => {
    setLessonFormData({
      teacherId: teacher.id,
      subject: teacher.subject,
      date: moment().format("YYYY-MM-DD"),
      startTime: "10:00",
      endTime: "11:30",
    });
    setIsLessonFormOpen(true);
  };

  const handleViewTeacherSchedule = (teacherId: string) => {
    navigate(`/teachers/${teacherId}`);
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
          <h1 className="text-3xl font-bold">Учителя</h1>
          <p className="text-muted-foreground">
            Управление преподавательским составом
          </p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingTeacher(null);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Добавить учителя
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTeacher ? "Редактировать учителя" : "Новый учитель"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">ФИО</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingTeacher?.name}
                  required
                />
              </div>
              <div>
                <Label htmlFor="subject">Предмет</Label>
                <Input
                  id="subject"
                  name="subject"
                  defaultValue={editingTeacher?.subject}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={editingTeacher?.email}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={editingTeacher?.phone}
                  required
                />
              </div>
              <div>
                <Label htmlFor="status">Статус</Label>
                <Select
                  name="status"
                  defaultValue={editingTeacher?.status || "active"}
                >
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
                  defaultValue={editingTeacher?.workload}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {editingTeacher ? "Сохранить" : "Добавить"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени или предмету..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="active">Активные</SelectItem>
            <SelectItem value="inactive">Неактивные</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTeachers.map((teacher) => {
          // Get teacher's lessons for the current week
          const startOfWeek = moment().startOf('isoWeek');
          const endOfWeek = moment().endOf('isoWeek');
          const teacherLessons = lessons.filter((l) => 
            l.teacherId === teacher.id && 
            moment(l.start).isBetween(startOfWeek, endOfWeek, null, '[]')
          );
          
          // Calculate workload in hours for current week
          const totalMinutes = teacherLessons.reduce((sum, lesson) => {
            const duration = moment(lesson.end).diff(moment(lesson.start), 'minutes');
            return sum + duration;
          }, 0);
          const workloadHours = (totalMinutes / 60).toFixed(1);
          
          // Get upcoming lessons for this teacher
          const upcomingLessons = lessons
            .filter((l) => l.teacherId === teacher.id && moment(l.start).isAfter(moment()))
            .sort((a, b) => moment(a.start).diff(moment(b.start)));
          const nextLesson = upcomingLessons[0];
          const nextLessonGroup = nextLesson?.groupId ? groups.find((g) => g.id === nextLesson.groupId) : null;
          
          return (
            <Card 
              key={teacher.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleViewTeacherSchedule(teacher.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                      {teacher.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold">{teacher.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {teacher.subject}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={teacher.status === "active" ? "default" : "secondary"}
                  >
                    {teacher.status === "active" ? "Активен" : "Неактивен"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {teacher.email}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {teacher.phone}
                  </div>
                  
                  <div className="mt-4 rounded-lg bg-muted p-3">
                    <p className="text-sm font-medium">Загруженность на неделю</p>
                    <p className="text-2xl font-bold text-primary">
                      {workloadHours}
                      <span className="text-sm font-normal text-muted-foreground">
                        {" "}
                        ч
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {teacherLessons.length} {teacherLessons.length === 1 ? 'урок' : teacherLessons.length < 5 ? 'урока' : 'уроков'}
                    </p>
                  </div>
                  
                  {/* Next Lesson */}
                  {nextLesson && (
                    <div className="mt-2 rounded-lg bg-green-50 border border-green-200 p-3">
                      <p className="text-xs font-medium text-green-900 mb-1">Ближайший урок:</p>
                      <p className="text-sm text-green-800">
                        {moment(nextLesson.start).format("DD MMM, HH:mm")}
                      </p>
                      {nextLessonGroup && (
                        <p className="text-xs text-green-700 mt-1">
                          {nextLessonGroup.name}
                        </p>
                      )}
                      {!nextLessonGroup && (
                        <p className="text-xs text-green-700 mt-1">
                          Индивидуальное
                        </p>
                      )}
                    </div>
                  )}
                  
                  <div className="pt-4">
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateLesson(teacher);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Создать урок
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Lesson Form Modal */}
      <LessonFormModal
        open={isLessonFormOpen}
        onOpenChange={setIsLessonFormOpen}
        teachers={teachers}
        groups={groups}
        rooms={rooms}
        students={students}
        initialData={lessonFormData}
        mode="create"
        onSuccess={() => {
          setLessonFormData(null);
        }}
      />
    </div>
  );
}

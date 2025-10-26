import { useState } from "react";
import moment from "moment";
import { useIndividualLessons, useTeachers, useStudents, useRooms, useUpdateLesson, useDeleteLesson } from "@/hooks/useData";
import { LessonFormModal } from "@/components/LessonFormModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, User, Clock, MapPin, Edit, Trash2, CalendarDays } from "lucide-react";
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

  const filteredLessons = lessons.filter((lesson) => {
    const teacher = teachers.find((t) => t.id === lesson.teacherId);
    const studentNames = (lesson.studentIds || [])
      .map((id) => students.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .join(", ");

    const searchLower = searchQuery.toLowerCase();
    return (
      lesson.title?.toLowerCase().includes(searchLower) ||
      lesson.subject?.toLowerCase().includes(searchLower) ||
      teacher?.name.toLowerCase().includes(searchLower) ||
      studentNames.toLowerCase().includes(searchLower)
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

  // Group lessons by status
  const upcomingLessons = filteredLessons.filter(
    (l) => moment(l.start).isAfter(moment()) && l.status === "scheduled"
  );
  const completedLessons = filteredLessons.filter((l) => l.status === "completed");
  const cancelledLessons = filteredLessons.filter((l) => l.status === "cancelled");

  const getStudentNames = (studentIds: string[]) => {
    return studentIds
      .map((id) => students.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  };

  const renderLessonCard = (lesson: Lesson) => {
    const teacher = teachers.find((t) => t.id === lesson.teacherId);
    const room = rooms.find((r) => r.id === lesson.roomId);
    const studentNames = getStudentNames(lesson.studentIds || []);

    return (
      <Card key={lesson.id} className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{lesson.title}</h3>
              <p className="text-sm text-muted-foreground">{lesson.subject}</p>
            </div>
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
                ? "Проведено"
                : lesson.status === "cancelled"
                ? "Отменено"
                : "Запланировано"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span>{moment(lesson.start).format("DD MMMM YYYY, dddd")}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {moment(lesson.start).format("HH:mm")} - {moment(lesson.end).format("HH:mm")}
            </span>
          </div>
          {teacher && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{teacher.name}</span>
            </div>
          )}
          {room && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{room.name}</span>
            </div>
          )}
          {studentNames && (
            <div className="p-2 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-1">Студенты:</p>
              <p className="text-sm text-blue-800">{studentNames}</p>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => handleEditLesson(lesson)}
            >
              <Edit className="h-4 w-4 mr-1" />
              Изменить
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={() => setDeletingLesson(lesson)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Удалить
            </Button>
          </div>
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
            <p className="text-sm text-muted-foreground">Запланировано</p>
            <p className="text-2xl font-bold">{upcomingLessons.length}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <p className="text-sm text-muted-foreground">Проведено</p>
            <p className="text-2xl font-bold">{completedLessons.length}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <p className="text-sm text-muted-foreground">Отменено</p>
            <p className="text-2xl font-bold">{cancelledLessons.length}</p>
          </CardHeader>
        </Card>
      </div>

      {/* Lessons Lists */}
      {upcomingLessons.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Запланированные занятия</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingLessons.map(renderLessonCard)}
          </div>
        </div>
      )}

      {completedLessons.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Проведенные занятия</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedLessons.map(renderLessonCard)}
          </div>
        </div>
      )}

      {cancelledLessons.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Отмененные занятия</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cancelledLessons.map(renderLessonCard)}
          </div>
        </div>
      )}

      {filteredLessons.length === 0 && (
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


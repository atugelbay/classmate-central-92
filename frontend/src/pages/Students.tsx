import { useState } from "react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { 
  useStudents, 
  useCreateStudent, 
  useUpdateStudent, 
  useDeleteStudent, 
  useGroups,
  useStudentBalance,
  useStudentSubscriptions,
  useLessons,
  useTeachers,
} from "@/hooks/useData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Mail, Phone, Trash2, Edit, Loader2, AlertCircle, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Student } from "@/types";
import { formatKzPhone, normalizeKzPhone } from "@/lib/phone";
import moment from "moment";
import "moment/locale/ru";

moment.locale("ru");

const ITEMS_PER_PAGE = 39;

export default function Students() {
  const navigate = useNavigate();
  const { data: students = [], isLoading } = useStudents();
  const { data: groups = [] } = useGroups();
  const { data: lessons = [] } = useLessons();
  const { data: teachers = [] } = useTeachers();
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [activityFilter, setActivityFilter] = useState<"all" | "active" | "inactive">("active");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Check if student has upcoming lessons
  const isStudentActive = (studentId: string) => {
    const studentLessons = lessons.filter((l) => 
      l.studentIds?.includes(studentId) || 
      (l.groupId && students.find(s => s.id === studentId)?.groupIds?.includes(l.groupId))
    );
    const hasUpcomingLessons = studentLessons.some((l) => moment(l.start).isAfter(moment()));
    return hasUpcomingLessons;
  };

  // Get student schedule from lessons
  const getStudentSchedule = (studentId: string): string => {
    // Get all lessons for this student (both individual and group)
    const studentLessons = lessons.filter((l) => 
      (l.studentIds?.includes(studentId) || 
      (l.groupId && students.find(s => s.id === studentId)?.groupIds?.includes(l.groupId))) &&
      l.status !== "cancelled"
    );
    
    if (studentLessons.length === 0) return "";
    
    // Group lessons by weekday and find most common time for each weekday
    const weekdayMap = new Map<number, Map<string, number>>(); // weekday -> timeString -> count
    
    studentLessons.forEach((lesson) => {
      const lessonDate = moment(lesson.start);
      const weekday = lessonDate.day(); // 0 = Sunday, 1 = Monday, etc.
      const startTime = lessonDate.format("HH:mm");
      const endTime = moment(lesson.end).format("HH:mm");
      const timeString = `${startTime} - ${endTime}`;
      
      if (!weekdayMap.has(weekday)) {
        weekdayMap.set(weekday, new Map());
      }
      
      const timeCountMap = weekdayMap.get(weekday)!;
      timeCountMap.set(timeString, (timeCountMap.get(timeString) || 0) + 1);
    });
    
    if (weekdayMap.size === 0) return "";
    
    // Get most common time for each weekday
    const scheduleMap = new Map<number, { start: string; end: string }>();
    
    weekdayMap.forEach((timeCountMap, weekday) => {
      let maxCount = 0;
      let mostCommonTime = "";
      
      timeCountMap.forEach((count, timeString) => {
        if (count > maxCount) {
          maxCount = count;
          mostCommonTime = timeString;
        }
      });
      
      if (mostCommonTime) {
        const [start, end] = mostCommonTime.split(" - ");
        scheduleMap.set(weekday, { start: start.trim(), end: end.trim() });
      }
    });
    
    if (scheduleMap.size === 0) return "";
    
    // Check if all weekdays have the same time
    const firstEntry = Array.from(scheduleMap.values())[0];
    const allSameTime = Array.from(scheduleMap.values()).every(
      (entry) => entry.start === firstEntry.start && entry.end === firstEntry.end
    );
    
    // Sort weekdays (0 = Sunday, 1 = Monday, etc.)
    const sortedWeekdays = Array.from(scheduleMap.keys()).sort((a, b) => {
      // Convert Sunday (0) to 7 for proper sorting
      const aAdj = a === 0 ? 7 : a;
      const bAdj = b === 0 ? 7 : b;
      return aAdj - bAdj;
    });
    
    const weekdayNames = ["ВС", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"];
    const weekdayLabels = sortedWeekdays.map(day => weekdayNames[day === 0 ? 0 : day]).join(" ");
    
    if (allSameTime) {
      // All days have same time, format: "ПН СР ПТ 15:00 - 16:00"
      return `${weekdayLabels} ${firstEntry.start} - ${firstEntry.end}`;
    } else {
      // Different times for different days - use first time as primary
      return `${weekdayLabels} ${firstEntry.start} - ${firstEntry.end}`;
    }
  };

  const filteredStudents = students.filter((student) => {
    // Search filter
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      // Normalize phone numbers by removing spaces, dashes, and parentheses for better matching
      const normalizePhone = (phone: string) => phone.replace(/[\s\-\(\)]/g, '').toLowerCase();
      const normalizedQuery = normalizePhone(query);
      const normalizedStudentPhone = normalizePhone(student.phone || '');
      
      const matchesSearch =
        student.name.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query) ||
        normalizedStudentPhone.includes(normalizedQuery);
      
      if (!matchesSearch) return false;
    }
    
    // Activity filter
    if (activityFilter !== "all") {
      const isActive = isStudentActive(student.id);
      if (activityFilter === "active" && !isActive) return false;
      if (activityFilter === "inactive" && isActive) return false;
    }
    
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activityFilter]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const studentData = {
      name: formData.get("name") as string,
      age: parseInt(formData.get("age") as string),
      email: formData.get("email") as string,
      phone: normalizeKzPhone(formData.get("phone") as string),
      status: "active" as const,
      subjects: (formData.get("subjects") as string).split(",").map((s) => s.trim()),
      groupIds: editingStudent?.groupIds || [],
    };

    try {
      if (editingStudent) {
        await updateStudent.mutateAsync({ id: editingStudent.id, data: studentData });
      } else {
        await createStudent.mutateAsync(studentData as any);
      }
      setIsDialogOpen(false);
      setEditingStudent(null);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Вы уверены, что хотите удалить этого ученика?")) {
      try {
        await deleteStudent.mutateAsync(id);
      } catch (error) {
        // Error is handled by the mutation
      }
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
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ученики</h1>
          <p className="text-muted-foreground">
            Управление базой учащихся
          </p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingStudent(null);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Добавить ученика
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingStudent ? "Редактировать ученика" : "Новый ученик"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">ФИО</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingStudent?.name}
                  required
                />
              </div>
              <div>
                <Label htmlFor="age">Возраст</Label>
                <Input
                  id="age"
                  name="age"
                  type="number"
                  defaultValue={editingStudent?.age}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={editingStudent?.email}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={editingStudent?.phone}
                  onChange={(e) => {
                    e.currentTarget.value = formatKzPhone(e.currentTarget.value);
                  }}
                  required
                />
              </div>
              <div>
                <Label htmlFor="subjects">Предметы (через запятую)</Label>
                <Input
                  id="subjects"
                  name="subjects"
                  defaultValue={editingStudent?.subjects.join(", ")}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {editingStudent ? "Сохранить" : "Добавить"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Поиск учеников"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Activity Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Статус:</span>
        <Button
          variant={activityFilter === "active" ? "default" : "outline"}
          size="sm"
          onClick={() => setActivityFilter("active")}
        >
          Активные ({students.filter(s => isStudentActive(s.id)).length})
        </Button>
        <Button
          variant={activityFilter === "inactive" ? "default" : "outline"}
          size="sm"
          onClick={() => setActivityFilter("inactive")}
        >
          Неактивные ({students.filter(s => !isStudentActive(s.id)).length})
        </Button>
        <Button
          variant={activityFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setActivityFilter("all")}
        >
          Все ({students.length})
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {paginatedStudents.map((student) => {
          const studentGroups = groups.filter((g) =>
            student.groupIds && student.groupIds.includes(g.id)
          );

          // Get student's upcoming lessons
          const studentLessons = lessons.filter((l) => 
            l.studentIds?.includes(student.id) || 
            (l.groupId && student.groupIds?.includes(l.groupId))
          );
          const upcomingLessons = studentLessons
            .filter((l) => moment(l.start).isAfter(moment()))
            .sort((a, b) => moment(a.start).diff(moment(b.start)));
          const nextLesson = upcomingLessons[0];
          
          // Get teacher info for next lesson
          // nextLesson.teacherName is already populated via JOIN from backend
          const nextLessonGroup = nextLesson?.groupId ? groups.find((g) => g.id === nextLesson.groupId) : null;

          // Determine activity status based on upcoming lessons
          const hasUpcomingLessons = upcomingLessons.length > 0;

          return (
            <Card 
              key={student.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/students/${student.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-lg font-semibold text-accent">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold">{student.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {student.age} лет
                      </p>
                    </div>
                  </div>
                  <Badge variant={hasUpcomingLessons ? "default" : "secondary"}>
                    {hasUpcomingLessons ? "Активный" : "Неактивный"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {student.email}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {student.phone}
                  </div>
                  {getStudentSchedule(student.id) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {getStudentSchedule(student.id)}
                    </div>
                  )}
                  {studentGroups.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-medium">Группы:</p>
                      <div className="flex flex-wrap gap-2">
                        {studentGroups.map((group) => (
                          <Badge key={group.id} variant="outline">
                            {group.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Next Lesson Info */}
                  {nextLesson && (
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-4 w-4 text-green-700" />
                        <p className="text-sm font-medium text-green-900">Ближайшее занятие:</p>
                      </div>
                      <p className="text-sm text-green-800">
                        {moment(nextLesson.start).format("DD MMMM, dddd")} в {moment(nextLesson.start).format("HH:mm")}
                      </p>
                      {nextLesson?.teacherName && (
                        <p className="text-xs text-green-700 mt-1">
                          Преподаватель: {nextLesson.teacherName}
                        </p>
                      )}
                      {nextLessonGroup && (
                        <p className="text-xs text-green-700">
                          Группа: {nextLessonGroup.name}
                        </p>
                      )}
                      {!nextLessonGroup && (
                        <p className="text-xs text-green-700">
                          Индивидуальное занятие
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(student);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Изменить
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(student.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) setCurrentPage(currentPage - 1);
                }}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage(page);
                  }}
                  isActive={currentPage === page}
                  className="cursor-pointer"
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                }}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

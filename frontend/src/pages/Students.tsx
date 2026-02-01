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
  useStudentsPaged,
} from "@/hooks/useData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Card imports removed - using custom card divs
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Phone, Trash2, Edit, Loader2, Clock, X, FileText, ArrowUpDown } from "lucide-react";
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
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Student } from "@/types";
import { formatKzPhone, normalizeKzPhone } from "@/lib/phone";
import { useConfirmDelete } from "@/hooks/useConfirmDelete";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import moment from "moment";
import "moment/locale/ru";
import { ExportDialog } from "@/components/ExportDialog";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

moment.locale("ru");

const ITEMS_PER_PAGE = 39;

// Helper function to generate pagination page numbers with ellipsis
function generatePageNumbers(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    // Show all pages if 7 or fewer
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [];

  if (currentPage <= 3) {
    // Show first 5 pages, ellipsis, last page
    for (let i = 1; i <= 5; i++) {
      pages.push(i);
    }
    pages.push('ellipsis');
    pages.push(totalPages);
  } else if (currentPage >= totalPages - 2) {
    // Show first page, ellipsis, last 5 pages
    pages.push(1);
    pages.push('ellipsis');
    for (let i = totalPages - 4; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    // Show first page, ellipsis, current-1, current, current+1, ellipsis, last page
    pages.push(1);
    pages.push('ellipsis');
    pages.push(currentPage - 1);
    pages.push(currentPage);
    pages.push(currentPage + 1);
    pages.push('ellipsis');
    pages.push(totalPages);
  }

  return pages;
}

// Memoized grid to avoid unnecessary re-rendering of the whole page during search
const StudentsGrid = React.memo(function StudentsGrid({
  students,
  groups,
  lessons,
  teachers,
  isFetching,
  onEdit,
  onDelete,
  onNavigate,
}: {
  students: Student[];
  groups: ReturnType<typeof useGroups>["data"];
  lessons: ReturnType<typeof useLessons>["data"];
  teachers: ReturnType<typeof useTeachers>["data"];
  isFetching: boolean;
  onEdit: (s: Student) => void;
  onDelete: (id: string) => void;
  onNavigate: (id: string) => void;
}) {

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {isFetching && (
        <div className="col-span-full flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Обновление результатов...
        </div>
      )}
      {students.map((student) => {
        const studentGroups = (groups || []).filter((g) =>
          student.groupIds && student.groupIds.includes(g.id)
        );

        const studentLessons = (lessons || []).filter((l) =>
          l.studentIds?.includes(student.id) ||
          (l.groupId && student.groupIds?.includes(l.groupId))
        );
        const upcomingLessons = studentLessons
          .filter((l) => moment(l.start).isAfter(moment()))
          .sort((a, b) => moment(a.start).diff(moment(b.start)));
        const nextLesson = upcomingLessons[0];
        const nextLessonGroup = nextLesson?.groupId ? (groups || []).find((g) => g.id === nextLesson.groupId) : null;

        return (
          <div 
            key={student.id} 
            className="rounded-xl bg-card border border-border p-4 cursor-pointer transition-all hover:shadow-lg"
            onClick={() => onNavigate(student.id)}
          >
            {/* Header: Avatar + Name */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#6366f1] to-[#a855f7] text-base font-semibold text-white">
                {student.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">{student.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {student.age} лет
                </p>
              </div>
            </div>

            {/* Info: Phone + Groups */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0" />
                <span>{student.phone || "—"}</span>
              </div>
              {studentGroups.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span className="truncate">{studentGroups.map(g => g.name).join(", ")}</span>
                </div>
              )}
            </div>

            {/* Next Lesson - Lightweight */}
            <div className="rounded-lg border border-border p-3 mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                {nextLesson ? (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">
                      {moment(nextLesson.start).locale("ru").format("D MMM, dd")} в {moment(nextLesson.start).locale("ru").format("HH:mm")}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {nextLessonGroup ? nextLessonGroup.name : "Индивидуальное"}
                    </p>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Нет занятий</span>
                )}
              </div>
            </div>

            {/* Actions - Subtle gray buttons */}
            <div className="flex gap-2 pt-3 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(student);
                }}
              >
                <Edit className="h-4 w-4 mr-1.5" />
                Изменить
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(student.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
});

// Data-fetching container: ограничивает перерисовку остальной страницы
function StudentsGridContainer({
  query,
  page,
  pageSize,
  groups,
  lessons,
  teachers,
  allStudents,
  sortBy,
  sortOrder,
  onEdit,
  onDelete,
  onNavigate,
  onPageChange,
}: {
  query: string;
  page: number;
  pageSize: number;
  groups: ReturnType<typeof useGroups>["data"];
  lessons: ReturnType<typeof useLessons>["data"];
  teachers: ReturnType<typeof useTeachers>["data"];
  allStudents: Student[];
  sortBy: "name" | "age" | "id";
  sortOrder: "asc" | "desc";
  onEdit: (s: Student) => void;
  onDelete: (id: string) => void;
  onNavigate: (id: string) => void;
  onPageChange: (p: number) => void;
}) {
  const { data: paged, isFetching } = useStudentsPaged(query, page, pageSize);
  const students: Student[] = (paged as any)?.items ?? [];
  const total = (paged as any)?.total ?? 0;

  // Используем полный список для сортировки, если нет поискового запроса
  const baseList: Student[] = React.useMemo(() => {
    if (!query) {
      return allStudents || [];
    }
    return students;
  }, [query, allStudents, students]);

  // Сортировка студентов
  const sortedStudents = React.useMemo(() => {
    const sorted = [...baseList];
    
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name, "ru", { sensitivity: "base" });
          break;
        case "age":
          comparison = a.age - b.age;
          break;
        case "id":
          // Сортировка по id (обычно это порядок добавления)
          comparison = a.id.localeCompare(b.id);
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });
    
    return sorted;
  }, [baseList, sortBy, sortOrder]);

  const totalPages = Math.ceil((query ? (total || 0) : sortedStudents.length) / pageSize) || 1;

  const paginatedStudents = React.useMemo(() => {
    if (query) {
      // При поиске используем серверную пагинацию
      return sortedStudents;
    }
    // При отсутствии поиска используем клиентскую пагинацию
    const start = (page - 1) * pageSize;
    return sortedStudents.slice(start, start + pageSize);
  }, [sortedStudents, query, page, pageSize]);

  return (
    <>
      <StudentsGrid
        students={paginatedStudents}
        groups={groups}
        lessons={lessons}
        teachers={teachers}
        isFetching={isFetching}
        onEdit={onEdit}
        onDelete={onDelete}
        onNavigate={onNavigate}
      />
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => { e.preventDefault(); if (page > 1) onPageChange(page - 1); }}
                className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {generatePageNumbers(page, totalPages).map((p, idx) => {
              if (p === 'ellipsis') {
                return (
                  <PaginationItem key={`ellipsis-${idx}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                );
              }
              return (
                <PaginationItem key={p}>
                  <PaginationLink
                    href="#"
                    onClick={(e) => { e.preventDefault(); onPageChange(p); }}
                    isActive={page === p}
                    className="cursor-pointer"
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => { e.preventDefault(); if (page < totalPages) onPageChange(page + 1); }}
                className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </>
  );
}

export default function Students() {
  const navigate = useNavigate();
  // Server-side search + pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const [currentPage, setCurrentPage] = useState(1);
  // Перенесли загрузку пагинированных учеников внутрь контейнера грида,
  // чтобы родитель не перерисовывался на каждом запросе поиска
  const isLoading = false as unknown as boolean;
  const isFetching = false as unknown as boolean;
  const students: Student[] = [] as unknown as Student[];
  const total = 0 as unknown as number;
  const { data: allStudents = [] } = useStudents();
  const { data: groups = [] } = useGroups();
  const { data: lessons = [] } = useLessons();
  const { data: teachers = [] } = useTeachers();
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  
  const [sortBy, setSortBy] = useState<"name" | "age" | "id">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

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

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, sortOrder]);

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

  const deleteConfirm = useConfirmDelete(async (id: string) => {
    try {
      await deleteStudent.mutateAsync(id);
    } catch (error) {
      // Error is handled by the mutation
    }
  });

  // Показать общий лоадер только при самом первом запросе (когда данных ещё нет)
  if (isLoading && allStudents.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ученики"
        description="Управление базой учащихся"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setIsExportDialogOpen(true)}
              size="sm"
              className="sm:size-default"
            >
              <FileText className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Экспорт</span>
            </Button>
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) setEditingStudent(null);
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" className="sm:size-default">
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Добавить ученика</span>
                  <span className="sm:hidden">Добавить</span>
                </Button>
              </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>
                {editingStudent ? "Редактировать ученика" : "Новый ученик"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Section: Личные данные */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Личные данные</h4>
                
                {/* ФИО - Full width */}
                <div className="space-y-1.5">
                  <Label htmlFor="name">ФИО *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Иван Иванов"
                    defaultValue={editingStudent?.name}
                    required
                  />
                </div>

                {/* Возраст & Телефон - Two columns */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="age">Возраст *</Label>
                    <Input
                      id="age"
                      name="age"
                      type="number"
                      placeholder="14"
                      defaultValue={editingStudent?.age}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Телефон *</Label>
                    <Input
                      id="phone"
                      name="phone"
                      placeholder="+7 (777) 123-45-67"
                      defaultValue={editingStudent?.phone}
                      onChange={(e) => {
                        e.currentTarget.value = formatKzPhone(e.currentTarget.value);
                      }}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-100 dark:border-slate-800" />

              {/* Section: Дополнительно */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Дополнительно</h4>

                {/* Email & Предметы - Two columns */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="ivan@mail.ru"
                      defaultValue={editingStudent?.email}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="subjects">Предметы *</Label>
                    <Input
                      id="subjects"
                      name="subjects"
                      placeholder="Математика, Физика"
                      defaultValue={editingStudent?.subjects.join(", ")}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#a855f7] hover:opacity-90 text-white shadow-md"
                >
                  {editingStudent ? "Сохранить изменения" : "Добавить ученика"}
                </Button>
              </div>
            </form>
          </DialogContent>
            </Dialog>
          </>
        }
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Поиск учеников"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
        {searchQuery && (
          <button
            type="button"
            aria-label="Очистить поиск"
            onClick={() => {
              setSearchQuery("");
              setCurrentPage(1);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium hidden sm:inline">Сортировка:</span>
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as "name" | "age" | "id")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">По алфавиту</SelectItem>
            <SelectItem value="age">По возрасту</SelectItem>
            <SelectItem value="id">По дате добавления</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          className="gap-2"
        >
          <ArrowUpDown className="h-4 w-4" />
          {sortOrder === "asc" ? "Возрастание" : "Убывание"}
        </Button>
      </div>
      <StudentsGridContainer
        query={debouncedQuery}
        page={currentPage}
        pageSize={ITEMS_PER_PAGE}
        groups={groups}
        lessons={lessons}
        teachers={teachers}
        allStudents={allStudents as Student[]}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onEdit={handleEdit}
        onDelete={(id) => deleteConfirm.open(id)}
        onNavigate={(id) => navigate(`/students/${id}`)}
        onPageChange={setCurrentPage}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm.isOpen}
        onOpenChange={(open) => !open && deleteConfirm.close()}
        title="Удалить ученика"
        description="Вы уверены, что хотите удалить этого ученика? Это действие нельзя отменить."
        confirmText="Удалить"
        cancelText="Отмена"
        variant="destructive"
        onConfirm={deleteConfirm.confirm}
      />

      {/* Export Dialog */}
      <ExportDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        type="students"
        teachers={teachers.map(t => ({ id: t.id, name: t.name }))}
        groups={groups.map(g => ({ id: g.id, name: g.name }))}
        students={allStudents.map(s => ({ id: s.id, name: s.name }))}
      />
    </div>
  );
}

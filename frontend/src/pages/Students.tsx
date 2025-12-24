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
  useAllBalances,
  useAllSubscriptions,
} from "@/hooks/useData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Mail, Phone, Trash2, Edit, Loader2, AlertCircle, Clock, X, FileText, FileSpreadsheet } from "lucide-react";
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
  activeMap,
  onEdit,
  onDelete,
  onNavigate,
}: {
  students: Student[];
  groups: ReturnType<typeof useGroups>["data"];
  lessons: ReturnType<typeof useLessons>["data"];
  teachers: ReturnType<typeof useTeachers>["data"];
  isFetching: boolean;
  activeMap: Record<string, boolean>;
  onEdit: (s: Student) => void;
  onDelete: (id: string) => void;
  onNavigate: (id: string) => void;
}) {
  const getIsActiveBySchedule = (student: Student) => {
    const studentLessons = (lessons || []).filter((l) =>
      l.studentIds?.includes(student.id) ||
      (l.groupId && student.groupIds?.includes(l.groupId))
    );
    return studentLessons.some((l) => moment(l.start).isAfter(moment()));
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
        const hasUpcomingLessons = getIsActiveBySchedule(student);
        const isActive = activeMap[student.id] ?? hasUpcomingLessons;

        return (
          <Card 
            key={student.id} 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onNavigate(student.id)}
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
                {(() => {
                  // If status is manually set to inactive/frozen/graduated, use it
                  // Otherwise use computed status (getIsActive) for consistency with filtering
                  const displayStatus = student.status === "inactive" || student.status === "frozen" || student.status === "graduated"
                    ? student.status
                    : (isActive ? "active" : "inactive");
                  
                  const statusLabels: Record<string, string> = {
                    active: "Активный",
                    inactive: "Неактивный",
                    frozen: "Заморожен",
                    graduated: "Закончил",
                  };
                  
                  return (
                    <Badge variant={displayStatus === "active" ? "default" : "secondary"}>
                      {statusLabels[displayStatus] || "Неактивный"}
                    </Badge>
                  );
                })()}
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
                {(() => {
                  // build schedule string quickly from lessons
                  const sl = (lessons || []).filter((l) =>
                    (l.studentIds?.includes(student.id) || (l.groupId && student.groupIds?.includes(l.groupId))) &&
                    l.status !== "cancelled"
                  );
                  if (sl.length === 0) return null;
                  const weekdayNames = ["ВС","ПН","ВТ","СР","ЧТ","ПТ","СБ"];
                  const map = new Map<number, string>();
                  sl.forEach((l) => {
                    const d = moment(l.start);
                    map.set(d.day(), `${d.format("HH:mm")} - ${moment(l.end).format("HH:mm")}`);
                  });
                  const keys = Array.from(map.keys()).sort((a,b)=> (a===0?7:a)-(b===0?7:b));
                  const label = keys.map(k=>weekdayNames[k===0?0:k]).join(" ");
                  const time = map.get(keys[0]);
                  return (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {label} {time}
                    </div>
                  );
                })()}

                {/* Next Lesson Info */}
                {nextLesson && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-green-700" />
                      <p className="text-sm font-medium text-green-900">Ближайшее занятие:</p>
                    </div>
                    <p className="text-sm text-green-800">
                      {moment(nextLesson.start).locale("ru").format("DD MMMM, dddd")} в {moment(nextLesson.start).locale("ru").format("HH:mm")}
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
                      onEdit(student);
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
                      onDelete(student.id);
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
  balances,
  subscriptions,
  allStudents,
  activityFilter,
  getIsActive,
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
  balances: any[];
  subscriptions: any[];
  allStudents: Student[];
  activityFilter: "all" | "active" | "inactive";
  getIsActive: (s: Student) => boolean;
  onEdit: (s: Student) => void;
  onDelete: (id: string) => void;
  onNavigate: (id: string) => void;
  onPageChange: (p: number) => void;
}) {
  const { data: paged, isFetching } = useStudentsPaged(query, page, pageSize);
  const students: Student[] = (paged as any)?.items ?? [];
  const total = (paged as any)?.total ?? 0;

  // Если включен фильтр активности и нет поискового запроса,
  // используем полный список с клиентской пагинацией, чтобы не терять элементы между страницами
  const baseList: Student[] = React.useMemo(() => {
    if ((activityFilter === "active" || activityFilter === "inactive") && !query) {
      return allStudents || [];
    }
    return students;
  }, [activityFilter, query, allStudents, students]);

  const filteredStudents = React.useMemo(() => {
    if (activityFilter === "active") return baseList.filter(getIsActive);
    if (activityFilter === "inactive") return baseList.filter((s) => !getIsActive(s));
    return baseList;
  }, [baseList, activityFilter, getIsActive]);

  const totalPages = Math.ceil(((activityFilter === "all" || query) ? (total || 0) : filteredStudents.length) / pageSize) || 1;

  const paginatedStudents = React.useMemo(() => {
    if (activityFilter === "all" || query) {
      return filteredStudents;
    }
    const start = (page - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, activityFilter, query, page, pageSize]);

  const activeMap = React.useMemo(() => {
    const map: Record<string, boolean> = {};
    paginatedStudents.forEach((s) => { map[s.id] = getIsActive(s); });
    return map;
  }, [paginatedStudents, getIsActive]);

  return (
    <>
      <StudentsGrid
        students={paginatedStudents}
        groups={groups}
        lessons={lessons}
        teachers={teachers}
        isFetching={isFetching}
        activeMap={activeMap}
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
  const { data: balances = [] } = useAllBalances();
  const { data: subscriptions = [] } = useAllSubscriptions();
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  
  const [activityFilter, setActivityFilter] = useState<"all" | "active" | "inactive">("active");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Build quick lookup maps for balances and active subscriptions
  const balanceMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    (balances as any[]).forEach((b: any) => { map[b.studentId] = b.balance; });
    return map;
  }, [balances]);

  const activeSubMap = React.useMemo(() => {
    const map: Record<string, boolean> = {};
    const now = new Date();
    (subscriptions as any[]).forEach((s: any) => {
      const notExpired = s.paidTill ? (new Date(s.paidTill) >= now) : false;
      const hasLessons = (s.lessonsRemaining ?? 0) > 0;
      if (s.status === "active" && (hasLessons || notExpired)) {
        map[s.studentId] = true;
      }
    });
    return map;
  }, [subscriptions]);

  // Activity: upcoming lessons OR positive balance OR active subscription
  // BUT: if student.status === "inactive", always return false
  const getIsActive = React.useCallback((student: Student) => {
    // Если статус вручную установлен как "inactive", студент неактивен
    if (student.status === "inactive") {
      return false;
    }
    const studentLessons = lessons.filter((l) => 
      l.studentIds?.includes(student.id) || 
      (l.groupId && student.groupIds?.includes(l.groupId))
    );
    const bySchedule = studentLessons.some((l) => moment(l.start).isAfter(moment()));
    const byBalance = (balanceMap[student.id] ?? 0) > 0;
    const bySubscription = !!activeSubMap[student.id];
    // Активный только если ВСЕ три условия выполняются
    return bySchedule && byBalance && bySubscription;
  }, [lessons, balanceMap, activeSubMap]);

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

  // Фильтрация и пагинация перенесены в контейнер грида

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

      {/* Activity Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium hidden sm:inline">Статус:</span>
        <Button
          variant={activityFilter === "active" ? "default" : "outline"}
          size="sm"
          onClick={() => setActivityFilter("active")}
        >
          <span className="hidden sm:inline">Активные ({(allStudents as Student[]).filter(s => getIsActive(s)).length})</span>
          <span className="sm:hidden">Активн. ({(allStudents as Student[]).filter(s => getIsActive(s)).length})</span>
        </Button>
        <Button
          variant={activityFilter === "inactive" ? "default" : "outline"}
          size="sm"
          onClick={() => setActivityFilter("inactive")}
        >
          <span className="hidden sm:inline">Неактивные ({(allStudents as Student[]).filter(s => !getIsActive(s)).length})</span>
          <span className="sm:hidden">Неакт. ({(allStudents as Student[]).filter(s => !getIsActive(s)).length})</span>
        </Button>
        <Button
          variant={activityFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setActivityFilter("all")}
        >
          Все ({(allStudents as Student[]).length})
        </Button>
      </div>
      <StudentsGridContainer
        query={debouncedQuery}
        page={currentPage}
        pageSize={ITEMS_PER_PAGE}
        groups={groups}
        lessons={lessons}
        teachers={teachers}
        balances={balances}
        subscriptions={subscriptions}
        allStudents={allStudents as Student[]}
        activityFilter={activityFilter}
        getIsActive={getIsActive}
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

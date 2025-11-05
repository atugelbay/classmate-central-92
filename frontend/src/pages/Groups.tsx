import { useState, useEffect } from "react";
import moment from "moment";
import "moment/locale/ru";
import { useGroups, useCreateGroup, useUpdateGroup, useDeleteGroup, useTeachers, useStudents, useRooms, useCheckConflicts, useLessons, useExtendGroup } from "@/hooks/useData";

moment.locale("ru");
import { GroupScheduleForm } from "@/components/GroupScheduleForm";
import { LessonFormModal } from "@/components/LessonFormModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, Clock, Trash2, Edit, Loader2, X, AlertTriangle, MapPin } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { CheckConflictsResponse } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Group } from "@/types";

const ITEMS_PER_PAGE = 39;

export default function Groups() {
  const { data: groups = [], isLoading } = useGroups();
  const { data: teachers = [] } = useTeachers();
  const { data: students = [] } = useStudents();
  const { data: rooms = [] } = useRooms();
  const { data: lessons = [] } = useLessons();
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();
  const extendGroup = useExtendGroup();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [activityFilter, setActivityFilter] = useState<"all" | "active" | "inactive">("active");
  const [currentPage, setCurrentPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLessonFormOpen, setIsLessonFormOpen] = useState(false);
  const [lessonFormData, setLessonFormData] = useState<any>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [selectedGroupForDetails, setSelectedGroupForDetails] = useState<Group | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [scheduleData, setScheduleData] = useState<{
    weekdays: number[];
    startTime: string;
    endTime: string;
    roomId: string;
  }>({
    weekdays: [],
    startTime: "10:00",
    endTime: "11:30",
    roomId: "",
  });
  const [conflicts, setConflicts] = useState<CheckConflictsResponse | null>(null);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  
  const checkConflictsMutation = useCheckConflicts();

  // Проверка конфликтов для расписания группы
  useEffect(() => {
    const checkScheduleConflicts = async () => {
      if (!selectedTeacherId || !scheduleData.roomId || scheduleData.weekdays.length === 0 || !scheduleData.startTime || !scheduleData.endTime) {
        setConflicts(null);
        return;
      }

      setCheckingConflicts(true);
      try {
        // Берем ближайший выбранный день недели для проверки конфликтов
        const today = moment();
        const targetDay = scheduleData.weekdays[0];
        let checkDate = moment(today);
        
        // Найти ближайший день недели из выбранных
        while (checkDate.day() !== targetDay) {
          checkDate.add(1, "day");
        }

        const startDateTime = moment(checkDate.format("YYYY-MM-DD") + " " + scheduleData.startTime);
        const endDateTime = moment(checkDate.format("YYYY-MM-DD") + " " + scheduleData.endTime);

        const result = await checkConflictsMutation.mutateAsync({
          teacherId: selectedTeacherId,
          roomId: scheduleData.roomId,
          start: startDateTime.toISOString(),
          end: endDateTime.toISOString(),
        });

        setConflicts(result);
      } catch (error) {
        console.error("Error checking conflicts:", error);
      } finally {
        setCheckingConflicts(false);
      }
    };

    // Debounce проверку конфликтов
    const timeoutId = setTimeout(() => {
      checkScheduleConflicts();
    }, 500);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeacherId, scheduleData.roomId, scheduleData.startTime, scheduleData.endTime, JSON.stringify(scheduleData.weekdays)]);

  // Extract schedule from group lessons if schedule field is empty
  const getGroupScheduleFromLessons = (groupId: string): string => {
    const groupLessons = lessons.filter((l) => l.groupId === groupId && l.status !== "cancelled");
    if (groupLessons.length === 0) return "";
    
    // Group lessons by weekday and find most common time for each weekday
    const weekdayMap = new Map<number, Map<string, number>>(); // weekday -> timeString -> count
    
    groupLessons.forEach((lesson) => {
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
  
  // Get group activity info
  const getGroupActivity = (group: Group) => {
    const groupLessons = lessons.filter((l) => l.groupId === group.id);
    const now = moment();
    const upcomingLessons = groupLessons.filter((l) => moment(l.start).isAfter(now));
    const completedLessons = groupLessons.filter((l) => l.status === "completed");
    
    // Group is active if:
    // 1. Has upcoming lessons, OR
    // 2. Has active students (in enrollment) AND group status is "active", OR
    // 3. Has a schedule defined AND group status is "active"
    const hasActiveStudents = group.studentIds && group.studentIds.length > 0;
    const hasSchedule = group.schedule && group.schedule.trim().length > 0;
    const groupStatusActive = group.status === "active" || !group.status; // Default to active if not set
    
    const isActive = upcomingLessons.length > 0 || 
                     (hasActiveStudents && groupStatusActive) || 
                     (hasSchedule && groupStatusActive);
    
    const nextLesson = upcomingLessons.length > 0 
      ? upcomingLessons.sort((a, b) => moment(a.start).diff(moment(b.start)))[0]
      : undefined;
    
    return {
      isActive,
      totalLessons: groupLessons.length,
      upcomingLessons: upcomingLessons.length,
      completedLessons: completedLessons.length,
      nextLesson,
    };
  };
  
  // Get schedule for a group (from schedule field or extracted from lessons)
  const getGroupSchedule = (group: Group): string => {
    if (group.schedule && group.schedule.trim()) {
      return group.schedule;
    }
    return getGroupScheduleFromLessons(group.id);
  };

  const filteredGroups = groups.filter((group) => {
    // Search filter
    const matchesSearch = 
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.subject.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // Activity filter
    if (activityFilter !== "all") {
      const activity = getGroupActivity(group);
      if (activityFilter === "active" && !activity.isActive) return false;
      if (activityFilter === "inactive" && activity.isActive) return false;
    }
    
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredGroups.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedGroups = filteredGroups.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activityFilter]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Format schedule string from scheduleData
    const weekdayNames = ["ВС", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"];
    const scheduleString = scheduleData.weekdays.length > 0
      ? `${scheduleData.weekdays.map(d => weekdayNames[d]).join(" ")} ${scheduleData.startTime} - ${scheduleData.endTime}`
      : "";
    
    const groupData = {
      name: formData.get("name") as string,
      subject: formData.get("subject") as string,
      teacherId: selectedTeacherId || (formData.get("teacherId") as string),
      schedule: scheduleString,
      roomId: scheduleData.roomId,
      studentIds: selectedStudents,
    };

    try {
      if (editingGroup) {
        await updateGroup.mutateAsync({ id: editingGroup.id, data: groupData });
      } else {
        const createdGroup = await createGroup.mutateAsync(groupData as any);
        // Автоматически генерировать уроки для новой группы если есть расписание
        if (createdGroup && scheduleData.weekdays.length > 0) {
          try {
            const { groupsAPI } = await import("@/api/groups");
            await groupsAPI.generateLessons(createdGroup.id);
          } catch (genError) {
            console.error("Failed to generate lessons:", genError);
            // Не показываем ошибку пользователю, группа уже создана
          }
        }
      }
      setIsDialogOpen(false);
      setEditingGroup(null);
      setSelectedStudents([]);
      setSelectedTeacherId("");
      setConflicts(null);
      setScheduleData({
        weekdays: [],
        startTime: "10:00",
        endTime: "11:30",
        roomId: "",
      });
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleEdit = (group: Group) => {
    setEditingGroup(group);
    setSelectedStudents(group.studentIds || []);
    setSelectedTeacherId(group.teacherId || "");
    
    // Parse schedule string to extract weekdays and time
    // Format: "ПН СР ПТ 20:00 - 21:30" or "Пн, Ср, Пт 20:00-21:30" (for backwards compatibility)
    if (group.schedule) {
      const weekdayMap: Record<string, number> = {
        "пн": 1, "понедельник": 1, "pn": 1,
        "вт": 2, "вторник": 2, "vt": 2,
        "ср": 3, "среда": 3, "sr": 3,
        "чт": 4, "четверг": 4, "cht": 4,
        "пт": 5, "пятница": 5, "pt": 5,
        "сб": 6, "суббота": 6, "sb": 6,
        "вс": 0, "воскресенье": 0, "vs": 0,
      };
      
      const scheduleLower = group.schedule.toLowerCase();
      const parsedWeekdays: number[] = [];
      
      Object.entries(weekdayMap).forEach(([key, value]) => {
        if (scheduleLower.includes(key)) {
          if (!parsedWeekdays.includes(value)) {
            parsedWeekdays.push(value);
          }
        }
      });
      
      // Extract time - supports both "10:00-11:30" and "10:00 - 11:30" formats
      const timeMatch = group.schedule.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
      const startTime = timeMatch?.[1] || "10:00";
      const endTime = timeMatch?.[2] || "11:30";
      
      setScheduleData({
        weekdays: parsedWeekdays.sort(),
        startTime,
        endTime,
        roomId: group.roomId || "",
      });
    }
    
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Вы уверены, что хотите удалить эту группу?")) {
      try {
        await deleteGroup.mutateAsync(id);
      } catch (error) {
        // Error is handled by the mutation
      }
    }
  };

  const toggleStudent = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const removeStudent = (studentId: string) => {
    setSelectedStudents(prev => prev.filter(id => id !== studentId));
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
          <h1 className="text-3xl font-bold">Группы</h1>
          <p className="text-muted-foreground">Управление учебными группами</p>
        </div>
        <Button onClick={() => {
          setLessonFormData({ lessonType: "group" });
          setIsLessonFormOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Создать группу
        </Button>
        
        {/* Dialog for editing existing groups */}
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingGroup(null);
              setSelectedStudents([]);
              setSelectedTeacherId("");
              setConflicts(null);
              setScheduleData({
                weekdays: [],
                startTime: "10:00",
                endTime: "11:30",
                roomId: "",
              });
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingGroup ? "Редактировать группу" : "Новая группа"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Название группы</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingGroup?.name}
                  required
                />
              </div>
              <div>
                <Label htmlFor="subject">Предмет</Label>
                <Input
                  id="subject"
                  name="subject"
                  defaultValue={editingGroup?.subject}
                  required
                />
              </div>
              <div>
                <Label htmlFor="teacherId">Преподаватель</Label>
                <Select
                  name="teacherId"
                  value={selectedTeacherId}
                  onValueChange={setSelectedTeacherId}
                  required
                >
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
              {/* Schedule Selection */}
              <GroupScheduleForm
                initialWeekdays={scheduleData.weekdays}
                initialStartTime={scheduleData.startTime}
                initialEndTime={scheduleData.endTime}
                initialRoomId={scheduleData.roomId}
                rooms={rooms}
                onScheduleChange={setScheduleData}
              />
              
              {/* Conflict Warning */}
              {checkingConflicts && (
                <Alert>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertDescription>
                    Проверка конфликтов расписания...
                  </AlertDescription>
                </Alert>
              )}
              
              {conflicts && conflicts.hasConflicts && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-semibold mb-2">Обнаружены конфликты в расписании:</p>
                    {conflicts.conflicts.map((conflict, idx) => (
                      <p key={idx} className="text-sm">
                        - {conflict.title} ({moment(conflict.start).format("HH:mm")} - {moment(conflict.end).format("HH:mm")})
                        {conflict.conflictType === "teacher" && ` - Учитель занят`}
                        {conflict.conflictType === "room" && ` - Аудитория занята`}
                      </p>
                    ))}
                    {conflicts.suggestedTimes && conflicts.suggestedTimes.length > 0 && (
                      <div className="mt-3">
                        <p className="font-semibold text-sm mb-1">Предложенное время:</p>
                        {conflicts.suggestedTimes.map((time, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            type="button"
                            className="mr-2 mb-1"
                            onClick={() => {
                              setScheduleData(prev => ({
                                ...prev,
                                startTime: moment(time.start).format("HH:mm"),
                                endTime: moment(time.end).format("HH:mm"),
                                roomId: time.roomId || prev.roomId,
                              }));
                              setConflicts(null);
                            }}
                          >
                            {moment(time.start).format("HH:mm")} - {moment(time.end).format("HH:mm")}
                            {time.roomName && ` (${time.roomName})`}
                          </Button>
                        ))}
                      </div>
                    )}
                    <p className="text-sm mt-2">
                      Вы все равно можете создать группу, конфликты будут учтены при генерации уроков.
                    </p>
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Students Selection */}
              <div className="space-y-3">
                <Label>Студенты группы</Label>
                
                {/* Selected Students */}
                {selectedStudents.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    {selectedStudents.map(studentId => {
                      const student = students.find(s => s.id === studentId);
                      return student ? (
                        <Badge key={studentId} variant="secondary" className="flex items-center gap-1">
                          {student.name}
                          <X 
                            className="h-3 w-3 cursor-pointer hover:text-destructive" 
                            onClick={() => removeStudent(studentId)}
                          />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
                
                {/* Student Selector */}
                <Select onValueChange={toggleStudent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Добавить студента" />
                  </SelectTrigger>
                  <SelectContent>
                    {students
                      .filter(s => !selectedStudents.includes(s.id))
                      .map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
                
                <p className="text-sm text-muted-foreground">
                  Выбрано студентов: {selectedStudents.length}
                </p>
              </div>
              
              <Button type="submit" className="w-full">
                {editingGroup ? "Сохранить" : "Создать"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию или предмету..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Статус:</span>
          <Button
            variant={activityFilter === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setActivityFilter("active")}
          >
            Активные ({groups.filter(g => getGroupActivity(g).isActive).length})
          </Button>
          <Button
            variant={activityFilter === "inactive" ? "default" : "outline"}
            size="sm"
            onClick={() => setActivityFilter("inactive")}
          >
            Неактивные ({groups.filter(g => !getGroupActivity(g).isActive).length})
          </Button>
          <Button
            variant={activityFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setActivityFilter("all")}
          >
            Все ({groups.length})
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {paginatedGroups.map((group) => {
          // teacherName is already populated via JOIN from backend
          const groupStudents = students.filter((s) =>
            group.studentIds && group.studentIds.includes(s.id)
          );
          const activity = getGroupActivity(group);
          const room = rooms.find((r) => r.id === group.roomId);

          return (
            <Card 
              key={group.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedGroupForDetails(group)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{group.name}</h3>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary">
                        {group.subject}
                      </Badge>
                      <Badge variant={activity.isActive ? "default" : "outline"}>
                        {activity.isActive ? "Активна" : "Неактивна"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Activity Summary */}
                  {activity.isActive && activity.nextLesson && (
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm font-medium text-green-900 mb-1">
                        Следующее занятие:
                      </p>
                      <p className="text-sm text-green-800">
                        {moment(activity.nextLesson.start).format("DD MMMM, dddd")}
                      </p>
                      <p className="text-sm text-green-800">
                        {moment(activity.nextLesson.start).format("HH:mm")} - {moment(activity.nextLesson.end).format("HH:mm")}
                      </p>
                    </div>
                  )}
                  
                  {/* Stats */}
                  {activity.totalLessons > 0 && (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <p className="text-muted-foreground">Запланировано</p>
                        <p className="font-semibold text-blue-900">{activity.upcomingLessons}</p>
                      </div>
                      <div className="p-2 bg-gray-50 rounded-lg">
                        <p className="text-muted-foreground">Проведено</p>
                        <p className="font-semibold">{activity.completedLessons}</p>
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Преподаватель
                    </p>
                    <p className="font-medium">{group.teacherName || "Не назначен"}</p>
                  </div>
                  {getGroupSchedule(group) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {getGroupSchedule(group)}
                    </div>
                  )}
                  {room && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {room.name}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{groupStudents.length}</span>
                    <span className="text-muted-foreground">учеников</span>
                  </div>
                  {groupStudents.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-medium">Ученики:</p>
                      <div className="flex flex-wrap gap-2">
                        {groupStudents.slice(0, 3).map((student) => (
                          <Badge key={student.id} variant="outline">
                            {student.name}
                          </Badge>
                        ))}
                        {groupStudents.length > 3 && (
                          <Badge variant="outline">
                            +{groupStudents.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        extendGroup.mutate(group.id);
                      }}
                      disabled={extendGroup.isPending}
                    >
                      {extendGroup.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Clock className="h-4 w-4 mr-2" />
                      )}
                      Продлить
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(group);
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Изменить
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(group.id);
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
      
      {/* Lesson Form Modal for creating groups/lessons */}
      <LessonFormModal
        open={isLessonFormOpen}
        onOpenChange={setIsLessonFormOpen}
        teachers={teachers}
        groups={groups}
        rooms={rooms}
        students={students}
        initialData={lessonFormData}
        mode="create"
        allowLessonTypeChange={false}
        onSuccess={() => {
          setLessonFormData(null);
        }}
      />

      {/* Group Details Modal */}
      {selectedGroupForDetails && (
        <Dialog open={!!selectedGroupForDetails} onOpenChange={() => setSelectedGroupForDetails(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl">{selectedGroupForDetails.name}</DialogTitle>
            </DialogHeader>
            
            {(() => {
              const activity = getGroupActivity(selectedGroupForDetails);
              // teacherName is already populated via JOIN from backend
              const groupStudents = students.filter((s) =>
                selectedGroupForDetails.studentIds && selectedGroupForDetails.studentIds.includes(s.id)
              );
              const room = rooms.find((r) => r.id === selectedGroupForDetails.roomId);
              const groupLessons = lessons.filter((l) => l.groupId === selectedGroupForDetails.id);
              const upcomingLessons = groupLessons.filter((l) => moment(l.start).isAfter(moment())).sort((a, b) => moment(a.start).diff(moment(b.start)));

              return (
                <div className="space-y-6">
                  {/* Status and Subject */}
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-base px-3 py-1">
                      {selectedGroupForDetails.subject}
                    </Badge>
                    <Badge variant={activity.isActive ? "default" : "outline"} className="text-base px-3 py-1">
                      {activity.isActive ? "Активна" : "Неактивна"}
                    </Badge>
                  </div>

                  {/* Main Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Преподаватель</p>
                        <p className="font-semibold">{selectedGroupForDetails.teacherName || "Не назначен"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Расписание</p>
                        {getGroupSchedule(selectedGroupForDetails) ? (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium">{getGroupSchedule(selectedGroupForDetails)}</p>
                          </div>
                        ) : (
                          <p className="font-medium text-muted-foreground">Не установлено</p>
                        )}
                      </div>
                      {room && (
                        <div>
                          <p className="text-sm text-muted-foreground">Аудитория</p>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium">{room.name}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Всего занятий</p>
                        <p className="text-2xl font-bold text-blue-900">{activity.totalLessons}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 bg-green-50 rounded-lg">
                          <p className="text-xs text-muted-foreground">Проведено</p>
                          <p className="text-xl font-semibold text-green-900">{activity.completedLessons}</p>
                        </div>
                        <div className="p-3 bg-orange-50 rounded-lg">
                          <p className="text-xs text-muted-foreground">Запланировано</p>
                          <p className="text-xl font-semibold text-orange-900">{activity.upcomingLessons}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Next Lesson */}
                  {activity.nextLesson && (
                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                      <p className="text-sm font-medium text-green-900 mb-2">Ближайшее занятие:</p>
                      <p className="text-lg font-semibold text-green-800">
                        {moment(activity.nextLesson.start).format("DD MMMM, dddd")}
                      </p>
                      <p className="text-md text-green-700">
                        {moment(activity.nextLesson.start).format("HH:mm")} - {moment(activity.nextLesson.end).format("HH:mm")}
                      </p>
                    </div>
                  )}

                  {/* Students List */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold text-lg">Студенты ({groupStudents.length})</h3>
                    </div>
                    {groupStudents.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {groupStudents.map((student) => (
                          <div key={student.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                            <p className="font-medium">{student.name}</p>
                            {student.phone && (
                              <p className="text-sm text-muted-foreground">{student.phone}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Нет студентов в группе</p>
                    )}
                  </div>

                  {/* Upcoming Lessons */}
                  {upcomingLessons.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-lg mb-3">Предстоящие занятия</h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {upcomingLessons.slice(0, 10).map((lesson) => (
                          <div key={lesson.id} className="p-3 border rounded-lg flex justify-between items-center">
                            <div>
                              <p className="font-medium">{lesson.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {moment(lesson.start).format("DD MMMM, dddd")}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">
                                {moment(lesson.start).format("HH:mm")} - {moment(lesson.end).format("HH:mm")}
                              </p>
                              <p className="text-sm text-muted-foreground">{room?.name}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

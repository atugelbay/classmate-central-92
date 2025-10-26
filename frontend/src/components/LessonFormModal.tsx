import { useState, useEffect } from "react";
import moment from "moment";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentSelector } from "@/components/StudentSelector";
import { Teacher, Group, Room, Student, Lesson, CheckConflictsResponse } from "@/types";
import { AlertTriangle, Loader2, CheckCircle, Plus } from "lucide-react";
import { useCheckConflicts, useCreateLesson, useCreateBulkLessons, useUpdateLesson, useCreateGroup } from "@/hooks/useData";
import { toast } from "sonner";

interface LessonFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teachers: Teacher[];
  groups: Group[];
  rooms: Room[];
  students: Student[];
  initialData?: Partial<Lesson> & {
    date?: Date;
    startTime?: string;
    endTime?: string;
    lessonType?: "group" | "individual";
  };
  mode?: "create" | "edit";
  onSuccess?: () => void;
  allowLessonTypeChange?: boolean; // Если true, показываем переключатель типа урока
}

const WEEKDAYS = [
  { value: 1, label: "Пн" },
  { value: 2, label: "Вт" },
  { value: 3, label: "Ср" },
  { value: 4, label: "Чт" },
  { value: 5, label: "Пт" },
  { value: 6, label: "Сб" },
  { value: 0, label: "Вс" },
];

export function LessonFormModal({
  open,
  onOpenChange,
  teachers,
  groups,
  rooms,
  students,
  initialData,
  mode = "create",
  onSuccess,
  allowLessonTypeChange = true,
}: LessonFormModalProps) {
  const [lessonType, setLessonType] = useState<"group" | "individual">(
    initialData?.lessonType || (initialData?.groupId ? "group" : "individual")
  );
  const [seriesMode, setSeriesMode] = useState(false);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [seriesEndDate, setSeriesEndDate] = useState("");

  // New group creation
  const [isCreatingNewGroup, setIsCreatingNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  // Form fields
  const [title, setTitle] = useState(initialData?.title || "");
  const [subject, setSubject] = useState(initialData?.subject || "");
  const [teacherId, setTeacherId] = useState(initialData?.teacherId || "");
  const [groupId, setGroupId] = useState(initialData?.groupId || "");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(initialData?.studentIds || []);
  const [date, setDate] = useState(
    initialData?.date ? moment(initialData.date).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD")
  );
  const [startTime, setStartTime] = useState(initialData?.startTime || "10:00");
  const [endTime, setEndTime] = useState(initialData?.endTime || "11:30");
  const [roomId, setRoomId] = useState(initialData?.roomId || "");

  // Conflict checking
  const [conflicts, setConflicts] = useState<CheckConflictsResponse | null>(null);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const checkConflictsMutation = useCheckConflicts();

  const createLesson = useCreateLesson();
  const createBulkLessons = useCreateBulkLessons();
  const updateLesson = useUpdateLesson();
  const createGroup = useCreateGroup();

  // Sync form fields with initialData when it changes
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setSubject(initialData.subject || "");
      setTeacherId(initialData.teacherId || "");
      setGroupId(initialData.groupId || "");
      setSelectedStudentIds(initialData.studentIds || []);
      setDate(initialData.date ? moment(initialData.date).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD"));
      setStartTime(initialData.startTime || "10:00");
      setEndTime(initialData.endTime || "11:30");
      setRoomId(initialData.roomId || "");
      if (initialData.lessonType) {
        setLessonType(initialData.lessonType);
      }
    }
  }, [initialData]);

  // Auto-fill from group
  useEffect(() => {
    if (lessonType === "group" && groupId) {
      const group = groups.find((g) => g.id === groupId);
      if (group) {
        if (!subject) setSubject(group.subject);
        if (!teacherId) setTeacherId(group.teacherId);
        if (!roomId && group.roomId) setRoomId(group.roomId);
        if (group.studentIds) setSelectedStudentIds(group.studentIds);
        if (!title) setTitle(group.name);
      }
    }
  }, [lessonType, groupId, groups]);

  // Check conflicts when relevant fields change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (teacherId && roomId && startTime && endTime) {
        handleCheckConflicts();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [teacherId, roomId, date, startTime, endTime]);

  const handleCheckConflicts = async () => {
    if (!teacherId || !roomId || !startTime || !endTime) return;

    setCheckingConflicts(true);
    try {
      const start = new Date(`${date}T${startTime}`).toISOString();
      const end = new Date(`${date}T${endTime}`).toISOString();

      const result = await checkConflictsMutation.mutateAsync({
        teacherId,
        roomId,
        start,
        end,
        excludeLessonId: mode === "edit" ? initialData?.id : undefined,
      });

      setConflicts(result);
    } catch (error) {
      // Error handled by mutation
    } finally {
      setCheckingConflicts(false);
    }
  };

  const handleUseSuggestedTime = (suggestedStart: string, suggestedEnd: string, suggestedRoomId?: string) => {
    const startMoment = moment(suggestedStart);
    const endMoment = moment(suggestedEnd);
    setStartTime(startMoment.format("HH:mm"));
    setEndTime(endMoment.format("HH:mm"));
    if (suggestedRoomId) {
      setRoomId(suggestedRoomId);
    }
    setConflicts(null);
  };

  const toggleWeekday = (day: number) => {
    setSelectedWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSubmit = async (forceCreate = false) => {
    if (!forceCreate && conflicts?.hasConflicts) {
      toast.error("Есть конфликты. Используйте предложенное время или подтвердите создание.");
      return;
    }

    try {
      let finalGroupId = groupId;

      // Create new group if needed
      if (lessonType === "group" && isCreatingNewGroup && newGroupName.trim()) {
        const weekdayNames = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
        const scheduleString = selectedWeekdays.length > 0
          ? `${selectedWeekdays.map(d => weekdayNames[d]).join(", ")} ${startTime}-${endTime}`
          : "";

        const newGroup = await createGroup.mutateAsync({
          name: newGroupName,
          subject,
          teacherId,
          schedule: scheduleString,
          roomId,
          studentIds: selectedStudentIds,
        } as any);

        finalGroupId = newGroup.id;
        toast.success("Группа создана");
      }

      const start = new Date(`${date}T${startTime}`);
      const end = new Date(`${date}T${endTime}`);
      const selectedRoom = rooms.find((r) => r.id === roomId);

      const lessonData = {
        title,
        subject,
        teacherId,
        groupId: lessonType === "group" ? finalGroupId : undefined,
        studentIds: lessonType === "individual" ? selectedStudentIds : [],
        start,
        end,
        room: selectedRoom?.name || "",
        roomId,
        status: "scheduled" as const,
        lessonType,
      };

      if (mode === "edit" && initialData?.id) {
        await updateLesson.mutateAsync({
          id: initialData.id,
          data: lessonData as any,
        });
        toast.success("Урок обновлен");
      } else if (seriesMode && selectedWeekdays.length > 0) {
        // Create series
        const lessons = generateSeriesLessons(lessonData, selectedWeekdays, seriesEndDate);
        await createBulkLessons.mutateAsync({ lessons });
      } else {
        // Create single lesson
        await createLesson.mutateAsync(lessonData as any);
      }

      onOpenChange(false);
      if (onSuccess) onSuccess();
      resetForm();
    } catch (error) {
      // Error handled by mutations
    }
  };

  const generateSeriesLessons = (baseLesson: any, weekdays: number[], endDateStr: string) => {
    const lessons: any[] = [];
    const startDate = moment(date);
    const endDate = moment(endDateStr);

    let currentDate = startDate.clone();

    while (currentDate.isSameOrBefore(endDate)) {
      if (weekdays.includes(currentDate.day())) {
        const lessonStart = currentDate.clone().set({
          hour: parseInt(startTime.split(":")[0]),
          minute: parseInt(startTime.split(":")[1]),
        });
        const lessonEnd = currentDate.clone().set({
          hour: parseInt(endTime.split(":")[0]),
          minute: parseInt(endTime.split(":")[1]),
        });

        lessons.push({
          ...baseLesson,
          id: `${Date.now()}-${currentDate.format("YYYY-MM-DD")}`,
          start: lessonStart.toDate(),
          end: lessonEnd.toDate(),
        });
      }
      currentDate.add(1, "day");
    }

    return lessons;
  };

  const resetForm = () => {
    setTitle("");
    setSubject("");
    setTeacherId("");
    setGroupId("");
    setSelectedStudentIds([]);
    setDate(moment().format("YYYY-MM-DD"));
    setStartTime("10:00");
    setEndTime("11:30");
    setRoomId("");
    setSeriesMode(false);
    setSelectedWeekdays([]);
    setConflicts(null);
    setIsCreatingNewGroup(false);
    setNewGroupName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Редактировать урок" : "Новый урок"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Lesson Type Toggle */}
          {mode === "create" && allowLessonTypeChange && (
            <div className="space-y-2">
              <Label>Тип занятия</Label>
              <Tabs value={lessonType} onValueChange={(v) => setLessonType(v as any)}>
                <TabsList className="w-full">
                  <TabsTrigger value="group" className="flex-1">
                    Групповое
                  </TabsTrigger>
                  <TabsTrigger value="individual" className="flex-1">
                    Индивидуальное
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          {/* Series Mode Toggle */}
          {mode === "create" && (
            <div className="flex items-center space-x-2">
              <Checkbox id="seriesMode" checked={seriesMode} onCheckedChange={(checked) => setSeriesMode(!!checked)} />
              <Label htmlFor="seriesMode" className="cursor-pointer">
                Создать серию уроков (повторяющиеся)
              </Label>
            </div>
          )}

          {/* Title */}
          <div>
            <Label htmlFor="title">Название урока *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          {/* Subject */}
          <div>
            <Label htmlFor="subject">Предмет *</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </div>

          {/* Teacher */}
          <div>
            <Label htmlFor="teacherId">Преподаватель *</Label>
            {initialData?.teacherId && mode === "create" ? (
              <Input 
                value={teachers.find(t => t.id === teacherId)?.name || ""} 
                disabled 
                className="bg-muted"
              />
            ) : (
              <Select value={teacherId} onValueChange={setTeacherId} required>
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
            )}
          </div>

          {/* Group or Students */}
          {lessonType === "group" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="groupId">Группа *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsCreatingNewGroup(!isCreatingNewGroup);
                    if (!isCreatingNewGroup) {
                      setGroupId("");
                    }
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {isCreatingNewGroup ? "Выбрать существующую" : "Создать новую"}
                </Button>
              </div>
              
              {isCreatingNewGroup ? (
                <div className="space-y-3 p-3 border rounded-lg bg-muted/50">
                  <div>
                    <Label htmlFor="newGroupName">Название группы *</Label>
                    <Input
                      id="newGroupName"
                      value={newGroupName}
                      onChange={(e) => {
                        setNewGroupName(e.target.value);
                        if (!title) setTitle(e.target.value);
                      }}
                      placeholder="Например: Математика 5 класс"
                      required
                    />
                  </div>
                  <StudentSelector
                    students={students}
                    selectedStudentIds={selectedStudentIds}
                    onSelectionChange={setSelectedStudentIds}
                  />
                </div>
              ) : (
                <Select value={groupId} onValueChange={setGroupId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите группу" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ) : (
            <StudentSelector
              students={students}
              selectedStudentIds={selectedStudentIds}
              onSelectionChange={setSelectedStudentIds}
            />
          )}

          {/* Date */}
          <div>
            <Label htmlFor="date">Дата *</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startTime">Время начала *</Label>
              <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="endTime">Время окончания *</Label>
              <Input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
            </div>
          </div>

          {/* Room */}
          <div>
            <Label htmlFor="roomId">Аудитория *</Label>
            <Select value={roomId} onValueChange={setRoomId} required>
              <SelectTrigger>
                <SelectValue placeholder="Выберите аудиторию" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name} (Вместимость: {room.capacity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Series Options */}
          {seriesMode && (
            <>
              <div>
                <Label className="mb-3 block">Дни недели *</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((day) => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`day-${day.value}`}
                        checked={selectedWeekdays.includes(day.value)}
                        onCheckedChange={() => toggleWeekday(day.value)}
                      />
                      <label
                        htmlFor={`day-${day.value}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {day.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="seriesEndDate">Дата окончания серии *</Label>
                <Input
                  id="seriesEndDate"
                  type="date"
                  value={seriesEndDate}
                  onChange={(e) => setSeriesEndDate(e.target.value)}
                  min={date}
                  required={seriesMode}
                />
              </div>
            </>
          )}

          {/* Conflict Warning */}
          {checkingConflicts && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>Проверка конфликтов...</AlertDescription>
            </Alert>
          )}

          {conflicts?.hasConflicts && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold mb-2">Обнаружены конфликты:</p>
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
                        className="mr-2 mb-1"
                        onClick={() => handleUseSuggestedTime(time.start, time.end, time.roomId)}
                      >
                        {moment(time.start).format("HH:mm")} - {moment(time.end).format("HH:mm")}
                        {time.roomName && ` (${time.roomName})`}
                      </Button>
                    ))}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {!conflicts?.hasConflicts && !checkingConflicts && teacherId && roomId && (
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">Конфликтов не обнаружено</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            {conflicts?.hasConflicts && (
              <Button variant="secondary" onClick={() => handleSubmit(true)}>
                Создать несмотря на конфликты
              </Button>
            )}
            <Button
              onClick={() => handleSubmit(false)}
              disabled={
                !title ||
                !subject ||
                !teacherId ||
                !roomId ||
                (lessonType === "group" && !groupId) ||
                (lessonType === "individual" && selectedStudentIds.length === 0) ||
                (seriesMode && (selectedWeekdays.length === 0 || !seriesEndDate))
              }
            >
              {mode === "edit" ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


import { useState, useEffect } from "react";
import moment from "moment";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StudentSelector } from "@/components/StudentSelector";
import { TimePicker } from "@/components/TimePicker";
import { Teacher, Room, Student, CheckConflictsResponse } from "@/types";
import { AlertTriangle, Loader2, CheckCircle } from "lucide-react";
import { useCheckConflicts, useCreateBulkLessons, useCreateGroup } from "@/hooks/useData";
import { toast } from "sonner";

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teachers: Teacher[];
  rooms: Room[];
  students: Student[];
  onSuccess?: () => void;
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

export function CreateGroupModal({
  open,
  onOpenChange,
  teachers,
  rooms,
  students,
  onSuccess,
}: CreateGroupModalProps) {
  // Series mode всегда включен для создания группы
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [seriesEndDate, setSeriesEndDate] = useState("");

  // Form fields
  const [groupName, setGroupName] = useState("");
  const [subject, setSubject] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(moment().format("YYYY-MM-DD"));
  // dayTimes: объект где ключ - день недели (0-6), значение - { start, end }
  const [dayTimes, setDayTimes] = useState<Record<number, { start: string; end: string }>>({});
  const [roomId, setRoomId] = useState("");

  // Conflict checking
  const [conflicts, setConflicts] = useState<CheckConflictsResponse | null>(null);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const checkConflictsMutation = useCheckConflicts();

  const createBulkLessons = useCreateBulkLessons();
  const createGroup = useCreateGroup();

  // Обновляем дату окончания серии когда меняется дата начала
  useEffect(() => {
    if (startDate && seriesEndDate) {
      const newEndDate = moment(startDate).add(12, 'weeks').format("YYYY-MM-DD");
      if (moment(newEndDate).diff(moment(seriesEndDate), 'days') !== 0) {
        setSeriesEndDate(newEndDate);
      }
    }
  }, [startDate]);

  // Сброс формы при открытии модалки
  useEffect(() => {
    if (open) {
      const today = moment().format("YYYY-MM-DD");
      setGroupName("");
      setSubject("");
      setTeacherId("");
      setSelectedStudentIds([]);
      setStartDate(today);
      setDayTimes({});
      setRoomId("");
      setSelectedWeekdays([]);
      setConflicts(null);
      const endDate = moment(today).add(12, 'weeks').format("YYYY-MM-DD");
      setSeriesEndDate(endDate);
    }
  }, [open]);

  // Check conflicts when relevant fields change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (teacherId && roomId && selectedWeekdays.length > 0) {
        // Проверяем что у всех выбранных дней есть время
        const allDaysHaveTime = selectedWeekdays.every(day => dayTimes[day]?.start && dayTimes[day]?.end);
        if (allDaysHaveTime) {
          handleCheckConflicts();
        }
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [teacherId, roomId, startDate, dayTimes, selectedWeekdays]);

  const handleCheckConflicts = async () => {
    if (!teacherId || !roomId || selectedWeekdays.length === 0) return;
    
    // Проверяем что у всех выбранных дней есть время
    const firstDay = selectedWeekdays[0];
    const firstDayTime = dayTimes[firstDay];
    if (!firstDayTime?.start || !firstDayTime?.end) return;

    setCheckingConflicts(true);
    try {
      // Проверяем конфликты для ближайшего выбранного дня
      const today = moment(startDate);
      let checkDate = moment(today);
      
      while (checkDate.day() !== firstDay) {
        checkDate.add(1, "day");
      }

      const start = new Date(`${checkDate.format("YYYY-MM-DD")}T${firstDayTime.start}`).toISOString();
      const end = new Date(`${checkDate.format("YYYY-MM-DD")}T${firstDayTime.end}`).toISOString();

      const result = await checkConflictsMutation.mutateAsync({
        teacherId,
        roomId,
        start,
        end,
      });

      setConflicts(result);
    } catch (error) {
      // Error handled by mutation
    } finally {
      setCheckingConflicts(false);
    }
  };

  const toggleWeekday = (day: number) => {
    setSelectedWeekdays((prev) => {
      const isCurrentlySelected = prev.includes(day);
      if (isCurrentlySelected) {
        // Удаляем день и его время
        setDayTimes((times) => {
          const newTimes = { ...times };
          delete newTimes[day];
          return newTimes;
        });
        return prev.filter((d) => d !== day).sort();
      } else {
        // Добавляем день с дефолтным временем
        setDayTimes((times) => ({
          ...times,
          [day]: { start: "10:00", end: "11:30" },
        }));
        return [...prev, day].sort();
      }
    });
  };

  const updateDayTime = (day: number, field: "start" | "end", value: string) => {
    setDayTimes((times) => ({
      ...times,
      [day]: {
        ...times[day],
        [field]: value,
      },
    }));
  };

  const generateSeriesLessons = (baseLesson: any, weekdays: number[], endDateStr: string) => {
    const lessons: any[] = [];
    const startDateMoment = moment(startDate);
    const endDateMoment = moment(endDateStr);

    let currentDate = startDateMoment.clone();
    let lessonIndex = 0;

    while (currentDate.isSameOrBefore(endDateMoment)) {
      const dayOfWeek = currentDate.day();
      if (weekdays.includes(dayOfWeek) && dayTimes[dayOfWeek]) {
        const { start, end } = dayTimes[dayOfWeek];
        const [startHour, startMinute] = start.split(":").map(Number);
        const [endHour, endMinute] = end.split(":").map(Number);

        const lessonStart = currentDate.clone().set({
          hour: startHour,
          minute: startMinute,
        });
        const lessonEnd = currentDate.clone().set({
          hour: endHour,
          minute: endMinute,
        });

        // Генерируем уникальный ID для каждого урока
        // Используем timestamp + индекс + случайное число для гарантии уникальности
        const uniqueId = `${Date.now()}-${lessonIndex}-${Math.random().toString(36).substring(2, 9)}-${currentDate.format("YYYY-MM-DD")}`;

        lessons.push({
          ...baseLesson,
          id: uniqueId,
          start: lessonStart.toDate(),
          end: lessonEnd.toDate(),
        });
        lessonIndex++;
      }
      currentDate.add(1, "day");
    }

    return lessons;
  };

  const handleSubmit = async (forceCreate = false) => {
    if (!forceCreate && conflicts?.hasConflicts) {
      toast.error("Есть конфликты. Используйте предложенное время или подтвердите создание.");
      return;
    }

    if (selectedWeekdays.length === 0) {
      toast.error("Выберите хотя бы один день недели");
      return;
    }

    // Проверяем что у всех выбранных дней есть время
    const allDaysHaveTime = selectedWeekdays.every(day => dayTimes[day]?.start && dayTimes[day]?.end);
    if (!allDaysHaveTime) {
      toast.error("Укажите время для всех выбранных дней недели");
      return;
    }

    if (!seriesEndDate) {
      toast.error("Укажите дату окончания серии");
      return;
    }

    try {
      // Сначала создаем группу
      // Формируем строку расписания: группируем дни с одинаковым временем
      const weekdayNames = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
      const scheduleParts: string[] = [];
      
      // Группируем дни по времени
      const timeGroups = new Map<string, number[]>();
      selectedWeekdays.forEach(day => {
        const timeKey = `${dayTimes[day].start}-${dayTimes[day].end}`;
        if (!timeGroups.has(timeKey)) {
          timeGroups.set(timeKey, []);
        }
        timeGroups.get(timeKey)!.push(day);
      });
      
      // Формируем строку расписания
      timeGroups.forEach((days, timeKey) => {
        const [start, end] = timeKey.split("-");
        const dayNames = days.map(d => weekdayNames[d]).join(", ");
        scheduleParts.push(`${dayNames} ${start}-${end}`);
      });
      
      const scheduleString = scheduleParts.join("; ");

      // Создание новой группы (редактирование через отдельную форму)
      const createdGroup = await createGroup.mutateAsync({
        name: groupName,
        subject,
        teacherId,
        schedule: scheduleString,
        roomId,
        studentIds: selectedStudentIds,
      } as any);

      // Генерируем уроки для группы
      if (createdGroup && selectedWeekdays.length > 0 && seriesEndDate) {
        const selectedRoom = rooms.find((r) => r.id === roomId);

        const lessonData = {
          title: groupName,
          subject,
          teacherId,
          groupId: createdGroup.id,
          studentIds: selectedStudentIds,
          room: selectedRoom?.name || "",
          roomId,
          status: "scheduled" as const,
          lessonType: "group" as const,
        };

        const lessons = generateSeriesLessons(lessonData, selectedWeekdays, seriesEndDate);

        if (lessons.length > 0) {
          await createBulkLessons.mutateAsync({ lessons });
          // Toast уже показывается в useCreateBulkLessons
        }
      }

      onOpenChange(false);
      if (onSuccess) onSuccess();
      resetForm();
    } catch (error) {
      // Error handled by mutations
    }
  };

  const resetForm = () => {
    setGroupName("");
    setSubject("");
    setTeacherId("");
    setSelectedStudentIds([]);
    const today = moment().format("YYYY-MM-DD");
    setStartDate(today);
    setDayTimes({});
    setRoomId("");
    setSelectedWeekdays([]);
    setConflicts(null);
    const endDate = moment(today).add(12, 'weeks').format("YYYY-MM-DD");
    setSeriesEndDate(endDate);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Новая группа</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pb-2">
          {/* Section: Основная информация */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Основная информация</h4>
            
            {/* Group Name & Subject - Two columns */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="groupName">Название группы *</Label>
                <Input
                  id="groupName"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subject">Предмет *</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Teacher & Room - Two columns */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="teacherId">Преподаватель *</Label>
                <Select value={teacherId} onValueChange={setTeacherId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="roomId">Аудитория *</Label>
                <Select value={roomId} onValueChange={setRoomId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name} ({room.capacity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 dark:border-slate-800" />

          {/* Section: Участники */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Участники</h4>
            <StudentSelector
              students={students}
              selectedStudentIds={selectedStudentIds}
              onSelectionChange={setSelectedStudentIds}
            />
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 dark:border-slate-800" />

          {/* Section: Расписание */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Расписание</h4>

            {/* Start & End Date - Two columns */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">Дата начала *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="seriesEndDate">Дата окончания *</Label>
                <Input
                  id="seriesEndDate"
                  type="date"
                  value={seriesEndDate}
                  onChange={(e) => setSeriesEndDate(e.target.value)}
                  min={startDate}
                  required
                />
              </div>
            </div>

            {/* Weekdays Selection */}
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-3">
              <Label className="block">Дни недели *</Label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleWeekday(day.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      selectedWeekdays.includes(day.value)
                        ? "bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white shadow-sm"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-[#8b5cf6]"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              {selectedWeekdays.length === 0 && (
                <p className="text-xs text-rose-500 mt-1">Выберите хотя бы один день</p>
              )}

              {/* Time Selection for Each Selected Day */}
              {selectedWeekdays.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                  {selectedWeekdays.map((day) => {
                    const dayTime = dayTimes[day] || { start: "10:00", end: "11:30" };
                    const dayLabel = WEEKDAYS.find(d => d.value === day)?.label || "";
                    return (
                      <div key={day} className="grid grid-cols-[40px_1fr_1fr] gap-2 items-end">
                        <span className="font-semibold text-sm text-slate-700 dark:text-slate-300 pb-2">{dayLabel}</span>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Начало</Label>
                          <TimePicker
                            value={dayTime.start}
                            onChange={(value) => updateDayTime(day, "start", value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Окончание</Label>
                          <TimePicker
                            value={dayTime.end}
                            onChange={(value) => updateDayTime(day, "end", value)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

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
                            type="button"
                            className="mr-2 mb-1"
                            onClick={() => {
                              const startMoment = moment(time.start);
                              const endMoment = moment(time.end);
                              const suggestedStart = startMoment.format("HH:mm");
                              const suggestedEnd = endMoment.format("HH:mm");
                              
                              // Применяем предложенное время к первому выбранному дню
                              if (selectedWeekdays.length > 0) {
                                const firstDay = selectedWeekdays[0];
                                updateDayTime(firstDay, "start", suggestedStart);
                                updateDayTime(firstDay, "end", suggestedEnd);
                              }
                              
                              if (time.roomId) {
                                setRoomId(time.roomId);
                              }
                              setConflicts(null);
                            }}
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

          {!conflicts?.hasConflicts && !checkingConflicts && teacherId && roomId && selectedWeekdays.length > 0 && 
            selectedWeekdays.every(day => dayTimes[day]?.start && dayTimes[day]?.end) && (
            <Alert variant="success">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>Конфликтов не обнаружено</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              onClick={() => handleSubmit(false)}
              disabled={
                !groupName ||
                !subject ||
                !teacherId ||
                !roomId ||
                selectedStudentIds.length === 0 ||
                selectedWeekdays.length === 0 ||
                !seriesEndDate ||
                !selectedWeekdays.every(day => dayTimes[day]?.start && dayTimes[day]?.end)
              }
              className="w-full bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#a855f7] hover:opacity-90 text-white shadow-md"
            >
              Создать группу
            </Button>
            {conflicts?.hasConflicts && (
              <Button variant="outline" onClick={() => handleSubmit(true)} className="w-full">
                Создать несмотря на конфликты
              </Button>
            )}
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full text-muted-foreground">
              Отмена
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import moment from "moment";
import "moment/locale/ru";
import "moment/locale/kk";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StudentSelector } from "@/components/StudentSelector";
import { Teacher, Group, Room, Student, Lesson, CheckConflictsResponse } from "@/types";
import { AlertTriangle, Loader2, CheckCircle, Calendar, Clock, Repeat } from "lucide-react";
import { useCheckConflicts, useCreateLesson, useCreateBulkLessons, useUpdateLesson } from "@/hooks/useData";
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
    lessonType?: "group" | "individual" | "special";
    groupId?: string;
  };
  mode?: "create" | "edit";
  onSuccess?: () => void;
}

const getWeekdays = (lang: string) => {
  const labels: Record<string, string[]> = {
    ru: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
    kk: ["Дс", "Сс", "Ср", "Бс", "Жм", "Сн", "Жк"],
    en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  };
  const l = labels[lang] || labels.ru;
  return [
    { value: 1, label: l[0] },
    { value: 2, label: l[1] },
    { value: 3, label: l[2] },
    { value: 4, label: l[3] },
    { value: 5, label: l[4] },
    { value: 6, label: l[5] },
    { value: 0, label: l[6] },
  ];
};

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
}: LessonFormModalProps) {
  const { t, i18n } = useTranslation(["schedule", "common"]);
  moment.locale(i18n.language);
  const WEEKDAYS = getWeekdays(i18n.language);

  // Lesson type - auto-determined by groupId if provided, or manually selectable
  const [groupId, setGroupId] = useState(initialData?.groupId || "");
  const [manualLessonType, setManualLessonType] = useState<"group" | "individual" | "special" | "">(
    initialData?.lessonType || ""
  );
  
  // Determine lesson type: if groupId is set -> "group", if manualLessonType is "special" -> "special", otherwise -> "individual"
  const lessonType: "group" | "individual" | "special" = useMemo(() => {
    if (groupId) {
      return "group";
    }
    if (manualLessonType === "special") {
      return "special";
    }
    return "individual";
  }, [groupId, manualLessonType]);

  const [seriesMode, setSeriesMode] = useState(false);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [seriesEndDate, setSeriesEndDate] = useState("");

  // Form fields
  const [title, setTitle] = useState(initialData?.title || "");
  const [subject, setSubject] = useState(initialData?.subject || "");
  const [teacherId, setTeacherId] = useState(initialData?.teacherId || "");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(initialData?.studentIds || []);
  const [date, setDate] = useState(
    initialData?.date ? moment(initialData.date).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD")
  );
  const [startTime, setStartTime] = useState(initialData?.startTime || "10:00");
  const [endTime, setEndTime] = useState(initialData?.endTime || "11:30");
  const [roomId, setRoomId] = useState(initialData?.roomId || "");
  const [status, setStatus] = useState<"scheduled" | "completed" | "cancelled">(
    (initialData?.status as "scheduled" | "completed" | "cancelled") || "scheduled"
  );

  // Conflict checking
  const [conflicts, setConflicts] = useState<CheckConflictsResponse | null>(null);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const checkConflictsMutation = useCheckConflicts();

  const createLesson = useCreateLesson();
  const createBulkLessons = useCreateBulkLessons();
  const updateLesson = useUpdateLesson();

  // Sync form fields with initialData when it changes
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setSubject(initialData.subject || "");
      setTeacherId(initialData.teacherId || "");
      setSelectedStudentIds(initialData.studentIds || []);
      setDate(initialData.date ? moment(initialData.date).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD"));
      setStartTime(initialData.startTime || "10:00");
      setEndTime(initialData.endTime || "11:30");
      setRoomId(initialData.roomId || "");
      setGroupId(initialData.groupId || "");
      setManualLessonType(initialData.lessonType || "");
      setStatus((initialData.status as "scheduled" | "completed" | "cancelled") || "scheduled");
    }
  }, [initialData]);


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
      const start = new Date(`${date}T${startTime}`);
      const end = new Date(`${date}T${endTime}`);
      const selectedRoom = rooms.find((r) => r.id === roomId);

      const lessonData = {
        title,
        subject,
        teacherId,
        groupId: groupId || undefined,
        studentIds: selectedStudentIds,
        start,
        end,
        room: selectedRoom?.name || "",
        roomId,
        status: mode === "edit" ? status : ("scheduled" as const), // Allow status change when editing
        lessonType, // Auto-determined: "group" if groupId set, "special" if manually selected, otherwise "individual"
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
    let lessonIndex = 0;
    const baseTimestamp = Date.now();

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

        // Генерируем уникальный ID для каждого урока
        // Используем базовый timestamp + индекс + дату + случайное число для гарантии уникальности
        const uniqueId = `${baseTimestamp}-${lessonIndex}-${Math.random().toString(36).substring(2, 9)}-${currentDate.format("YYYY-MM-DD")}`;

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

  const resetForm = () => {
    setTitle("");
    setSubject("");
    setTeacherId("");
    setSelectedStudentIds([]);
    setDate(moment().format("YYYY-MM-DD"));
    setStartTime("10:00");
    setEndTime("11:30");
    setRoomId("");
      setGroupId("");
      setManualLessonType("");
      setStatus("scheduled");
      setSeriesMode(false);
      setSelectedWeekdays([]);
      setConflicts(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? t("editLesson") : t("newLesson")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pb-2">
          {/* Series Mode Toggle - Prominent Switch */}
          {mode === "create" && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-200 dark:border-violet-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#a855f7]">
                  <Repeat className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{t("series.title")}</p>
                  <p className="text-xs text-muted-foreground">{i18n.language === 'kk' ? 'Қайталанатын сабақтар' : i18n.language === 'en' ? 'Repeating lessons' : 'Повторяющиеся занятия'}</p>
                </div>
              </div>
              <Switch
                checked={seriesMode}
                onCheckedChange={setSeriesMode}
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-[#6366f1] data-[state=checked]:to-[#a855f7]"
              />
            </div>
          )}

          {/* Title - Full width */}
          <div className="space-y-1.5">
            <Label htmlFor="title">{t("lesson.title")} *</Label>
            <Input 
              id="title" 
              placeholder={i18n.language === 'kk' ? 'Математика - 5 сынып' : i18n.language === 'en' ? 'Math - Grade 5' : 'Математика - 5 класс'}
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              required 
            />
          </div>

          {/* Subject & Teacher - One row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="subject">{t("lesson.subject")} *</Label>
              <Input 
                id="subject" 
                placeholder={i18n.language === 'kk' ? 'Математика' : i18n.language === 'en' ? 'Mathematics' : 'Математика'}
                value={subject} 
                onChange={(e) => setSubject(e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="teacherId">{t("lesson.teacher")} *</Label>
              {initialData?.teacherId && mode === "create" ? (
                <Input 
                  value={teachers.find(t => t.id === teacherId)?.name || ""} 
                  disabled 
                  className="bg-muted"
                />
              ) : (
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
              )}
            </div>
          </div>

          {/* Group & Lesson Type - One row */}
          <div className="grid grid-cols-2 gap-3">
            {lessonType !== "special" && (
              <div className="space-y-1.5">
                <Label htmlFor="groupId">{t("lesson.group")}</Label>
                <Select value={groupId || "none"} onValueChange={(value) => setGroupId(value === "none" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("lesson.individual")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("lesson.individual")}</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!groupId && (
              <div className="space-y-1.5">
                <Label htmlFor="lessonType">{t("lesson.type")}</Label>
                <Select
                  value={manualLessonType || "individual"}
                  onValueChange={(value: "group" | "individual" | "special") =>
                    setManualLessonType(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">{t("lesson.individual")}</SelectItem>
                    <SelectItem value="special">{t("lesson.special")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Students - Compact chips */}
          {(lessonType === "individual" || lessonType === "special") && (
            <StudentSelector
              students={students}
              selectedStudentIds={selectedStudentIds}
              onSelectionChange={setSelectedStudentIds}
              compact
            />
          )}

          {/* Date & Time Section - Gray background block */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("lesson.dateAndTime")}</span>
            </div>

            {/* Date & Room - One row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="date">{t("lesson.date")} *</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="roomId">{t("lesson.room")} *</Label>
                <Select value={roomId} onValueChange={setRoomId} required>
                  <SelectTrigger>
                    <SelectValue placeholder={t("modal.select")} />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Start & End Time - One row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="startTime" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {t("lesson.start")} *
                </Label>
                <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endTime" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {t("lesson.end")} *
                </Label>
                <Input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
              </div>
            </div>

            {/* Status - only for edit mode */}
            {mode === "edit" && (
              <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                <Label htmlFor="status">{t("lesson.status")}</Label>
                <Select value={status} onValueChange={(value: "scheduled" | "completed" | "cancelled") => setStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">{t("statuses.scheduled")}</SelectItem>
                    <SelectItem value="completed">{t("statuses.completed")}</SelectItem>
                    <SelectItem value="cancelled">{t("statuses.cancelled")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Series Options - Collapsible */}
          {seriesMode && (
            <div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Repeat className="h-4 w-4 text-violet-500" />
                <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide">{t("series.repeat")}</span>
              </div>

              <div>
                <Label className="text-xs mb-2 block">{t("series.weekdaysLabel")} *</Label>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleWeekday(day.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedWeekdays.includes(day.value)
                          ? "bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white shadow-sm"
                          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-violet-400"
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="seriesEndDate">{t("series.endDateLabel")} *</Label>
                <Input
                  id="seriesEndDate"
                  type="date"
                  value={seriesEndDate}
                  onChange={(e) => setSeriesEndDate(e.target.value)}
                  min={date}
                  required={seriesMode}
                />
              </div>
            </div>
          )}

          {/* Conflict Warning */}
          {checkingConflicts && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>{t("conflicts.checking")}</AlertDescription>
            </Alert>
          )}

          {conflicts?.hasConflicts && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold mb-2">{t("conflicts.foundTitle")}</p>
                {conflicts.conflicts.map((conflict, idx) => (
                  <p key={idx} className="text-sm">
                    - {conflict.title} ({moment(conflict.start).format("HH:mm")} - {moment(conflict.end).format("HH:mm")})
                    {conflict.conflictType === "teacher" && ` - ${t("conflicts.teacherBusy")}`}
                    {conflict.conflictType === "room" && ` - ${t("conflicts.roomBusy")}`}
                  </p>
                ))}
                {conflicts.suggestedTimes && conflicts.suggestedTimes.length > 0 && (
                  <div className="mt-3">
                    <p className="font-semibold text-sm mb-1">{t("conflicts.suggestedTime")}</p>
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
            <Alert variant="success">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{t("conflicts.noConflicts")}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              onClick={() => handleSubmit(false)}
              disabled={
                !title ||
                !subject ||
                !teacherId ||
                !roomId ||
                selectedStudentIds.length === 0 ||
                (seriesMode && (selectedWeekdays.length === 0 || !seriesEndDate))
              }
              className="w-full bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#a855f7] hover:opacity-90 text-white shadow-md"
            >
              {mode === "edit" ? t("modal.saveChanges") : t("modal.createLesson")}
            </Button>
            {conflicts?.hasConflicts && (
              <Button variant="outline" onClick={() => handleSubmit(true)} className="w-full">
                {t("modal.createAnyway")}
              </Button>
            )}
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full text-muted-foreground">
              {t("modal.cancel")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


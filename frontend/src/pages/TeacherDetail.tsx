import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import moment from "moment";
import "moment/locale/ru";
import "moment/locale/kk";
import { useTeachers, useTeacherLessons, useGroups, useRooms, useStudents, useUpdateTeacher, useDeleteTeacher, useTeacherRates } from "@/hooks/useData";
import { teacherRatesAPI } from "@/api/teacherRates";
import { TeacherRatesModal } from "@/components/TeacherRatesModal";
import { LessonFormModal } from "@/components/LessonFormModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Mail, Phone, Plus, Loader2, Calendar, List, Edit, Trash2, Clock, Users, MapPin, DollarSign, Calculator, X, BookOpen, TrendingUp, ChevronLeft, ChevronRight, GraduationCap } from "lucide-react";
import { Lesson } from "@/types";
import { toast } from "sonner";
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

export default function TeacherDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(["teachers", "common", "schedule"]);
  moment.locale(i18n.language);

  const { data: teachers = [] } = useTeachers();
  const { data: groups = [] } = useGroups();
  const { data: rooms = [] } = useRooms();
  const { data: students = [] } = useStudents();

  const teacher = teachers.find((t) => t.id === id);

  // Get lessons for extended period (3 months back, 3 months forward) to support salary calculation
  const startDate = moment().subtract(3, "month").startOf("month").format("YYYY-MM-DD");
  const endDate = moment().add(3, "month").endOf("month").format("YYYY-MM-DD");
  const { data: lessons = [], isLoading } = useTeacherLessons(id || "", startDate, endDate);

  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [selectedWeek, setSelectedWeek] = useState(moment());
  const [isLessonFormOpen, setIsLessonFormOpen] = useState(false);
  const [lessonFormData, setLessonFormData] = useState<any>(null);
  const [lessonFormMode, setLessonFormMode] = useState<"create" | "edit">("create");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSalaryCalcOpen, setIsSalaryCalcOpen] = useState(false);
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [salaryPeriodStart, setSalaryPeriodStart] = useState<string>(moment().startOf("month").format("YYYY-MM-DD"));
  const [salaryPeriodEnd, setSalaryPeriodEnd] = useState<string>(moment().endOf("month").format("YYYY-MM-DD"));
  const [selectedLessonForInfo, setSelectedLessonForInfo] = useState<Lesson | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const updateTeacher = useUpdateTeacher();
  const deleteTeacher = useDeleteTeacher();


  if (!teacher) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">{t("detail.notFound")}</h2>
          <Button onClick={() => navigate("/teachers")} className="mt-4">
            {t("detail.backToListBtn")}
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleCreateLesson = () => {
    setLessonFormData({
      teacherId: teacher.id,
      subject: teacher.subject,
      date: moment().format("YYYY-MM-DD"),
      startTime: "10:00",
      endTime: "11:30",
    });
    setLessonFormMode("create");
    setIsLessonFormOpen(true);
  };

  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLessonForInfo(lesson);
    setPopoverOpen(true);
  };

  const handleEditLesson = (lesson: Lesson) => {
    setPopoverOpen(false);
    setLessonFormData({
      ...lesson,
      date: lesson.start,
      startTime: moment(lesson.start).format("HH:mm"),
      endTime: moment(lesson.end).format("HH:mm"),
    });
    setLessonFormMode("edit");
    setIsLessonFormOpen(true);
  };

  const handlePreviousWeek = () => {
    setSelectedWeek(moment(selectedWeek).subtract(1, "week"));
  };

  const handleNextWeek = () => {
    setSelectedWeek(moment(selectedWeek).add(1, "week"));
  };

  const handleToday = () => {
    setSelectedWeek(moment());
  };

  const handleEditTeacher = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!teacher) return;

    const formData = new FormData(e.currentTarget);
    
    // Get all form fields - include required fields
    const teacherData: any = {
      name: formData.get("name") as string || teacher.name,
      subject: formData.get("subject") as string || teacher.subject,
      email: formData.get("email") as string || teacher.email,
      phone: formData.get("phone") as string || teacher.phone,
      status: (formData.get("status") as "active" | "inactive") || teacher.status,
      workload: parseInt(formData.get("workload") as string) || teacher.workload,
    };

    try {
      await updateTeacher.mutateAsync({ id: teacher.id, data: teacherData });
      setIsEditDialogOpen(false);
      // toast is shown by mutation hook
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeleteTeacher = async () => {
    if (!teacher) return;

    try {
      await deleteTeacher.mutateAsync(teacher.id);
      toast.success(t("deleted"));
      navigate("/teachers");
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Calculate statistics
  const completedLessons = lessons.filter((l) => l.status === "completed").length;
  const scheduledLessons = lessons.filter((l) => l.status === "scheduled").length;
  const totalLessons = lessons.length;
  const completionRate = totalLessons > 0 ? ((completedLessons / totalLessons) * 100).toFixed(1) : "0";

  // Calculate workload for selected week (dynamic based on selectedWeek)
  const selectedWeekStart = moment(selectedWeek).startOf("isoWeek");
  const selectedWeekEnd = moment(selectedWeek).endOf("isoWeek");
  const selectedWeekLessons = lessons.filter((l) => {
    const lessonDate = moment(l.start);
    return lessonDate.isBetween(selectedWeekStart, selectedWeekEnd, null, "[]");
  });
  const selectedWeekHours = selectedWeekLessons.reduce((total, lesson) => {
    const duration = moment(lesson.end).diff(moment(lesson.start), "hours", true);
    return total + duration;
  }, 0).toFixed(1);
  const selectedWeekLessonsCount = selectedWeekLessons.length;

  // Get lessons for selected week (calendar view)
  const weekStart = moment(selectedWeek).startOf("isoWeek");
  const weekEnd = moment(selectedWeek).endOf("isoWeek");
  const weekLessons = lessons.filter((l) => {
    const lessonDate = moment(l.start);
    return lessonDate.isBetween(weekStart, weekEnd, null, "[]");
  });

  // Group lessons by day
  const lessonsByDay: Record<string, Lesson[]> = {};
  for (let i = 0; i < 7; i++) {
    const day = weekStart.clone().add(i, "days").format("YYYY-MM-DD");
    lessonsByDay[day] = weekLessons.filter((l) => moment(l.start).format("YYYY-MM-DD") === day);
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => navigate("/teachers")} 
        className="rounded-xl hover:bg-muted -mb-2"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t("detail.backToList")}
      </Button>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        
        {/* Hero Card - Large */}
        <div className="lg:col-span-8 p-6 rounded-3xl bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 dark:from-sky-950 dark:via-blue-950 dark:to-indigo-900 relative overflow-hidden shadow-soft">
          <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-sky-200/30 dark:bg-sky-800/20 rounded-full blur-3xl" />
          <div className="absolute bottom-[-30%] left-[-5%] w-72 h-72 bg-blue-200/30 dark:bg-blue-800/20 rounded-full blur-3xl" />
          
          <div className="relative">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-soft-lg shrink-0">
                  <span className="text-3xl font-bold text-white">{teacher.name.charAt(0)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-2xl sm:text-3xl font-bold truncate">{teacher.name}</h1>
                    <Badge 
                      variant={teacher.status === "active" ? "default" : "secondary"} 
                      className={teacher.status === "active" ? "bg-gradient-to-r from-emerald-500 to-green-600 border-0" : ""}
                    >
                      {teacher.status === "active" ? t("badge.active") : t("badge.inactive")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <GraduationCap className="h-4 w-4" />
                    <span className="text-sm sm:text-base">{teacher.subject}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Contact Info Row */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                <span>{teacher.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                <span>{teacher.phone}</span>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditDialogOpen(true)}
                className="rounded-xl bg-white/70 dark:bg-white/10 border border-sky-200/50 dark:border-white/10 hover:bg-white hover:shadow-md hover:scale-[1.02] transition-all duration-200"
              >
                <Edit className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t("actions.edit")}</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsRatesModalOpen(true)}
                className="rounded-xl bg-white/70 dark:bg-white/10 border border-sky-200/50 dark:border-white/10 hover:bg-white hover:shadow-md hover:scale-[1.02] transition-all duration-200"
              >
                <Calculator className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t("actions.rates")}</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsSalaryCalcOpen(true)}
                className="rounded-xl bg-white/70 dark:bg-white/10 border border-sky-200/50 dark:border-white/10 hover:bg-white hover:shadow-md hover:scale-[1.02] transition-all duration-200"
              >
                <DollarSign className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t("actions.salary")}</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsDeleteDialogOpen(true)}
                className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-100 hover:scale-[1.02] transition-all duration-200"
              >
                <Trash2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t("actions.delete")}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Workload Card - Side */}
        <div className="lg:col-span-4 p-6 rounded-3xl bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-100 dark:from-violet-950 dark:via-purple-950 dark:to-fuchsia-900 relative overflow-hidden shadow-soft">
          <div className="absolute top-[-30%] right-[-20%] w-48 h-48 bg-violet-200/40 dark:bg-violet-800/20 rounded-full blur-3xl" />
          
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-soft">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">{t("detail.loadTitle")}</span>
            </div>
            
            <div className="text-5xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent mb-1">
              {selectedWeekHours}
              <span className="text-lg font-normal text-muted-foreground ml-1">{t("workload.hourWeek")}</span>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              {weekStart.format("D MMM")} - {weekEnd.format("D MMM YYYY")}
            </p>
            
            <div className="space-y-3 pt-2 border-t border-violet-200/50 dark:border-violet-700/50">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t("detail.lessons")}</span>
                <span className="font-semibold text-lg">{selectedWeekLessonsCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t("detail.planned")}</span>
                <span className="font-semibold">{teacher.workload} {t("workload.hourWeek")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards Row */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950 dark:to-green-900 shadow-soft">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-medium">{t("detail.totalLessons")}</span>
          </div>
          <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">{totalLessons}</div>
        </div>

        <div className="lg:col-span-4 p-5 rounded-2xl bg-gradient-to-br from-sky-50 to-blue-100 dark:from-sky-950 dark:to-blue-900 shadow-soft">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-medium">{t("detail.completed")}</span>
          </div>
          <div className="text-4xl font-bold text-sky-600 dark:text-sky-400">{completedLessons}</div>
          <div className="text-sm text-muted-foreground mt-1">{completionRate}% {t("detail.completedPercent")}</div>
        </div>

        <div className="lg:col-span-4 p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-900 shadow-soft">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-medium">{t("detail.scheduled")}</span>
          </div>
          <div className="text-4xl font-bold text-amber-600 dark:text-amber-400">{scheduledLessons}</div>
        </div>
      </div>

      {/* Create Lesson Button - Floating */}
      <div className="flex justify-end">
        <Button 
          onClick={handleCreateLesson}
          className="rounded-2xl h-12 px-6 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-soft-lg"
        >
          <Plus className="h-5 w-5 mr-2" />
          {t("createLesson")}
        </Button>
      </div>

      {/* Schedule Section - Bento Style */}
      <div className="p-6 rounded-3xl bg-white dark:bg-gray-900 border border-border/50 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold">{t("detail.schedule")}</h2>
          <div className="flex items-center gap-2 p-1 rounded-xl bg-muted/50">
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                viewMode === "calendar" 
                  ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-soft" 
                  : "hover:bg-muted"
              }`}
            >
              <Calendar className="h-4 w-4" />
              {t("detail.calendar")}
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                viewMode === "list" 
                  ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-soft" 
                  : "hover:bg-muted"
              }`}
            >
              <List className="h-4 w-4" />
              {t("detail.list")}
            </button>
          </div>
        </div>

        <Tabs value={viewMode}>
          {/* Calendar View */}
          <TabsContent value="calendar" className="space-y-4">
            {/* Week Navigation - Bento Style */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePreviousWeek}
                  className="p-2 rounded-xl bg-white dark:bg-gray-800 shadow-soft hover:shadow-soft-lg transition-all"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={handleToday}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-sm font-medium shadow-soft hover:shadow-soft-lg transition-all"
                >
                  {t("detail.today")}
                </button>
                <button
                  onClick={handleNextWeek}
                  className="p-2 rounded-xl bg-white dark:bg-gray-800 shadow-soft hover:shadow-soft-lg transition-all"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <h3 className="text-sm font-semibold text-center sm:text-right">
                {weekStart.format("D MMM")} - {weekEnd.format("D MMM YYYY")}
              </h3>
            </div>

            {/* Week Grid - Bento Style */}
            <div className="grid grid-cols-3 sm:grid-cols-7 gap-3">
              {Array.from({ length: 7 }, (_, i) => {
                const day = weekStart.clone().add(i, "days");
                const dayKey = day.format("YYYY-MM-DD");
                const dayLessons = lessonsByDay[dayKey] || [];
                const isToday = day.isSame(moment(), "day");

                return (
                  <div 
                    key={dayKey} 
                    className={`rounded-2xl p-3 min-h-[140px] sm:min-h-[160px] transition-all ${
                      isToday 
                        ? "bg-gradient-to-br from-sky-50 to-blue-100 dark:from-sky-950 dark:to-blue-900 ring-2 ring-sky-400" 
                        : "bg-muted/30 hover:bg-muted/50"
                    }`}
                  >
                    <div className="text-center mb-3">
                      <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">{day.format("dd")}</div>
                      <div className={`text-lg sm:text-xl font-bold ${isToday ? "text-sky-600 dark:text-sky-400" : ""}`}>{day.format("D")}</div>
                      <div className="text-[9px] sm:text-xs text-muted-foreground hidden sm:block">{day.format("MMM")}</div>
                    </div>
                    <div className="space-y-1.5">
                      {dayLessons.slice(0, 3).map((lesson) => {
                        const group = groups.find((g) => g.id === lesson.groupId);
                        const room = rooms.find((r) => r.id === lesson.roomId);
                        return (
                          <Popover key={lesson.id} open={popoverOpen && selectedLessonForInfo?.id === lesson.id} onOpenChange={(open) => {
                            if (!open) {
                              setPopoverOpen(false);
                              setSelectedLessonForInfo(null);
                            }
                          }}>
                            <PopoverTrigger asChild>
                              <div
                                onClick={() => handleLessonClick(lesson)}
                                className={`text-[9px] sm:text-xs p-1.5 sm:p-2 rounded-xl cursor-pointer transition-all ${
                                  lesson.status === "completed"
                                    ? "bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/50 dark:to-green-900/50 hover:shadow-soft"
                                    : "bg-gradient-to-r from-sky-100 to-blue-100 dark:from-sky-900/50 dark:to-blue-900/50 hover:shadow-soft"
                                }`}
                              >
                                <div className="font-semibold truncate">
                                  {group?.name || lesson.title}
                                </div>
                                <div className="text-muted-foreground truncate">
                                  {moment(lesson.start).format("HH:mm")}
                                </div>
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" side="right" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                              <div className="space-y-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h3 className="font-semibold text-lg">{lesson.title}</h3>
                                    <p className="text-sm text-muted-foreground">{lesson.subject}</p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-xl"
                                    onClick={() => {
                                      setPopoverOpen(false);
                                      setSelectedLessonForInfo(null);
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm p-2 rounded-xl bg-muted/50">
                                    <Clock className="h-4 w-4 text-sky-600 shrink-0" />
                                    <span>
                                      {moment(lesson.start).format("DD.MM.YYYY, dddd, HH:mm")} - {moment(lesson.end).format("HH:mm")}
                                    </span>
                                  </div>

                                  {room && (
                                    <div className="flex items-center gap-2 text-sm p-2 rounded-xl bg-muted/50">
                                      <MapPin className="h-4 w-4 text-violet-600 shrink-0" />
                                      <span>{room.name}</span>
                                    </div>
                                  )}

                                  {group && (
                                    <div className="flex items-center gap-2 text-sm p-2 rounded-xl bg-muted/50">
                                      <Users className="h-4 w-4 text-emerald-600 shrink-0" />
                                      <span>{group.name}</span>
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between p-2 rounded-xl bg-muted/50">
                                    <span className="text-sm font-medium">{t("detail.lessonStatus")}</span>
                                    <Badge className={
                                      lesson.status === "completed" 
                                        ? "bg-gradient-to-r from-emerald-500 to-green-600 border-0" 
                                        : lesson.status === "cancelled"
                                        ? "bg-gradient-to-r from-red-500 to-rose-600 border-0"
                                        : "bg-gradient-to-r from-sky-500 to-blue-600 border-0"
                                    }>
                                      {lesson.status === "completed" ? t("detail.lessonStatuses.completed") : lesson.status === "cancelled" ? t("detail.lessonStatuses.cancelled") : t("detail.lessonStatuses.scheduled")}
                                    </Badge>
                                  </div>
                                </div>

                                <Button onClick={() => handleEditLesson(lesson)} className="w-full rounded-xl">
                                  <Edit className="h-4 w-4 mr-2" /> {t("detail.editLesson")}
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        );
                      })}
                      {dayLessons.length > 3 && (
                        <div className="text-[9px] sm:text-xs text-muted-foreground text-center py-1 rounded-lg bg-white/50 dark:bg-white/10">
                          +{dayLessons.length - 3} {t("detail.more")}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* List View - Bento Style */}
          <TabsContent value="list">
            {/* Mobile View - Cards */}
            <div className="md:hidden space-y-3">
              {lessons.length === 0 ? (
                <div className="text-center text-muted-foreground py-12 rounded-2xl bg-muted/30">
                  <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p>{t("detail.noLessons")}</p>
                </div>
              ) : (
                lessons
                  .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                  .map((lesson) => {
                    const group = groups.find((g) => g.id === lesson.groupId);
                    const room = rooms.find((r) => r.id === lesson.roomId);

                    return (
                      <div 
                        key={lesson.id} 
                        className={`p-4 rounded-2xl cursor-pointer transition-all hover:shadow-soft ${
                          lesson.status === "completed"
                            ? "bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950 dark:to-green-900"
                            : "bg-gradient-to-br from-sky-50 to-blue-100 dark:from-sky-950 dark:to-blue-900"
                        }`}
                        onClick={() => handleLessonClick(lesson)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate">{lesson.title}</div>
                            <div className="text-sm text-muted-foreground">{moment(lesson.start).format("DD.MM.YYYY, dddd")}</div>
                          </div>
                          <Badge className={`shrink-0 ${
                            lesson.status === "completed"
                              ? "bg-gradient-to-r from-emerald-500 to-green-600 border-0"
                              : "bg-gradient-to-r from-sky-500 to-blue-600 border-0"
                          }`}>
                            {lesson.status === "completed" ? t("detail.completedShort") : t("detail.scheduledShort")}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/50 dark:bg-white/10">
                            <Clock className="h-3 w-3" />
                            <span>{moment(lesson.start).format("HH:mm")} - {moment(lesson.end).format("HH:mm")}</span>
                          </div>
                          {group && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/50 dark:bg-white/10">
                              <Users className="h-3 w-3" />
                              <span className="truncate">{group.name}</span>
                            </div>
                          )}
                          {room && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/50 dark:bg-white/10">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{room.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Desktop View - Bento Table */}
            <div className="hidden md:block rounded-2xl overflow-hidden border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-800">
                    <TableHead className="font-semibold">{t("detail.tableHeaders.date")}</TableHead>
                    <TableHead className="font-semibold">{t("detail.tableHeaders.time")}</TableHead>
                    <TableHead className="font-semibold">{t("detail.tableHeaders.title")}</TableHead>
                    <TableHead className="font-semibold">{t("detail.tableHeaders.group")}</TableHead>
                    <TableHead className="font-semibold">{t("detail.tableHeaders.room")}</TableHead>
                    <TableHead className="font-semibold">{t("detail.tableHeaders.status")}</TableHead>
                    <TableHead className="text-right font-semibold">{t("detail.tableHeaders.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lessons.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                        <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                        <p>{t("detail.noLessons")}</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    lessons
                      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                      .map((lesson) => {
                        const group = groups.find((g) => g.id === lesson.groupId);
                        const room = rooms.find((r) => r.id === lesson.roomId);

                      return (
                        <TableRow key={lesson.id} className="hover:bg-muted/30">
                          <TableCell>{moment(lesson.start).format("DD.MM.YYYY, dddd")}</TableCell>
                          <TableCell>
                            <span className="px-2 py-1 rounded-lg bg-muted/50 text-sm">
                              {moment(lesson.start).format("HH:mm")} - {moment(lesson.end).format("HH:mm")}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium">{lesson.title}</TableCell>
                          <TableCell>
                            {group ? (
                              <span className="flex items-center gap-1.5">
                                <Users className="h-3 w-3 text-muted-foreground" />
                                {group.name}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">{t("individual")}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {room ? (
                              <span className="flex items-center gap-1.5">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                {room.name}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">{lesson.room}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                lesson.status === "completed"
                                  ? "bg-gradient-to-r from-emerald-500 to-green-600 border-0"
                                  : lesson.status === "cancelled"
                                  ? "bg-gradient-to-r from-red-500 to-rose-600 border-0"
                                  : "bg-gradient-to-r from-sky-500 to-blue-600 border-0"
                              }
                            >
                              {lesson.status === "completed"
                                ? t("detail.lessonStatuses.completed")
                                : lesson.status === "cancelled"
                                ? t("detail.lessonStatuses.cancelled")
                                : t("detail.lessonStatuses.scheduled")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditLesson(lesson)}
                              className="rounded-xl hover:bg-sky-100 dark:hover:bg-sky-900/50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                )}
              </TableBody>
            </Table>
            </div>
          </TabsContent>
        </Tabs>
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
        mode={lessonFormMode}
        onSuccess={() => {
          setLessonFormData(null);
        }}
      />

      {/* Edit Teacher Dialog - Bento Style */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600">
                <Edit className="h-5 w-5 text-white" />
              </div>
              {t("editTeacher")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditTeacher} className="space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-800 space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium">{t("fields.name")}</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={teacher.name}
                  required
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="subject" className="text-sm font-medium">{t("fields.subject")}</Label>
                <Input
                  id="subject"
                  name="subject"
                  defaultValue={teacher.subject}
                  required
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="email" className="text-sm font-medium">{t("fields.email")}</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={teacher.email}
                    required
                    className="mt-1.5 rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-sm font-medium">{t("fields.phone")}</Label>
                  <Input
                    id="phone"
                    name="phone"
                    defaultValue={teacher.phone}
                    required
                    className="mt-1.5 rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="status" className="text-sm font-medium">{t("fields.status")}</Label>
                  <Select name="status" defaultValue={teacher.status}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t("statuses.active")}</SelectItem>
                      <SelectItem value="inactive">{t("statuses.inactive")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="workload" className="text-sm font-medium">{t("fields.hoursPerWeek")}</Label>
                  <Input
                    id="workload"
                    name="workload"
                    type="number"
                    defaultValue={teacher.workload}
                    required
                    className="mt-1.5 rounded-xl"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="rounded-xl">
                {t("common:cancel")}
              </Button>
              <Button type="submit" className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700">
                {t("common:save")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Teacher Rates Modal */}
      <TeacherRatesModal
        open={isRatesModalOpen}
        onOpenChange={setIsRatesModalOpen}
        teacherId={teacher.id}
      />

      {/* Salary Calculation Dialog - Bento Style */}
      <Dialog open={isSalaryCalcOpen} onOpenChange={setIsSalaryCalcOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              {t("salary.title")}: {teacher.name}
            </DialogTitle>
          </DialogHeader>
          <SalaryCalculationComponent
            teacher={teacher}
            periodStart={salaryPeriodStart}
            periodEnd={salaryPeriodEnd}
            onPeriodStartChange={setSalaryPeriodStart}
            onPeriodEndChange={setSalaryPeriodEnd}
            t={t}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSalaryCalcOpen(false)} className="rounded-xl">
              {t("salary.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription", { name: teacher.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTeacher} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common:delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Salary Calculation Component - Bento Style
function SalaryCalculationComponent({
  teacher,
  periodStart,
  periodEnd,
  onPeriodStartChange,
  onPeriodEndChange,
  t,
}: {
  teacher: any;
  periodStart: string;
  periodEnd: string;
  onPeriodStartChange: (value: string) => void;
  onPeriodEndChange: (value: string) => void;
  t: (key: string, options?: any) => string;
}) {
  const [salaryData, setSalaryData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const calculateSalary = async () => {
    if (!teacher?.id) return;
    
    setIsLoading(true);
    try {
      const data = await teacherRatesAPI.calculateSalary(teacher.id, periodStart, periodEnd);
      setSalaryData(data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || t("salary.error"));
      setSalaryData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-calculate when period changes
  useEffect(() => {
    if (teacher?.id && periodStart && periodEnd) {
      calculateSalary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacher?.id, periodStart, periodEnd]);

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="periodStart" className="text-sm font-medium">{t("salary.periodStart")}</Label>
            <Input
              id="periodStart"
              type="date"
              value={periodStart}
              onChange={(e) => onPeriodStartChange(e.target.value)}
              className="mt-1.5 rounded-xl"
            />
          </div>
          <div>
            <Label htmlFor="periodEnd" className="text-sm font-medium">{t("salary.periodEnd")}</Label>
            <Input
              id="periodEnd"
              type="date"
              value={periodEnd}
              onChange={(e) => onPeriodEndChange(e.target.value)}
              className="mt-1.5 rounded-xl"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 rounded-2xl bg-muted/30 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">{t("salary.calculating")}</p>
        </div>
      ) : salaryData?.breakdown && salaryData.breakdown.length > 0 ? (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950 dark:to-green-900">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold">{t("salary.result")}</span>
          </div>
          
          <div className="text-sm mb-4 px-3 py-2 rounded-xl bg-white/50 dark:bg-white/10 inline-block">
            <span className="text-muted-foreground">{t("salary.period")}: </span>
            <span className="font-medium">
              {moment(salaryData.period.start).format("DD.MM.YYYY")} - {moment(salaryData.period.end).format("DD.MM.YYYY")}
            </span>
          </div>
          
          <div className="space-y-3 mb-4">
            {salaryData.breakdown.map((item: any, index: number) => (
              <div key={index} className="p-4 rounded-xl bg-white/60 dark:bg-white/10">
                <div className="flex justify-between items-start mb-3">
                  <span className="font-semibold text-sm">
                    {item.lessonType === "group" ? t("salary.groupLessons") : item.lessonType === "individual" ? t("salary.individualLessons") : t("salary.specialLessons")}
                  </span>
                  <Badge className="text-xs bg-gradient-to-r from-violet-500 to-purple-600 border-0">
                    {item.rate.type === "hourly" ? t("salary.hourly") : t("salary.perLesson")}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-3">
                  <div className="p-2 rounded-lg bg-white/50 dark:bg-white/5">
                    {item.rate.type === "hourly" ? (
                      <>
                        <span>{t("salary.hours")}: </span>
                        <span className="font-semibold text-foreground">{parseFloat(item.hours).toFixed(2)}</span>
                      </>
                    ) : (
                      <>
                        <span>{t("salary.lessonsCount")}: </span>
                        <span className="font-semibold text-foreground">{item.lessons}</span>
                      </>
                    )}
                  </div>
                  <div className="p-2 rounded-lg bg-white/50 dark:bg-white/5 text-right">
                    <span>{t("salary.rate")}: </span>
                    <span className="font-semibold text-foreground">{item.rate.value.toLocaleString()} ₸</span>
                    <span className="text-[10px]">/{item.rate.type === "hourly" ? t("salary.perHour") : t("salary.perLessonUnit")}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-white/30">
                  <span className="text-sm text-muted-foreground">{t("salary.amount")}:</span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{item.salary.toLocaleString()} ₸</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white">
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-medium opacity-90">{t("salary.total")}:</span>
              <span className="text-3xl font-bold">
                {salaryData.total.toLocaleString()} ₸
              </span>
            </div>
          </div>
        </div>
      ) : salaryData?.message ? (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-900">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {salaryData.message === "No active rates found for this teacher" 
              ? t("salary.noRates")
              : salaryData.message}
          </p>
        </div>
      ) : salaryData && (!salaryData.breakdown || salaryData.breakdown.length === 0) ? (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-900">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {t("salary.noLessons")}
          </p>
        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-900">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {t("salary.noRates")}
          </p>
        </div>
      )}
    </div>
  );
}


import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueries } from "@tanstack/react-query";
import * as subscriptionsApi from "@/api/subscriptions";
import {
  useStudents,
  useGroups,
  useStudentBalance,
  useStudentSubscriptions,
  useStudentTransactions,
  useStudentActivities,
  useStudentNotes,
  useAddStudentNote,
  useUpdateStudentStatus,
  useStudentAttendanceJournal,
  useStudentNotifications,
  useMarkNotificationRead,
  useStudentAttendance,
  useLessons,
  useTeachers,
  useCreateTransaction,
  useUpdateTransaction,
  useFreezeSubscription,
  useDeleteSubscription,
  useUpdateGroup,
  useDiscounts,
  useCreateDiscount,
  useStudentDiscounts,
  useApplyDiscountToStudent,
  useRemoveStudentDiscount,
} from "@/hooks/useData";
import AssignSubscriptionModal from "@/components/AssignSubscriptionModal";
import FreezeSubscriptionModal from "@/components/FreezeSubscriptionModal";
import { StudentLessonCalendar } from "@/components/StudentLessonCalendar";
import { BalanceChart } from "@/components/BalanceChart";
import { SubscriptionProgress } from "@/components/SubscriptionProgress";
import { StudentStats, AttendanceStat, BalanceStat, LessonsStat, NextLessonStat } from "@/components/StudentStats";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { EditStudentDialog } from "@/components/EditStudentDialog";
import { StudentReportsDialog } from "@/components/StudentReportsDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Bell, 
  Loader2,
  Mail,
  Phone,
  BookOpen,
  Users,
  StickyNote,
  Clock,
  X,
  Plus,
  Edit,
  Archive,
  Download,
  TrendingUp,
  GraduationCap,
  Trash2,
  Percent,
  Wallet,
  CalendarClock,
  ChevronsUpDown,
} from "lucide-react";
import { Discount, PaymentTransaction } from "@/types";
import moment from "moment";
import "moment/locale/ru";
import "moment/locale/kk";

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(["students", "common"]);
  moment.locale(i18n.language);
  const { data: students = [] } = useStudents();
  const { data: groups = [] } = useGroups();
  const { data: lessons = [] } = useLessons();
  const { data: teachers = [] } = useTeachers();
  const { data: balance } = useStudentBalance(id || "");
  const { data: subscriptions = [] } = useStudentSubscriptions(id || "");
  const { data: transactions = [] } = useStudentTransactions(id || "");
  const { data: activities = [] } = useStudentActivities(id || "");
  const { data: notes = [] } = useStudentNotes(id || "");
  const { data: journal = [] } = useStudentAttendanceJournal(id || "");
  const { data: notifications = [] } = useStudentNotifications(id || "");
  const { data: studentAttendances = [] } = useStudentAttendance(id || "");
  const { data: discountsData = [] } = useDiscounts();
  const discounts: Discount[] = Array.isArray(discountsData) ? discountsData : [];
  const { data: studentDiscounts = [] } = useStudentDiscounts(id || "");
  
  const freezeQueries = useMemo(() => 
    subscriptions.map((sub) => ({
      queryKey: ["subscriptions", sub.id, "freezes"],
      queryFn: () => subscriptionsApi.getSubscriptionFreezes(sub.id),
      enabled: !!sub.id,
    })),
    [subscriptions]
  );
  
  const freezeResults = useQueries({ queries: freezeQueries });
  const allFreezes = useMemo(() => {
    const apiFreezes = freezeResults
      .map((result) => result.data || [])
      .flat()
      .map((freeze) => ({
        start: new Date(freeze.freezeStart),
        end: freeze.freezeEnd ? new Date(freeze.freezeEnd) : new Date(),
      }));

    if (apiFreezes.length > 0) return apiFreezes;

    try {
      const parsed = (activities || [])
        .filter((a: any) => a.activityType === "freeze" && a.metadata)
        .map((a: any) => {
          const meta = JSON.parse(a.metadata || "{}");
          const start = meta.freezeStart ? new Date(meta.freezeStart) : null;
          const end = meta.freezeEnd ? new Date(meta.freezeEnd) : null;
          return start && end ? { start, end } : null;
        })
        .filter(Boolean) as Array<{ start: Date; end: Date }>;
      return parsed;
    } catch {
      return [] as Array<{ start: Date; end: Date }>;
    }
  }, [freezeResults, activities]);
  
  const addNote = useAddStudentNote();
  const updateStatus = useUpdateStudentStatus();
  const markNotificationRead = useMarkNotificationRead();
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const freezeSubscription = useFreezeSubscription();
  const deleteSubscription = useDeleteSubscription();
  const updateGroup = useUpdateGroup();
  const applyDiscount = useApplyDiscountToStudent();
  const removeDiscount = useRemoveStudentDiscount();

  const [newNote, setNewNote] = useState("");
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [isAssignSubModalOpen, setIsAssignSubModalOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isEditPaymentDialogOpen, setIsEditPaymentDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<PaymentTransaction | null>(null);
  const [selectedSubscriptionForFreeze, setSelectedSubscriptionForFreeze] = useState<any>(null);
  const [isFreezeModalOpen, setIsFreezeModalOpen] = useState(false);
  const [isEditStudentDialogOpen, setIsEditStudentDialogOpen] = useState(false);
  const [isReportsDialogOpen, setIsReportsDialogOpen] = useState(false);
  const [groupComboboxOpen, setGroupComboboxOpen] = useState(false);

  const student = students.find((s) => s.id === id);
  const studentGroups = student ? groups.filter((g) => student.groupIds?.includes(g.id)) : [];
  
  const studentLessons = student ? lessons.filter((l) => 
    l.studentIds?.includes(student.id) || 
    (l.groupId && student.groupIds?.includes(l.groupId))
  ) : [];
  const upcomingLessons = studentLessons
    .filter((l) => moment(l.start).isAfter(moment()))
    .sort((a, b) => moment(a.start).diff(moment(b.start)));
  const nextLesson = upcomingLessons[0];

  const getIsActive = useMemo(() => {
    if (!student) return false;
    if (student.status === "inactive") {
      return false;
    }
    const bySchedule = studentLessons.some((l) => moment(l.start).isAfter(moment()));
    const byBalance = (balance?.balance ?? 0) > 0;
    const now = new Date();
    const bySubscription = subscriptions.some((s: any) => {
      const notExpired = s.paidTill ? (new Date(s.paidTill) >= now) : false;
      const hasLessons = (s.lessonsRemaining ?? 0) > 0;
      return s.status === "active" && (hasLessons || notExpired);
    });
    return bySchedule && byBalance && bySubscription;
  }, [student, studentLessons, balance, subscriptions]);

  const displayStatus = useMemo(() => {
    if (!student) return "active";
    if (student.status === "inactive" || student.status === "frozen" || student.status === "graduated") {
      return student.status;
    }
    return getIsActive ? "active" : "inactive";
  }, [student, getIsActive]);

  if (!student) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const attendanceStats = {
    total: (studentAttendances?.length || 0) || journal.length,
    attended: (studentAttendances?.filter((a) => a.status === "attended").length || 0) || journal.filter((j) => j.status === "attended").length,
    missed: (studentAttendances?.filter((a) => a.status === "missed").length || 0) || journal.filter((j) => j.status === "missed").length,
    cancelled: (studentAttendances?.filter((a) => a.status === "cancelled").length || 0) || journal.filter((j) => j.status === "cancelled").length,
  };

  const statusColors: Record<string, string> = {
    active: "bg-green-500",
    inactive: "bg-gray-500",
    frozen: "bg-blue-500",
    graduated: "bg-purple-500",
  };

  const statusNames: Record<string, string> = {
    active: t("statusNames.active"),
    inactive: t("statusNames.inactive"),
    frozen: t("statusNames.frozen"),
    graduated: t("statusNames.graduated"),
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !id) return;
    try {
      await addNote.mutateAsync({ studentId: id, note: newNote });
      setNewNote("");
      setIsNoteDialogOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    try {
      await updateStatus.mutateAsync({ studentId: id, status: newStatus as any });
      setSelectedStatus("");
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleNotificationClick = async (notificationId: number) => {
    try {
      await markNotificationRead.mutateAsync(notificationId);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleEditTransactionClick = (transaction: PaymentTransaction) => {
    setEditingTransaction(transaction);
    setIsEditPaymentDialogOpen(true);
  };

  // Prepare data for stats widgets
  const totalLessonsRemaining = subscriptions.reduce((sum, s) => sum + (s.lessonsRemaining || 0), 0);
  const totalLessonsInSubscriptions = subscriptions.reduce((sum, s) => sum + (s.totalLessons || 0), 0);
  
  const statsData = [
    AttendanceStat({ attended: attendanceStats.attended, total: attendanceStats.total }),
    BalanceStat({ balance: balance?.balance || 0 }),
    LessonsStat({ remaining: totalLessonsRemaining, total: totalLessonsInSubscriptions }),
    NextLessonStat({ date: nextLesson ? moment(nextLesson.start).format("DD MMM, HH:mm") : undefined }),
  ];

  // Prepare timeline data
  const timelineItems = [
    ...transactions.map((tx) => ({
      id: `transaction-${tx.id}`,
      date: tx.createdAt,
      type: tx.type === "payment" ? ("payment" as const) : tx.type === "refund" ? ("refund" as const) : ("debt" as const),
      title: tx.type === "payment" ? t("timeline.payment") : tx.type === "refund" ? t("timeline.refund") : t("timeline.debt"),
      description: tx.description || tx.paymentMethod,
      amount: tx.type === "payment" ? tx.amount : -tx.amount,
      status: tx.type === "payment" ? ("success" as const) : ("error" as const),
    })),
    ...journal
      .filter((j) => j.status === "attended")
      .map((j) => {
        const sub = subscriptions.find((s) => s.id === j.subscriptionId);
        const lessonCost = sub?.pricePerLesson || 0;
        return {
          id: `lesson-${j.lessonId || j.startTime}`,
          date: j.startTime,
          type: "lesson" as const,
          title: j.lessonTitle || t("timeline.lesson"),
          description: moment(j.startTime).format("HH:mm"),
          amount: -lessonCost,
          status: "info" as const,
        };
      }),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => navigate("/students")} 
        className="rounded-xl hover:bg-muted -mb-2"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t("backToStudents")}
      </Button>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        
        {/* Hero Card - Large */}
        <div className="lg:col-span-8 p-6 rounded-3xl bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 dark:from-violet-950 dark:via-purple-950 dark:to-indigo-900 relative overflow-hidden shadow-soft">
          <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-violet-200/30 dark:bg-violet-800/20 rounded-full blur-3xl" />
          <div className="absolute bottom-[-30%] left-[-5%] w-72 h-72 bg-purple-200/30 dark:bg-purple-800/20 rounded-full blur-3xl" />
          
          <div className="relative">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="relative group">
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-soft-lg shrink-0 group-hover:scale-105 transition-transform duration-300">
                    <User className="h-10 w-10 text-white" />
                  </div>
                  <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-lg border-3 border-white ${statusColors[displayStatus]}`}></div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-bold truncate">{student.name}</h1>
                    <Badge className={`${statusColors[displayStatus]} text-white border-0`}>
                      {statusNames[displayStatus]}
                    </Badge>
                  </div>
                  <Select value={selectedStatus} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-[180px] h-8 bg-white/50 dark:bg-white/10 border-0">
                      <SelectValue placeholder={t("changeStatus")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t("statusNames.active")}</SelectItem>
                      <SelectItem value="inactive">{t("statusNames.inactive")}</SelectItem>
                      <SelectItem value="frozen">{t("statusNames.frozen")}</SelectItem>
                      <SelectItem value="graduated">{t("statusNames.graduated")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {/* Contact Info Row */}
            <div className="flex flex-wrap gap-4 mb-6 text-sm">
              {student.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  <span>{student.phone}</span>
                </div>
              )}
              {student.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  <span>{student.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <span>{studentGroups.length} {studentGroups.length === 1 ? t("group_one") : t("group_many")}</span>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditStudentDialogOpen(true)}
                className="rounded-xl bg-white/70 dark:bg-white/10 border border-violet-200/50 dark:border-white/10 hover:bg-white hover:shadow-md hover:scale-[1.02] transition-all duration-200"
              >
                <Edit className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t("editBtn")}</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsReportsDialogOpen(true)}
                className="rounded-xl bg-white/70 dark:bg-white/10 border border-violet-200/50 dark:border-white/10 hover:bg-white hover:shadow-md hover:scale-[1.02] transition-all duration-200"
              >
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t("reports")}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Balance Card - Side */}
        <div className="lg:col-span-4 p-6 rounded-3xl bg-gradient-to-br from-emerald-50 via-green-50 to-teal-100 dark:from-emerald-950 dark:via-green-950 dark:to-teal-900 relative overflow-hidden shadow-soft">
          <div className="absolute top-[-30%] right-[-20%] w-48 h-48 bg-emerald-200/40 dark:bg-emerald-800/20 rounded-full blur-3xl" />
          
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-soft">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">{t("fields.balance")}</span>
            </div>
            
            <div className={`text-4xl font-bold mb-1 ${(balance?.balance || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {(balance?.balance || 0).toLocaleString()}
              <span className="text-lg font-normal ml-1">₸</span>
            </div>
            
            <div className="space-y-3 pt-4 border-t border-emerald-200/50 dark:border-emerald-700/50">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t("attendance")}</span>
                <span className="font-semibold">{attendanceStats.total > 0 ? Math.round((attendanceStats.attended / attendanceStats.total) * 100) : 0}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t("lessons")}</span>
                <span className="font-semibold">{attendanceStats.attended} {t("lessonsOf")} {attendanceStats.total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards Row - Only unique metrics */}
        <div className="lg:col-span-6 p-6 rounded-3xl bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 dark:from-violet-950 dark:via-purple-950 dark:to-indigo-900 shadow-soft relative overflow-hidden">
          <div className="absolute top-[-30%] right-[-20%] w-32 h-32 bg-violet-200/30 dark:bg-violet-800/20 rounded-full blur-3xl" />
          <div className="relative flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-soft">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">{t("lessonsLabel")}</span>
              <div className="text-3xl font-bold text-violet-600 dark:text-violet-400">
                {totalLessonsRemaining} <span className="text-lg font-normal text-muted-foreground">{t("lessonsOf")} {totalLessonsInSubscriptions}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 p-6 rounded-3xl bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100 dark:from-slate-950 dark:via-gray-950 dark:to-zinc-900 shadow-soft relative overflow-hidden">
          <div className="absolute top-[-30%] right-[-20%] w-32 h-32 bg-slate-200/30 dark:bg-slate-800/20 rounded-full blur-3xl" />
          <div className="relative flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-500 to-gray-600 shadow-soft">
              <CalendarClock className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">{t("nextLesson")}</span>
              <div className="text-2xl font-bold">
                {nextLesson ? moment(nextLesson.start).format("DD MMM, HH:mm") : "—"}
              </div>
              <div className="text-sm text-muted-foreground">
                {nextLesson ? (i18n.language === 'kk' ? 'жоспарланған' : i18n.language === 'en' ? 'scheduled' : 'запланирован') : t("noUpcomingLessons")}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notifications.filter((n) => !n.isRead).length > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-900 border border-amber-200/50 dark:border-amber-700/50">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600">
              <Bell className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold">{t("notifications")} ({notifications.filter((n) => !n.isRead).length})</span>
          </div>
          <div className="space-y-2">
            {notifications
              .filter((n) => !n.isRead)
              .map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-start justify-between gap-4 cursor-pointer hover:bg-white/50 dark:hover:bg-white/10 p-3 rounded-xl transition-colors"
                  onClick={() => handleNotificationClick(notification.id)}
                >
                  <p className="text-sm">{notification.message}</p>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {moment(notification.createdAt).fromNow()}
                  </Badge>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column - Narrow (Profile, Subscriptions, Discounts, Notes) */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Subscriptions */}
          <div className="p-5 rounded-xl bg-card border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[hsl(262,83%,58%)]">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">{t("subscriptions")}</h3>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground" 
                onClick={() => setIsAssignSubModalOpen(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                {t("add")}
              </Button>
            </div>
            
            <div className="space-y-3">
              {subscriptions.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 rounded-lg bg-muted/30">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">{t("noSubscriptions")}</p>
                </div>
              ) : (
                subscriptions.map((sub) => (
                  <div key={sub.id} className="p-4 rounded-lg border border-border bg-muted/20">
                    <SubscriptionProgress
                      lessonsUsed={sub.totalLessons - (sub.lessonsRemaining || 0)}
                      totalLessons={sub.totalLessons}
                      subscriptionName={sub.subscriptionTypeName || "Индивидуальный"}
                      size="sm"
                    />
                    <div className="space-y-2 pt-3 mt-3 border-t border-border">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{t("subscriptionCost")}</span>
                        {sub.originalPrice && sub.originalPrice > sub.totalPrice && sub.discountAmount ? (
                          <div className="flex flex-col items-end">
                            <span className="font-semibold text-emerald-600">{sub.totalPrice.toLocaleString()} ₸</span>
                            <span className="line-through text-muted-foreground text-[10px]">{sub.originalPrice.toLocaleString()} ₸</span>
                          </div>
                        ) : (
                          <span className="font-semibold text-foreground">{sub.totalPrice.toLocaleString()} ₸</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{t("perLesson")}</span>
                        <span className="font-semibold text-foreground">{sub.pricePerLesson.toFixed(0)} ₸</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{t("period")}</span>
                        <span className="font-semibold text-foreground">
                          {moment(sub.startDate).format("DD.MM")} - {sub.endDate ? moment(sub.endDate).format("DD.MM") : "∞"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <Badge variant="outline" className={sub.status === "active" 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 text-xs" 
                          : "text-xs"
                        }>
                          {sub.status === "active" ? t("statusActive") : t("statusInactive")}
                        </Badge>
                        <div className="flex items-center gap-1 ml-auto">
                          {sub.status === "active" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setSelectedSubscriptionForFreeze(sub);
                                setIsFreezeModalOpen(true);
                              }}
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              {t("freezeSubscription")}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-rose-600"
                            onClick={async () => {
                              if (window.confirm(t("deleteSubscriptionConfirm"))) {
                                await deleteSubscription.mutateAsync(sub.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Discounts */}
          <div className="p-5 rounded-xl bg-card border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500">
                  <Percent className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">{t("discounts")}</h3>
              </div>
              <StudentDiscountCreateDialog studentId={id || ""} onApplied={() => { }} />
            </div>
            
            {studentDiscounts.length === 0 ? (
              <div className="text-center text-muted-foreground py-6 rounded-lg bg-muted/30">
                <p className="text-sm">{t("noDiscounts")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {studentDiscounts.map((sd) => {
                  const discount = discounts.find((d) => d.id === sd.discountId);
                  return discount ? (
                    <div key={sd.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                      <div>
                        <div className="font-medium text-sm text-foreground">{discount.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {discount.type === "percentage" ? `${discount.value}%` : `${discount.value} ₸`}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          if (id) {
                            removeDiscount.mutate({ studentId: id, discountId: discount.id });
                          }
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : null;
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="p-5 rounded-xl bg-card border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-sky-500">
                  <StickyNote className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">{t("notes")}</h3>
              </div>
              <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground">
                    <Plus className="h-3 w-3 mr-1" />
                    {t("add")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-sky-500">
                        <StickyNote className="h-5 w-5 text-white" />
                      </div>
                      {t("newNote")}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Textarea
                      placeholder={t("writeNote")}
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={4}
                    />
                    <Button onClick={handleAddNote} disabled={!newNote.trim()}>
                      {t("save")}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {notes.length === 0 ? (
                <div className="text-center text-muted-foreground py-6 rounded-lg bg-muted/30">
                  <StickyNote className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">{t("noNotes")}</p>
                </div>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="p-3 rounded-lg border border-border bg-muted/20">
                    <p className="text-sm text-foreground">{note.note}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {moment(note.createdAt).format("DD.MM.YYYY HH:mm")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Wide (Charts, Groups, Activity) */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Balance Chart */}
          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[hsl(262,83%,58%)]">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">{t("balanceHistory")}</h3>
              </div>
              <Button 
                size="sm" 
                onClick={() => setIsPaymentDialogOpen(true)}
                className="bg-gradient-to-r from-[#6366f1] via-[#a855f7] to-[#ec4899] hover:opacity-90 text-white border-0"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("addPayment")}
              </Button>
            </div>
            <BalanceChart transactions={transactions} currentBalance={balance?.balance || 0} />
          </div>

          {/* Calendar */}
          {id && subscriptions.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <StudentLessonCalendar
                studentId={id}
                subscriptions={subscriptions}
                lessons={studentLessons}
                attendances={studentAttendances}
                freezes={allFreezes}
              />
            </div>
          )}

          {/* Groups - Compact */}
          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-sky-500">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">{t("groups")}</h3>
              </div>
              <Popover open={groupComboboxOpen} onOpenChange={setGroupComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={groupComboboxOpen}
                    className="w-[200px] h-9 justify-between rounded-lg"
                  >
                    {t("addToGroup")}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0 rounded-xl" align="end">
                  <Command>
                    <CommandInput
                      placeholder={t("searchGroupsPlaceholder")}
                      className="rounded-t-xl border-0 border-b"
                    />
                    <CommandList>
                      <CommandEmpty>{t("noGroupsFound")}</CommandEmpty>
                      <CommandGroup>
                        {groups
                          .filter((g) => !studentGroups.find((sg) => sg.id === g.id))
                          .map((group) => (
                            <CommandItem
                              key={group.id}
                              value={`${group.name} ${group.subject}`}
                              onSelect={async () => {
                                if (!id) return;
                                if (!group.studentIds.includes(id)) {
                                  await updateGroup.mutateAsync({
                                    id: group.id,
                                    data: {
                                      ...group,
                                      studentIds: [...group.studentIds, id],
                                    },
                                  });
                                }
                                setGroupComboboxOpen(false);
                              }}
                            >
                              {group.name} — {group.subject}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            
            {studentGroups.length === 0 ? (
              <div className="text-center text-muted-foreground py-10 rounded-lg bg-muted/30">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>{t("notInGroups")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {studentGroups.map((group) => {
                  const groupLessons = studentLessons.filter(
                    (l) => l.groupId === group.id && l.status !== "cancelled"
                  );
                  
                  const scheduleMap = new Map<number, string>();
                  groupLessons.forEach((lesson) => {
                    const dayOfWeek = moment(lesson.start).day();
                    const timeKey = `${moment(lesson.start).format("HH:mm")} - ${moment(lesson.end).format("HH:mm")}`;
                    if (!scheduleMap.has(dayOfWeek)) {
                      scheduleMap.set(dayOfWeek, timeKey);
                    }
                  });

                  const weekdayNames = t("weekdays.short", { returnObjects: true }) as string[];
                  const sortedDays = Array.from(scheduleMap.keys()).sort((a, b) => {
                    const aAdj = a === 0 ? 7 : a;
                    const bAdj = b === 0 ? 7 : b;
                    return aAdj - bAdj;
                  });
                  const scheduleText = sortedDays.map(day => weekdayNames[day]).join(" ");
                  const scheduleTime = scheduleMap.get(sortedDays[0]) || "";

                  return (
                    <div key={group.id} className="p-4 rounded-lg border border-border bg-muted/20 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-foreground truncate">{group.name}</h4>
                            <Badge variant="outline" className="text-xs shrink-0">{group.subject}</Badge>
                          </div>
                          {scheduleText && scheduleTime && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              <span className="font-medium">{scheduleText}</span>
                              <span>{scheduleTime}</span>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground shrink-0"
                          onClick={async () => {
                            if (!id) return;
                            await updateGroup.mutateAsync({
                              id: group.id,
                              data: {
                                ...group,
                                studentIds: group.studentIds.filter((sid) => sid !== id),
                              },
                            });
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Activity Timeline */}
          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-lg bg-[hsl(262,83%,58%)]">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{t("activity")}</h3>
            </div>
            <ActivityTimeline items={timelineItems} maxItems={15} />
          </div>
        </div>
      </div>
      
      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("paymentDialog.title")}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              try {
                await createTransaction.mutateAsync({
                  studentId: id || "",
                  amount: parseFloat(formData.get("amount") as string),
                  type: "payment" as any,
                  paymentMethod: formData.get("paymentMethod") as any,
                  description: formData.get("description") as string,
                });
                setIsPaymentDialogOpen(false);
              } catch (error) {
                // Error handled by mutation
              }
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="amount">{t("paymentDialog.amount")}</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="paymentMethod">{t("paymentDialog.method")}</Label>
              <Select name="paymentMethod" required>
                <SelectTrigger>
                  <SelectValue placeholder={t("paymentDialog.methodPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t("paymentDialog.methodCash")}</SelectItem>
                  <SelectItem value="card">{t("paymentDialog.methodCard")}</SelectItem>
                  <SelectItem value="transfer">{t("paymentDialog.methodTransfer")}</SelectItem>
                  <SelectItem value="other">{t("paymentDialog.methodOther")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">{t("paymentDialog.description")}</Label>
              <Textarea
                id="description"
                name="description"
                placeholder={t("paymentDialog.descriptionPlaceholder")}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPaymentDialogOpen(false)}
              >
                {t("paymentDialog.cancel")}
              </Button>
              <Button type="submit" disabled={createTransaction.isPending}>
                {createTransaction.isPending ? t("paymentDialog.saving") : t("paymentDialog.submit")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Payment Dialog */}
      <Dialog
        open={isEditPaymentDialogOpen}
        onOpenChange={(open) => {
          setIsEditPaymentDialogOpen(open);
          if (!open) {
            setEditingTransaction(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("paymentDialog.editTitle")}</DialogTitle>
          </DialogHeader>
          {editingTransaction ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editingTransaction) return;
                const formData = new FormData(e.currentTarget);
                const amountInput = parseFloat(formData.get("amount") as string);
                const amount = Number.isNaN(amountInput) ? editingTransaction.amount : Math.abs(amountInput);
                const paymentMethod = formData.get("paymentMethod") as PaymentTransaction["paymentMethod"];
                const description = (formData.get("description") as string) || "";

                try {
                  await updateTransaction.mutateAsync({
                    id: editingTransaction.id,
                    data: {
                      amount,
                      paymentMethod,
                      description,
                    },
                  });
                  setIsEditPaymentDialogOpen(false);
                  setEditingTransaction(null);
                } catch (error) {
                  // Error handled by mutation
                }
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="edit-amount">{t("paymentDialog.amount")}</Label>
                <Input
                  id="edit-amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  defaultValue={editingTransaction.amount}
                />
              </div>
              <div>
                <Label htmlFor="edit-paymentMethod">{t("paymentDialog.method")}</Label>
                <Select name="paymentMethod" defaultValue={editingTransaction.paymentMethod} required>
                  <SelectTrigger id="edit-paymentMethod">
                    <SelectValue placeholder={t("paymentDialog.methodPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t("paymentDialog.methodCash")}</SelectItem>
                    <SelectItem value="card">{t("paymentDialog.methodCard")}</SelectItem>
                    <SelectItem value="transfer">{t("paymentDialog.methodTransfer")}</SelectItem>
                    <SelectItem value="other">{t("paymentDialog.methodOther")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-description">{t("paymentDialog.description")}</Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  placeholder={t("paymentDialog.descriptionPlaceholder")}
                  rows={3}
                  defaultValue={editingTransaction.description}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditPaymentDialogOpen(false);
                    setEditingTransaction(null);
                  }}
                >
                  {t("paymentDialog.cancel")}
                </Button>
                <Button type="submit" disabled={updateTransaction.isPending}>
                  {updateTransaction.isPending ? t("paymentDialog.saving") : t("paymentDialog.saveChanges")}
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground py-4">
              {t("paymentDialog.selectForEdit")}
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Subscription Modal */}
      <AssignSubscriptionModal
        open={isAssignSubModalOpen}
        onClose={() => setIsAssignSubModalOpen(false)}
        student={student}
        onSuccess={() => {
          window.location.reload();
        }}
      />

      {/* Freeze Subscription Modal */}
      {selectedSubscriptionForFreeze && (
        <FreezeSubscriptionModal
          open={isFreezeModalOpen}
          onClose={() => {
            setIsFreezeModalOpen(false);
            setSelectedSubscriptionForFreeze(null);
          }}
          subscription={selectedSubscriptionForFreeze}
          onFreeze={async (freezeStart, freezeEnd, reason) => {
            await freezeSubscription.mutateAsync({
              subscriptionId: selectedSubscriptionForFreeze.id,
              data: { freezeStart, freezeEnd, reason },
            });
          }}
          isLoading={freezeSubscription.isPending}
        />
      )}

      {/* Edit Student Dialog */}
      <EditStudentDialog
        open={isEditStudentDialogOpen}
        onOpenChange={setIsEditStudentDialogOpen}
        student={student}
      />

      {/* Reports Dialog */}
      <StudentReportsDialog
        open={isReportsDialogOpen}
        onOpenChange={setIsReportsDialogOpen}
        student={student}
        groups={groups}
        teachers={teachers}
      />
    </div>
  );
}

function StudentDiscountCreateDialog({ studentId, onApplied }: { studentId: string; onApplied?: () => void }) {
  const { t } = useTranslation("students");
  const { data: discountsData = [] } = useDiscounts();
  const discounts: Discount[] = Array.isArray(discountsData) ? discountsData : [];
  const createDiscount = useCreateDiscount();
  const applyDiscount = useApplyDiscountToStudent();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "apply">("create");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-3 text-xs">
          <Plus className="h-3 w-3 mr-1" />
          {t("add")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("newDiscount") : t("applyDiscount")}</DialogTitle>
        </DialogHeader>

        {mode === "create" ? (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget as HTMLFormElement);
              const data = {
                name: formData.get("name") as string,
                description: (formData.get("description") as string) || "",
                type: formData.get("type") as "percentage" | "fixed",
                value: parseFloat(formData.get("value") as string),
                isActive: true,
              };
              const created = await createDiscount.mutateAsync(data);
              if (created && typeof created === 'object' && 'id' in created && studentId) {
                await applyDiscount.mutateAsync({ studentId, data: { discountId: created.id as string } });
              }
              setOpen(false);
              onApplied?.();
            }}
          >
            <div>
              <Label htmlFor="name">{t("discountName")}</Label>
              <Input id="name" name="name" required />
            </div>
            <div>
              <Label htmlFor="description">{t("discountDescription")}</Label>
              <Input id="description" name="description" />
            </div>
            <div>
              <Label htmlFor="type">{t("discountType")}</Label>
              <Select name="type" defaultValue="percentage" required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">{t("discountTypePercent")}</SelectItem>
                  <SelectItem value="fixed">{t("discountTypeFixed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="value">{t("discountValue")}</Label>
              <Input id="value" name="value" type="number" step="0.01" required />
            </div>
            <div className="flex items-center justify-between pt-2">
              <Button type="button" variant="ghost" onClick={() => setMode("apply")}>{t("selectExisting")}</Button>
              <Button type="submit">{t("createAndApply")}</Button>
            </div>
          </form>
        ) : (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget as HTMLFormElement);
              const discountId = formData.get("discountId") as string;
              const expiresAt = formData.get("expiresAt") as string;
              if (!studentId || !discountId) return;
              await applyDiscount.mutateAsync({
                studentId,
                data: { discountId, expiresAt: expiresAt || undefined },
              });
              setOpen(false);
              onApplied?.();
            }}
          >
            <div>
              <Label htmlFor="discountId">{t("discount")}</Label>
              <Select name="discountId" required>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectDiscount")} />
                </SelectTrigger>
                <SelectContent>
                  {discounts.filter((d) => d.isActive).map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} - {d.type === "percentage" ? `${d.value}%` : `${d.value} ₸`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="expiresAt">{t("expiresAt")}</Label>
              <Input id="expiresAt" name="expiresAt" type="date" />
            </div>
            <div className="flex items-center justify-between pt-2">
              <Button type="button" variant="ghost" onClick={() => setMode("create")}>{t("createNew")}</Button>
              <Button type="submit">{t("apply")}</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

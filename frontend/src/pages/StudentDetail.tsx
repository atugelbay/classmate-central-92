import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  User, 
  DollarSign, 
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
} from "lucide-react";
import { Discount, PaymentTransaction } from "@/types";
import moment from "moment";
import "moment/locale/ru";

moment.locale("ru");

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
    active: "Активный",
    inactive: "Неактивный",
    frozen: "Заморожен",
    graduated: "Закончил",
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
      title: tx.type === "payment" ? "Оплата" : tx.type === "refund" ? "Возврат" : "Долг",
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
          title: j.lessonTitle || "Занятие",
          description: moment(j.startTime).format("HH:mm"),
          amount: -lessonCost,
          status: "info" as const,
        };
      }),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="relative bg-card border-b shadow-sm">
        <div className="relative px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-start justify-between mb-6">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/students")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-9"
                  onClick={() => setIsEditStudentDialogOpen(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Править
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-9"
                  onClick={() => setIsReportsDialogOpen(true)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Отчеты
                </Button>
              </div>
            </div>
            
            <div className="flex items-start gap-6">
              <div className="relative group">
                <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20 group-hover:scale-105 transition-transform duration-300">
                  <User className="h-12 w-12 text-primary" />
                </div>
                <div className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-4 border-white ${statusColors[displayStatus]}`}></div>
              </div>
              
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2 break-words">{student.name}</h1>
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <Badge className={`${statusColors[displayStatus]} text-white border-0`}>
                    {statusNames[displayStatus]}
                  </Badge>
                  <Select value={selectedStatus} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-[180px] h-8">
                      <SelectValue placeholder="Изменить статус" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Активный</SelectItem>
                      <SelectItem value="inactive">Неактивный</SelectItem>
                      <SelectItem value="frozen">Заморожен</SelectItem>
                      <SelectItem value="graduated">Закончил</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                  {student.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{student.phone}</span>
                    </div>
                  )}
                  {student.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{student.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    <span>{studentGroups.length} {studentGroups.length === 1 ? "группа" : "групп"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notifications.filter((n) => !n.isRead).length > 0 && (
        <div className="max-w-7xl mx-auto px-6 -mt-4">
          <Card className="border-2 border-yellow-400 dark:border-yellow-500 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                <Bell className="h-5 w-5" />
                Важные уведомления ({notifications.filter((n) => !n.isRead).length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {notifications
                .filter((n) => !n.isRead)
                .map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-start justify-between gap-4 cursor-pointer hover:bg-yellow-100/50 dark:hover:bg-yellow-900/30 p-3 rounded-lg transition-colors"
                    onClick={() => handleNotificationClick(notification.id)}
                  >
                    <p className="text-sm text-yellow-900 dark:text-yellow-100">{notification.message}</p>
                    <Badge variant="outline" className="text-xs shrink-0 border-yellow-600 dark:border-yellow-500 text-yellow-700 dark:text-yellow-300">
                      {moment(notification.createdAt).fromNow()}
                    </Badge>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Quick Stats */}
        <StudentStats stats={statsData} />

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2 cols */}
          <div className="lg:col-span-2 space-y-6">
            {/* Calendar */}
            {id && subscriptions.length > 0 && (
              <Card className="shadow-lg border-2 hover:shadow-xl transition-shadow duration-300">
                <StudentLessonCalendar
                  studentId={id}
                  subscriptions={subscriptions}
                  lessons={studentLessons}
                  attendances={studentAttendances}
                  freezes={allFreezes}
                />
              </Card>
            )}

            {/* Groups */}
            <Card className="shadow-lg border-2 hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Группы
                  </CardTitle>
                  <Select
                    onValueChange={async (groupId) => {
                      if (!id || !groupId) return;
                      const group = groups.find((g) => g.id === groupId);
                      if (!group) return;
                      
                      if (!group.studentIds.includes(id)) {
                        await updateGroup.mutateAsync({
                          id: groupId,
                          data: {
                            ...group,
                            studentIds: [...group.studentIds, id],
                          },
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Добавить в группу" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups
                        .filter((g) => !studentGroups.find((sg) => sg.id === g.id))
                        .map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name} - {group.subject}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {studentGroups.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Студент не состоит в группах</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                      const weekdayNames = ["ВС", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"];
                      const sortedDays = Array.from(scheduleMap.keys()).sort((a, b) => {
                        const aAdj = a === 0 ? 7 : a;
                        const bAdj = b === 0 ? 7 : b;
                        return aAdj - bAdj;
                      });
                      const scheduleText = sortedDays.map(day => weekdayNames[day]).join(" ");
                      const scheduleTime = scheduleMap.get(sortedDays[0]) || "";

                      return (
                        <div key={group.id} className="p-4 border-2 rounded-lg hover:shadow-md transition-shadow bg-card">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold">{group.name}</h4>
                                <Badge variant="outline">{group.subject}</Badge>
                              </div>
                              {scheduleText && scheduleTime && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="h-4 w-4" />
                                  <span className="font-medium">{scheduleText}</span>
                                  <span>{scheduleTime}</span>
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
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
              </CardContent>
            </Card>

            {/* Balance Chart */}
            <Card className="shadow-lg border-2 hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    История баланса
                  </CardTitle>
                  <Button 
                    size="sm" 
                    onClick={() => setIsPaymentDialogOpen(true)}
                    className="h-9"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить платеж
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <BalanceChart transactions={transactions} currentBalance={balance?.balance || 0} />
              </CardContent>
            </Card>

            {/* Activity Timeline */}
            <Card className="shadow-lg border-2 hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  История активности
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityTimeline items={timelineItems} maxItems={15} />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - 1 col */}
          <div className="space-y-6">
            {/* Subscriptions with Progress */}
            <Card className="shadow-lg border-2 hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Абонементы
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-3 text-xs" 
                    onClick={() => setIsAssignSubModalOpen(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Добавить
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {subscriptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Нет абонементов</p>
                ) : (
                  subscriptions.map((sub) => (
                    <div key={sub.id} className="space-y-4">
                      <SubscriptionProgress
                        lessonsUsed={sub.totalLessons - (sub.lessonsRemaining || 0)}
                        totalLessons={sub.totalLessons}
                        subscriptionName={sub.subscriptionTypeName || "Индивидуальный"}
                        size="sm"
                      />
                      <div className="space-y-2 pt-2 border-t">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Стоимость</span>
                          <span className="font-semibold">{sub.totalPrice.toLocaleString()} ₸</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">За урок</span>
                          <span className="font-semibold">{sub.pricePerLesson.toFixed(0)} ₸</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Период</span>
                          <span className="font-semibold">
                            {moment(sub.startDate).format("DD.MM")} - {sub.endDate ? moment(sub.endDate).format("DD.MM") : "∞"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                          <Badge variant={sub.status === "active" ? "default" : "secondary"} className="text-xs">
                            {sub.status === "active" ? "Активен" : "Неактивен"}
                          </Badge>
                          {sub.status === "active" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => {
                                setSelectedSubscriptionForFreeze(sub);
                                setIsFreezeModalOpen(true);
                              }}
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              Заморозить
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Discounts */}
            <Card className="shadow-lg border-2 hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Скидки</CardTitle>
                  <StudentDiscountCreateDialog studentId={id || ""} onApplied={() => { }} />
                </div>
              </CardHeader>
              <CardContent>
                {studentDiscounts.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">(не задано)</p>
                ) : (
                  <div className="space-y-2">
                    {studentDiscounts.map((sd) => {
                      const discount = discounts.find((d) => d.id === sd.discountId);
                      return discount ? (
                        <div key={sd.id} className="flex items-center justify-between p-3 border-2 rounded-lg text-sm bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 hover:shadow-md transition-shadow">
                          <div>
                            <div className="font-medium">{discount.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {discount.type === "percentage" ? `${discount.value}%` : `${discount.value} ₸`}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
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
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="shadow-lg border-2 hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <StickyNote className="h-4 w-4" />
                  Заметки
                </CardTitle>
                <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-3 text-xs">
                      <Plus className="h-3 w-3 mr-1" />
                      Добавить
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Новая заметка</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Textarea
                        placeholder="Введите текст заметки..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        rows={4}
                      />
                      <Button onClick={handleAddNote} disabled={!newNote.trim()}>
                        Сохранить
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[300px] overflow-y-auto">
                {notes.length === 0 ? (
                  <p className="text-xs text-center text-muted-foreground py-4">Нет заметок</p>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="border-l-4 border-primary pl-3 py-2 bg-muted rounded-r">
                      <p className="text-sm">{note.note}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {moment(note.createdAt).format("DD.MM.YYYY HH:mm")}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить оплату</DialogTitle>
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
              <Label htmlFor="amount">Сумма (₸)</Label>
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
              <Label htmlFor="paymentMethod">Способ оплаты</Label>
              <Select name="paymentMethod" required>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите способ оплаты" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Наличные</SelectItem>
                  <SelectItem value="card">Карта</SelectItem>
                  <SelectItem value="transfer">Перевод</SelectItem>
                  <SelectItem value="other">Другое</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">Описание (опционально)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Дополнительная информация..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPaymentDialogOpen(false)}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={createTransaction.isPending}>
                {createTransaction.isPending ? "Сохранение..." : "Добавить оплату"}
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
            <DialogTitle>Изменить платеж</DialogTitle>
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
                <Label htmlFor="edit-amount">Сумма (₸)</Label>
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
                <Label htmlFor="edit-paymentMethod">Способ оплаты</Label>
                <Select name="paymentMethod" defaultValue={editingTransaction.paymentMethod} required>
                  <SelectTrigger id="edit-paymentMethod">
                    <SelectValue placeholder="Выберите способ оплаты" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Наличные</SelectItem>
                    <SelectItem value="card">Карта</SelectItem>
                    <SelectItem value="transfer">Перевод</SelectItem>
                    <SelectItem value="other">Другое</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-description">Описание (опционально)</Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  placeholder="Дополнительная информация..."
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
                  Отмена
                </Button>
                <Button type="submit" disabled={updateTransaction.isPending}>
                  {updateTransaction.isPending ? "Сохранение..." : "Сохранить изменения"}
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground py-4">
              Выберите платеж из списка для редактирования
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
          Добавить
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Новая скидка" : "Применить скидку"}</DialogTitle>
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
              <Label htmlFor="name">Название</Label>
              <Input id="name" name="name" required />
            </div>
            <div>
              <Label htmlFor="description">Описание</Label>
              <Input id="description" name="description" />
            </div>
            <div>
              <Label htmlFor="type">Тип скидки</Label>
              <Select name="type" defaultValue="percentage" required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Процентная</SelectItem>
                  <SelectItem value="fixed">Фиксированная сумма</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="value">Значение</Label>
              <Input id="value" name="value" type="number" step="0.01" required />
            </div>
            <div className="flex items-center justify-between pt-2">
              <Button type="button" variant="ghost" onClick={() => setMode("apply")}>выбрать существующую</Button>
              <Button type="submit">Создать и применить</Button>
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
              <Label htmlFor="discountId">Скидка</Label>
              <Select name="discountId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите скидку" />
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
              <Label htmlFor="expiresAt">Срок действия (необязательно)</Label>
              <Input id="expiresAt" name="expiresAt" type="date" />
            </div>
            <div className="flex items-center justify-between pt-2">
              <Button type="button" variant="ghost" onClick={() => setMode("create")}>создать новую</Button>
              <Button type="submit">Применить</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  FileText, 
  Bell, 
  Loader2,
  Mail,
  Phone,
  BookOpen,
  Users,
  StickyNote,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  X,
  Plus,
  Edit,
  Archive,
  Download,
  Paperclip,
  GripVertical,
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
  
  // Get freezes for all subscriptions using useQueries
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
    // 1) Try from subscription_freezes endpoint(s)
    const apiFreezes = freezeResults
      .map((result) => result.data || [])
      .flat()
      .map((freeze) => ({
        start: new Date(freeze.freezeStart),
        end: freeze.freezeEnd ? new Date(freeze.freezeEnd) : new Date(),
      }));

    if (apiFreezes.length > 0) return apiFreezes;

    // 2) Fallback: derive from student activity log entries of type "freeze"
    // activities already loaded above as `activities`
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

  const student = students.find((s) => s.id === id);

  // Derive data safely even if student is not yet loaded; this keeps hook order stable
  const studentGroups = student ? groups.filter((g) => student.groupIds?.includes(g.id)) : [];
  
  // Get student's lessons
  const studentLessons = student ? lessons.filter((l) => 
    l.studentIds?.includes(student.id) || 
    (l.groupId && student.groupIds?.includes(l.groupId))
  ) : [];
  const upcomingLessons = studentLessons
    .filter((l) => moment(l.start).isAfter(moment()))
    .sort((a, b) => moment(a.start).diff(moment(b.start)));
  const nextLesson = upcomingLessons[0];
  const nextLessonGroup = nextLesson?.groupId ? groups.find((g) => g.id === nextLesson.groupId) : null;

  // Calculate active status using the same logic as Students page
  // This ensures consistency between StudentDetail and Students pages
  const getIsActive = useMemo(() => {
    if (!student) return false;
    // If status is manually set to "inactive", student is inactive
    if (student.status === "inactive") {
      return false;
    }
    // Check if student has upcoming lessons
    const bySchedule = studentLessons.some((l) => moment(l.start).isAfter(moment()));
    // Check if student has positive balance
    const byBalance = (balance?.balance ?? 0) > 0;
    // Check if student has active subscription
    const now = new Date();
    const bySubscription = subscriptions.some((s: any) => {
      const notExpired = s.paidTill ? (new Date(s.paidTill) >= now) : false;
      const hasLessons = (s.lessonsRemaining ?? 0) > 0;
      return s.status === "active" && (hasLessons || notExpired);
    });
    // Active only if ALL three conditions are met
    return bySchedule && byBalance && bySubscription;
  }, [student, studentLessons, balance, subscriptions]);

  // Display status logic: match Students page behavior
  // If status is manually set to inactive/frozen/graduated, use it
  // Otherwise use computed status (getIsActive) for consistency with Students page filtering
  const displayStatus = useMemo(() => {
    if (!student) return "active";
    // If status is manually set to inactive/frozen/graduated, use it
    if (student.status === "inactive" || student.status === "frozen" || student.status === "graduated") {
      return student.status;
    }
    // Otherwise use computed status to match Students page logic
    return getIsActive ? "active" : "inactive";
  }, [student, getIsActive]);

  // If student still not loaded, show loader (after hooks to keep order stable)
  if (!student) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate attendance stats (use actual attendance records; fallback to journal)
  const attendanceStats = {
    total: (studentAttendances?.length || 0) || journal.length,
    attended: (studentAttendances?.filter((a) => a.status === "attended").length || 0) || journal.filter((j) => j.status === "attended").length,
    missed: (studentAttendances?.filter((a) => a.status === "missed").length || 0) || journal.filter((j) => j.status === "missed").length,
    cancelled: (studentAttendances?.filter((a) => a.status === "cancelled").length || 0) || journal.filter((j) => j.status === "cancelled").length,
  };
  const attendanceRate = attendanceStats.total > 0 
    ? ((attendanceStats.attended / attendanceStats.total) * 100).toFixed(1)
    : "0";

  // Get regular lessons schedule
  const regularLessons = studentLessons
    .filter((l) => l.status !== "cancelled")
    .reduce((acc, lesson) => {
      const dayOfWeek = moment(lesson.start).day();
      const timeKey = `${moment(lesson.start).format("HH:mm")}-${moment(lesson.end).format("HH:mm")}`;
      const key = `${dayOfWeek}-${timeKey}`;
      
      if (!acc[key]) {
        acc[key] = {
          dayOfWeek,
          time: timeKey,
          lesson,
          count: 0,
        };
      }
      acc[key].count++;
      return acc;
    }, {} as Record<string, any>);

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

  // Combine lessons and transactions for timeline
  const allOperations = [
    ...transactions.map((tx) => ({
      key: `transaction-${tx.id}`,
      date: tx.createdAt,
      type: "transaction" as const,
      transaction: tx,
      operation: tx.type === "payment" ? "Оплата" : tx.type === "refund" ? "Возврат" : "Долг",
      description: tx.description || tx.paymentMethod,
      amount: tx.type === "payment" ? tx.amount : -tx.amount,
      badge: tx.type === "payment" ? "default" : "destructive",
    })),
    ...journal
      .filter((j) => j.status === "attended")
      .map((j) => {
        const sub = subscriptions.find((s) => s.id === j.subscriptionId);
        const lessonCost = sub?.pricePerLesson || 0;
        return {
          key: `lesson-${j.lessonId || j.startTime}`,
          date: j.startTime,
          type: "lesson" as const,
          operation: "Списание",
          description: `${j.lessonTitle} (${moment(j.startTime).format("HH:mm")})`,
          amount: -lessonCost,
          badge: "secondary",
        };
      }),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 15);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/students")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{student.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={statusColors[displayStatus]}>
                  {statusNames[displayStatus]}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedStatus} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Изменить статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Активный</SelectItem>
              <SelectItem value="inactive">Неактивный</SelectItem>
              <SelectItem value="frozen">Заморожен</SelectItem>
              <SelectItem value="graduated">Закончил</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Править
          </Button>
          <Button variant="outline" size="sm">
            <Archive className="h-4 w-4 mr-2" />
            В архив
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Отчеты
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {notifications.filter((n) => !n.isRead).length > 0 && (
        <Card className="border-yellow-500 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <Bell className="h-5 w-5" />
              Уведомления ({notifications.filter((n) => !n.isRead).length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {notifications
              .filter((n) => !n.isRead)
              .map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-start justify-between gap-4 cursor-pointer hover:bg-yellow-100 p-2 rounded"
                  onClick={() => handleNotificationClick(notification.id)}
                >
                  <p className="text-sm text-yellow-800">{notification.message}</p>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {moment(notification.createdAt).fromNow()}
                  </Badge>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Groups with Schedule */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Группы и расписание
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
                <p className="text-center text-muted-foreground py-4">Студент не состоит в группах</p>
              ) : (
                <div className="space-y-4">
                  {studentGroups.map((group) => {
                    // Get schedule for this group
                    const groupLessons = studentLessons.filter(
                      (l) => l.groupId === group.id && l.status !== "cancelled"
                    );
                    
                    // Group lessons by weekday and time
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
                      // Convert Sunday (0) to 7 for proper sorting
                      const aAdj = a === 0 ? 7 : a;
                      const bAdj = b === 0 ? 7 : b;
                      return aAdj - bAdj;
                    });
                    const scheduleText = sortedDays.map(day => weekdayNames[day]).join(" ");
                    const scheduleTime = scheduleMap.get(sortedDays[0]) || "";

                    return (
                      <div key={group.id} className="p-4 border rounded-lg">
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

          {/* Attendance Calendar */}
          {id && subscriptions.length > 0 && (
            <StudentLessonCalendar
              studentId={id}
              subscriptions={subscriptions}
              lessons={studentLessons}
              attendances={studentAttendances}
              freezes={allFreezes}
            />
          )}

          {/* Lessons and Transactions Timeline */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  История занятий и платежей
                </CardTitle>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{attendanceStats.total}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>{attendanceStats.attended}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span>{attendanceStats.missed}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    <span>{transactions.filter(t => t.type === "payment").reduce((sum, t) => sum + t.amount, 0).toLocaleString()} ₸</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Уроки (факт) — {studentAttendances?.length || journal.length} шт
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {allOperations.map((op, idx) => (
                    <div key={op.key || `${op.type}-${idx}`} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {op.type === 'transaction' ? (
                          <DollarSign className="h-4 w-4 text-primary" />
                        ) : (
                          <User className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{op.description}</span>
                          <Badge variant={op.badge as any} className="text-xs">
                            {op.operation}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {moment(op.date).format("DD.MM.YYYY HH:mm")}
                          {op.type === 'lesson' && (
                            <span className="ml-2">| {Math.abs(op.amount).toLocaleString()} ₸</span>
                          )}
                        </div>
                      </div>
                      {op.type === "transaction" && (
                        <div className="flex items-center gap-2">
                          <div className={`text-sm font-semibold ${op.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                            {op.amount > 0 ? "+" : ""}
                            {op.amount.toLocaleString()} ₸
                          </div>
                          {op.transaction?.type === "payment" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => op.transaction && handleEditTransactionClick(op.transaction)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {allOperations.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      Нет операций
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Balance Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Финансовый баланс
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-2xl font-bold">
                  {subscriptions.reduce((sum, s) => sum + (s.lessonsRemaining || 0), 0)} уроков
                </div>
                <div className="text-lg font-semibold text-muted-foreground">
                  {balance ? balance.balance.toLocaleString() : 0} ₸
                </div>
                {subscriptions[0]?.endDate && (
                  <div className="text-xs text-muted-foreground mt-1">
                    ~{moment(subscriptions[0].endDate).format("DD.MM.YYYY")}
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Обновлено: {moment().format("DD.MM.YYYY HH:mm")}
              </div>
              <div className="text-xs text-muted-foreground">
                ID: #{student.id.slice(0, 4)}
              </div>
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span>Платежи</span>
                  <div className="flex items-center gap-2">
                    <span>{transactions.filter(t => t.type === "payment").length} шт</span>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setIsPaymentDialogOpen(true)}>
                      добавить
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Контакты</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {nextLesson?.teacherName && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Педагог</div>
                  <div className="text-sm font-medium">{nextLesson.teacherName}</div>
                </div>
              )}
              <div>
                <div className="text-xs text-muted-foreground mb-1">Заказчик</div>
                <div className="text-sm font-medium">{student.name}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Мобильный</div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{student.phone}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Phone className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {student.email && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Email</div>
                  <div className="text-sm">{student.email}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subscriptions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Абонементы
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setIsAssignSubModalOpen(true)}>
                  добавить
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {subscriptions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Нет абонементов</p>
              ) : (
                subscriptions.map((sub) => (
                  <div key={sub.id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {sub.subscriptionTypeName || "Индивидуальный"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {sub.totalPrice.toLocaleString()} ₸ / {sub.totalLessons} / {sub.pricePerLesson.toFixed(0)} ₸
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {moment(sub.startDate).format("DD.MM.YYYY")} - {sub.endDate ? moment(sub.endDate).format("DD.MM.YYYY") : "∞"}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={sub.status === "active" ? "default" : "secondary"} className="text-xs">
                        {sub.status === "active" ? "Активен" : "Неактивен"}
                      </Badge>
                      {sub.status === "active" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
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
                ))
              )}
            </CardContent>
          </Card>

          {/* Discounts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Скидки</CardTitle>
                <StudentDiscountCreateDialog studentId={id || ""} onApplied={() => { /* refetch is automatic via hooks invalidation */ }} />
              </div>
            </CardHeader>
            <CardContent>
              {studentDiscounts.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">(не задано)</p>
              ) : (
                <div className="space-y-2">
                  {studentDiscounts.map((sd) => {
                    const discount = discounts.find((d) => d.id === sd.discountId);
                    return discount ? (
                      <div key={sd.id} className="flex items-center justify-between p-2 border rounded text-sm">
                        <div>
                          <div className="font-medium">{discount.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {discount.type === "percentage" ? `${discount.value}%` : `${discount.value} ₸`}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <StickyNote className="h-4 w-4" />
                Заметки
              </CardTitle>
              <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                    добавить
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
            <CardContent className="space-y-2 max-h-[200px] overflow-y-auto">
              {notes.length === 0 ? (
                <p className="text-xs text-center text-muted-foreground py-2">Нет заметок</p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="border-l-2 border-primary pl-3 py-2">
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
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
          добавить
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

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  useLessons,
  useTeachers,
} from "@/hooks/useData";
import AssignSubscriptionModal from "@/components/AssignSubscriptionModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";
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
  
  const addNote = useAddStudentNote();
  const updateStatus = useUpdateStudentStatus();
  const markNotificationRead = useMarkNotificationRead();

  const [newNote, setNewNote] = useState("");
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [isAssignSubModalOpen, setIsAssignSubModalOpen] = useState(false);
  const [financeStartDate, setFinanceStartDate] = useState<string>("");
  const [financeEndDate, setFinanceEndDate] = useState<string>("");

  const student = students.find((s) => s.id === id);

  if (!student) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const studentGroups = groups.filter((g) => student.groupIds?.includes(g.id));
  
  // Get student's upcoming lessons
  const studentLessons = lessons.filter((l) => 
    l.studentIds?.includes(student.id) || 
    (l.groupId && student.groupIds?.includes(l.groupId))
  );
  const upcomingLessons = studentLessons
    .filter((l) => moment(l.start).isAfter(moment()))
    .sort((a, b) => moment(a.start).diff(moment(b.start)));
  const nextLesson = upcomingLessons[0];
  const nextLessonTeacher = nextLesson ? teachers.find((t) => t.id === nextLesson.teacherId) : null;
  const nextLessonGroup = nextLesson?.groupId ? groups.find((g) => g.id === nextLesson.groupId) : null;

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

  // Calculate attendance stats
  const attendanceStats = {
    total: journal.length,
    attended: journal.filter((j) => j.status === "attended").length,
    missed: journal.filter((j) => j.status === "missed").length,
    cancelled: journal.filter((j) => j.status === "cancelled").length,
  };
  const attendanceRate = attendanceStats.total > 0 
    ? ((attendanceStats.attended / attendanceStats.total) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/students")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{student.name}</h1>
            <p className="text-muted-foreground">{student.age} лет</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusColors[student.status || "active"]}>
            {statusNames[student.status || "active"]}
          </Badge>
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

      {/* Next Lesson Card */}
      {nextLesson && (
        <Card className="border-green-500 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <Clock className="h-5 w-5" />
              Ближайшее занятие
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Дата и время</p>
                <p className="font-semibold text-green-900">
                  {moment(nextLesson.start).format("DD MMMM, dddd")}
                </p>
                <p className="text-sm text-green-800">
                  {moment(nextLesson.start).format("HH:mm")} - {moment(nextLesson.end).format("HH:mm")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Предмет</p>
                <Badge variant="secondary" className="mt-1">{nextLesson.subject}</Badge>
              </div>
            </div>
            {nextLessonTeacher && (
              <div>
                <p className="text-sm text-muted-foreground">Преподаватель</p>
                <p className="font-medium text-green-900">{nextLessonTeacher.name}</p>
              </div>
            )}
            {nextLessonGroup ? (
              <div>
                <p className="text-sm text-muted-foreground">Группа</p>
                <p className="font-medium text-green-900">{nextLessonGroup.name}</p>
              </div>
            ) : (
              <div>
                <Badge variant="outline">Индивидуальное занятие</Badge>
              </div>
            )}
            {nextLesson.room && (
              <div>
                <p className="text-sm text-muted-foreground">Аудитория</p>
                <p className="font-medium text-green-900">{nextLesson.room}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Профиль
          </TabsTrigger>
          <TabsTrigger value="attendance">
            <Calendar className="h-4 w-4 mr-2" />
            Посещаемость
          </TabsTrigger>
          <TabsTrigger value="finance">
            <DollarSign className="h-4 w-4 mr-2" />
            Финансы
          </TabsTrigger>
          <TabsTrigger value="subscriptions">
            <BookOpen className="h-4 w-4 mr-2" />
            Абонементы
          </TabsTrigger>
          <TabsTrigger value="history">
            <FileText className="h-4 w-4 mr-2" />
            История
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Основная информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p>{student.email}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Телефон</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <p>{student.phone}</p>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Предметы</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {student.subjects.map((subject) => (
                    <Badge key={subject} variant="secondary">
                      {subject}
                    </Badge>
                  ))}
                </div>
              </div>

              {studentGroups.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Группы</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {studentGroups.map((group) => (
                      <Badge key={group.id} variant="outline">
                        <Users className="h-3 w-3 mr-1" />
                        {group.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <StickyNote className="h-5 w-5" />
                Заметки
              </CardTitle>
              <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">Добавить заметку</Button>
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
            <CardContent className="space-y-3">
              {notes.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Нет заметок</p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="border-l-2 border-primary pl-4 py-2">
                    <p className="text-sm">{note.note}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {moment(note.createdAt).format("DD.MM.YYYY HH:mm")}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <p className="text-2xl font-bold">{attendanceStats.total}</p>
                  <p className="text-sm text-muted-foreground">Всего уроков</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-bold">{attendanceStats.attended}</p>
                  <p className="text-sm text-muted-foreground">Посещено</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <XCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
                  <p className="text-2xl font-bold">{attendanceStats.missed}</p>
                  <p className="text-sm text-muted-foreground">Пропущено</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Activity className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                  <p className="text-2xl font-bold">{attendanceRate}%</p>
                  <p className="text-sm text-muted-foreground">Посещаемость</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Журнал посещений</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Урок</TableHead>
                    <TableHead>Предмет</TableHead>
                    <TableHead>Учитель</TableHead>
                    <TableHead>Группа</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journal.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Нет записей о посещении
                      </TableCell>
                    </TableRow>
                  ) : (
                    journal.map((entry) => (
                      <TableRow key={entry.attendanceId}>
                        <TableCell>
                          {moment(entry.startTime).format("DD.MM.YYYY HH:mm")}
                        </TableCell>
                        <TableCell>{entry.lessonTitle}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{entry.subject}</Badge>
                        </TableCell>
                        <TableCell>{entry.teacherName}</TableCell>
                        <TableCell>{entry.groupName || "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              entry.status === "attended"
                                ? "default"
                                : entry.status === "missed"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {entry.status === "attended"
                              ? "Присутствовал"
                              : entry.status === "missed"
                              ? "Отсутствовал"
                              : "Отменено"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Finance Tab */}
        <TabsContent value="finance" className="space-y-4">
          {/* Financial Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Текущий баланс</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {balance ? (
                    <span className={balance.balance >= 0 ? "text-green-600" : "text-red-600"}>
                      {balance.balance.toLocaleString()} ₸
                    </span>
                  ) : (
                    <span className="text-muted-foreground">0 ₸</span>
                  )}
                </div>
                {balance?.lastPaymentDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Посл. платеж: {moment(balance.lastPaymentDate).format("DD.MM.YYYY")}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Всего оплачено</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  +{transactions.filter(t => t.type === "payment").reduce((sum, t) => sum + t.amount, 0).toLocaleString()} ₸
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {transactions.filter(t => t.type === "payment").length} платежей
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Посещено уроков</CardTitle>
                <Calendar className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {journal.filter(j => j.status === "attended").length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Пропущено: {journal.filter(j => j.status === "missed").length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Combined Financial History */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div>
                  <CardTitle>Полная финансовая история</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Все платежи и списания за посещенные уроки
                  </p>
                </div>
                
                {/* Date Filters */}
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <Label htmlFor="start-date" className="text-sm">С даты</Label>
                    <input
                      id="start-date"
                      type="date"
                      value={financeStartDate}
                      onChange={(e) => setFinanceStartDate(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="end-date" className="text-sm">По дату</Label>
                    <input
                      id="end-date"
                      type="date"
                      value={financeEndDate}
                      onChange={(e) => setFinanceEndDate(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  {(financeStartDate || financeEndDate) && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setFinanceStartDate("");
                        setFinanceEndDate("");
                      }}
                    >
                      Сбросить
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Операция</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    // Combine transactions and attendance into single timeline
                    let allOperations = [
                      ...transactions.map(tx => ({
                        date: tx.createdAt,
                        type: 'transaction',
                        operation: tx.type === "payment" ? "Оплата" : tx.type === "refund" ? "Возврат" : tx.type === "deduction" ? "Списание" : "Долг",
                        description: tx.description || tx.paymentMethod,
                        amount: tx.type === "payment" ? tx.amount : -tx.amount,
                        badge: tx.type === "payment" ? "default" : (tx.type === "deduction" ? "secondary" : "destructive")
                      })),
                      ...journal.filter(j => j.status === "attended").map(j => {
                        // Calculate lesson cost from subscription
                        const sub = subscriptions.find(s => s.id === j.subscriptionId);
                        const lessonCost = sub?.pricePerLesson || 0;
                        return {
                          date: j.startTime,
                          type: 'lesson',
                          operation: "Списание",
                          description: `${j.lessonTitle} (${moment(j.startTime).format("HH:mm")})`,
                          amount: -lessonCost,
                          badge: "secondary"
                        };
                      })
                    ];

                    // Apply date filters
                    if (financeStartDate) {
                      const startDate = new Date(financeStartDate);
                      startDate.setHours(0, 0, 0, 0);
                      allOperations = allOperations.filter(op => new Date(op.date) >= startDate);
                    }
                    if (financeEndDate) {
                      const endDate = new Date(financeEndDate);
                      endDate.setHours(23, 59, 59, 999);
                      allOperations = allOperations.filter(op => new Date(op.date) <= endDate);
                    }

                    // Sort by date (newest first)
                    allOperations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                    if (allOperations.length === 0) {
                      return (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            {financeStartDate || financeEndDate 
                              ? "Нет операций за выбранный период"
                              : "Нет финансовой истории"
                            }
                          </TableCell>
                        </TableRow>
                      );
                    }

                    // Calculate totals for the filtered period
                    const totalIncome = allOperations.filter(op => op.amount > 0).reduce((sum, op) => sum + op.amount, 0);
                    const totalExpense = allOperations.filter(op => op.amount < 0).reduce((sum, op) => sum + Math.abs(op.amount), 0);
                    const netChange = totalIncome - totalExpense;

                    return (
                      <>
                        {allOperations.map((op, idx) => (
                          <TableRow key={`${op.type}-${idx}`}>
                            <TableCell className="font-medium">
                              {moment(op.date).format("DD.MM.YYYY HH:mm")}
                            </TableCell>
                            <TableCell>
                              <Badge variant={op.badge as any}>
                                {op.operation}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-md truncate">
                              {op.description}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              <span className={op.amount > 0 ? "text-green-600" : "text-red-600"}>
                                {op.amount > 0 ? "+" : ""}
                                {op.amount.toLocaleString()} ₸
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                        
                        {/* Summary row */}
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell colSpan={3} className="text-right">
                            {financeStartDate || financeEndDate ? "Итого за период:" : "Итого:"}
                            <span className="text-sm font-normal text-muted-foreground ml-2">
                              (приход: +{totalIncome.toLocaleString()} ₸, списано: -{totalExpense.toLocaleString()} ₸)
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={netChange >= 0 ? "text-green-600" : "text-red-600"}>
                              {netChange > 0 ? "+" : ""}
                              {netChange.toLocaleString()} ₸
                            </span>
                          </TableCell>
                        </TableRow>
                      </>
                    );
                  })()}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Абонементы студента</h3>
            <Button onClick={() => setIsAssignSubModalOpen(true)}>
              <BookOpen className="h-4 w-4 mr-2" />
              Назначить абонемент
            </Button>
          </div>
          
          {subscriptions.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">Нет активных абонементов</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {subscriptions.map((sub) => {
                const billingTypeLabels = {
                  per_lesson: "Поурочный",
                  monthly: "Помесячный",
                  unlimited: "Безлимитный",
                };
                const billingTypeColors = {
                  per_lesson: "bg-blue-100 text-blue-800",
                  monthly: "bg-green-100 text-green-800",
                  unlimited: "bg-purple-100 text-purple-800",
                };
                
                return (
                  <Card key={sub.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-lg">{sub.subscriptionTypeName || "Индивидуальный абонемент"}</CardTitle>
                            {sub.billingType && (
                              <span className={`px-2 py-1 rounded text-xs font-medium ${billingTypeColors[sub.billingType]}`}>
                                {billingTypeLabels[sub.billingType]}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-4 text-sm text-muted-foreground mt-2">
                            <div>
                              <span className="font-medium text-foreground">{sub.usedLessons}</span> / {sub.totalLessons} занятий
                            </div>
                            <div>
                              Осталось: <span className="font-semibold text-foreground">{sub.lessonsRemaining}</span>
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant={
                            sub.status === "active" ? "default" : sub.status === "frozen" ? "secondary" : "destructive"
                          }
                        >
                          {sub.status === "active" ? "Активный" : sub.status === "frozen" ? "Заморожен" : sub.status === "completed" ? "Завершён" : "Истёк"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 pb-3 border-b">
                        <div>
                          <p className="text-xs text-muted-foreground">Общая стоимость</p>
                          <p className="text-lg font-semibold">{sub.totalPrice.toLocaleString()} ₸</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">За занятие</p>
                          <p className="text-lg font-semibold">{sub.pricePerLesson.toFixed(0)} ₸</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>Начало: {moment(sub.startDate).format("DD.MM.YYYY")}</span>
                        </div>
                        {sub.endDate && (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>Окончание: {moment(sub.endDate).format("DD.MM.YYYY")}</span>
                          </div>
                        )}
                        {sub.paidTill && (
                          <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span>Оплачено до: {moment(sub.paidTill).format("DD.MM.YYYY")}</span>
                          </div>
                        )}
                        {sub.freezeDaysRemaining > 0 && (
                          <div className="text-sm text-blue-600 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Дней заморозки: {sub.freezeDaysRemaining}
                          </div>
                        )}
                      </div>
                      
                      {/* Progress bar */}
                      {sub.billingType === "per_lesson" && (
                        <div className="pt-2">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Прогресс</span>
                            <span>{Math.round((sub.usedLessons / sub.totalLessons) * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{ width: `${(sub.usedLessons / sub.totalLessons) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>История действий</CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Нет истории действий</p>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex gap-4 border-l-2 border-primary pl-4 py-2">
                      <div className="flex-1">
                        <p className="font-medium">{activity.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {activity.activityType === "payment"
                              ? "Платеж"
                              : activity.activityType === "attendance"
                              ? "Посещение"
                              : activity.activityType === "subscription_change"
                              ? "Абонемент"
                              : activity.activityType === "status_change"
                              ? "Статус"
                              : activity.activityType === "note"
                              ? "Заметка"
                              : activity.activityType === "debt_created"
                              ? "Долг"
                              : "Заморозка"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {moment(activity.createdAt).format("DD.MM.YYYY HH:mm")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Assign Subscription Modal */}
      <AssignSubscriptionModal
        open={isAssignSubModalOpen}
        onClose={() => setIsAssignSubModalOpen(false)}
        student={student}
        onSuccess={() => {
          // Refresh subscriptions
          window.location.reload();
        }}
      />
    </div>
  );
}


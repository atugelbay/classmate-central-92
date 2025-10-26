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
} from "@/hooks/useData";
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

  const student = students.find((s) => s.id === id);

  if (!student) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const studentGroups = groups.filter((g) => student.groupIds?.includes(g.id));

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
          <Card>
            <CardHeader>
              <CardTitle>Текущий баланс</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {balance ? (
                  <span className={balance.balance >= 0 ? "text-green-600" : "text-red-600"}>
                    {balance.balance.toLocaleString()} ₸
                  </span>
                ) : (
                  <span className="text-muted-foreground">0 ₸</span>
                )}
              </div>
              {balance?.lastPaymentDate && (
                <p className="text-sm text-muted-foreground mt-2">
                  Последний платеж: {moment(balance.lastPaymentDate).format("DD.MM.YYYY HH:mm")}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>История платежей</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Способ</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Нет истории платежей
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>{moment(tx.createdAt).format("DD.MM.YYYY HH:mm")}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              tx.type === "payment"
                                ? "default"
                                : tx.type === "refund"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {tx.type === "payment" ? "Платеж" : tx.type === "refund" ? "Возврат" : "Долг"}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">{tx.paymentMethod}</TableCell>
                        <TableCell className="text-right font-medium">
                          {tx.type === "payment" ? "+" : "-"}
                          {tx.amount.toLocaleString()} ₸
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-4">
          {subscriptions.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">Нет активных абонементов</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {subscriptions.map((sub) => (
                <Card key={sub.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">Абонемент #{sub.id.substring(0, 8)}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Осталось уроков: <span className="font-semibold">{sub.lessonsRemaining}</span>
                        </p>
                      </div>
                      <Badge
                        variant={
                          sub.status === "active" ? "default" : sub.status === "frozen" ? "secondary" : "destructive"
                        }
                      >
                        {sub.status === "active" ? "Активный" : sub.status === "frozen" ? "Заморожен" : "Истёк"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Начало: {moment(sub.startDate).format("DD.MM.YYYY")}</span>
                    </div>
                    {sub.endDate && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>Окончание: {moment(sub.endDate).format("DD.MM.YYYY")}</span>
                      </div>
                    )}
                    {sub.freezeDaysRemaining > 0 && (
                      <div className="text-sm text-blue-600">
                        Дней заморозки: {sub.freezeDaysRemaining}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
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
    </div>
  );
}


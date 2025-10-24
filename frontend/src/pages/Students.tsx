import { useState } from "react";
import { 
  useStudents, 
  useCreateStudent, 
  useUpdateStudent, 
  useDeleteStudent, 
  useGroups,
  useStudentBalance,
  useStudentSubscriptions,
  useStudentTransactions,
} from "@/hooks/useData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Mail, Phone, Trash2, Edit, Loader2, DollarSign, Ticket, Receipt } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Student } from "@/types";
import moment from "moment";
import "moment/locale/ru";

moment.locale("ru");

export default function Students() {
  const { data: students = [], isLoading } = useStudents();
  const { data: groups = [] } = useGroups();
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);

  // Данные для просматриваемого студента
  const { data: studentBalance } = useStudentBalance(viewingStudent?.id || "");
  const { data: studentSubscriptions = [] } = useStudentSubscriptions(viewingStudent?.id || "");
  const { data: studentTransactions = [] } = useStudentTransactions(viewingStudent?.id || "");

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const studentData = {
      name: formData.get("name") as string,
      age: parseInt(formData.get("age") as string),
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      subjects: (formData.get("subjects") as string).split(",").map((s) => s.trim()),
      groupIds: editingStudent?.groupIds || [],
    };

    try {
      if (editingStudent) {
        await updateStudent.mutateAsync({ id: editingStudent.id, data: studentData });
      } else {
        await createStudent.mutateAsync(studentData as any);
      }
      setIsDialogOpen(false);
      setEditingStudent(null);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Вы уверены, что хотите удалить этого ученика?")) {
      try {
        await deleteStudent.mutateAsync(id);
      } catch (error) {
        // Error is handled by the mutation
      }
    }
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
          <h1 className="text-3xl font-bold">Ученики</h1>
          <p className="text-muted-foreground">
            Управление базой учащихся
          </p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingStudent(null);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Добавить ученика
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingStudent ? "Редактировать ученика" : "Новый ученик"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">ФИО</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingStudent?.name}
                  required
                />
              </div>
              <div>
                <Label htmlFor="age">Возраст</Label>
                <Input
                  id="age"
                  name="age"
                  type="number"
                  defaultValue={editingStudent?.age}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={editingStudent?.email}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={editingStudent?.phone}
                  required
                />
              </div>
              <div>
                <Label htmlFor="subjects">Предметы (через запятую)</Label>
                <Input
                  id="subjects"
                  name="subjects"
                  defaultValue={editingStudent?.subjects.join(", ")}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {editingStudent ? "Сохранить" : "Добавить"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Поиск по имени или email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredStudents.map((student) => {
          const studentGroups = groups.filter((g) =>
            student.groupIds && student.groupIds.includes(g.id)
          );

          return (
            <Card key={student.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-lg font-semibold text-accent">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold">{student.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {student.age} лет
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {student.email}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {student.phone}
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium">Предметы:</p>
                    <div className="flex flex-wrap gap-2">
                      {student.subjects.map((subject) => (
                        <Badge key={subject} variant="secondary">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {studentGroups.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-medium">Группы:</p>
                      <div className="flex flex-wrap gap-2">
                        {studentGroups.map((group) => (
                          <Badge key={group.id} variant="outline">
                            {group.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setViewingStudent(student);
                        setIsDetailsDialogOpen(true);
                      }}
                    >
                      <Receipt className="h-4 w-4 mr-1" />
                      Просмотр
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(student)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(student.id)}
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

      {/* Student Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewingStudent?.name} - Детальная информация
            </DialogTitle>
          </DialogHeader>
          
          {viewingStudent && (
            <Tabs defaultValue="balance">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="balance">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Баланс
                </TabsTrigger>
                <TabsTrigger value="subscriptions">
                  <Ticket className="h-4 w-4 mr-2" />
                  Абонементы
                </TabsTrigger>
                <TabsTrigger value="transactions">
                  <Receipt className="h-4 w-4 mr-2" />
                  Платежи
                </TabsTrigger>
              </TabsList>

              {/* Balance Tab */}
              <TabsContent value="balance" className="space-y-4">
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">Текущий баланс</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {studentBalance ? (
                        <span className={studentBalance.balance >= 0 ? "text-green-600" : "text-red-600"}>
                          {studentBalance.balance.toLocaleString()} ₸
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0 ₸</span>
                      )}
                    </div>
                    {studentBalance?.lastPaymentDate && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Последний платеж: {moment(studentBalance.lastPaymentDate).format("DD.MM.YYYY HH:mm")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Subscriptions Tab */}
              <TabsContent value="subscriptions" className="space-y-4">
                {studentSubscriptions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Нет активных абонементов
                  </p>
                ) : (
                  <div className="space-y-3">
                    {studentSubscriptions.map((sub) => (
                      <Card key={sub.id}>
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium">Абонемент #{sub.id.substring(0, 8)}</h4>
                              <p className="text-sm text-muted-foreground">
                                Осталось уроков: {sub.lessonsRemaining}
                              </p>
                            </div>
                            <Badge 
                              variant={
                                sub.status === "active" ? "default" : 
                                sub.status === "frozen" ? "secondary" : 
                                "destructive"
                              }
                            >
                              {sub.status === "active" ? "Активный" : sub.status === "frozen" ? "Заморожен" : "Истёк"}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <div>Начало: {moment(sub.startDate).format("DD.MM.YYYY")}</div>
                            {sub.endDate && (
                              <div>Окончание: {moment(sub.endDate).format("DD.MM.YYYY")}</div>
                            )}
                            {sub.freezeDaysRemaining > 0 && (
                              <div className="text-blue-600">Заморозка: {sub.freezeDaysRemaining} дней</div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Transactions Tab */}
              <TabsContent value="transactions" className="space-y-4">
                {studentTransactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Нет истории платежей
                  </p>
                ) : (
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
                      {studentTransactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>{moment(tx.createdAt).format("DD.MM.YYYY HH:mm")}</TableCell>
                          <TableCell>
                            <Badge variant={tx.type === "payment" ? "default" : tx.type === "refund" ? "destructive" : "secondary"}>
                              {tx.type === "payment" ? "Платеж" : tx.type === "refund" ? "Возврат" : "Долг"}
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize">{tx.paymentMethod}</TableCell>
                          <TableCell className="text-right font-medium">
                            {tx.type === "payment" ? "+" : "-"}{tx.amount.toLocaleString()} ₸
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

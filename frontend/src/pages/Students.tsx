import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  useStudents, 
  useCreateStudent, 
  useUpdateStudent, 
  useDeleteStudent, 
  useGroups,
  useStudentBalance,
  useStudentSubscriptions,
} from "@/hooks/useData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Mail, Phone, Trash2, Edit, Loader2, Eye, AlertCircle, Clock } from "lucide-react";
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
  const navigate = useNavigate();
  const { data: students = [], isLoading } = useStudents();
  const { data: groups = [] } = useGroups();
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

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
      status: "active" as const,
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
                  <Badge className={statusColors[student.status || "active"]}>
                    {statusNames[student.status || "active"]}
                  </Badge>
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
                      onClick={() => navigate(`/students/${student.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
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
    </div>
  );
}

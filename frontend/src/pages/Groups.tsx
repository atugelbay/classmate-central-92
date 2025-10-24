import { useState } from "react";
import { useGroups, useCreateGroup, useUpdateGroup, useDeleteGroup, useTeachers, useStudents } from "@/hooks/useData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, Clock, Trash2, Edit, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Group } from "@/types";

export default function Groups() {
  const { data: groups = [], isLoading } = useGroups();
  const { data: teachers = [] } = useTeachers();
  const { data: students = [] } = useStudents();
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  const filteredGroups = groups.filter(
    (group) =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const groupData = {
      name: formData.get("name") as string,
      subject: formData.get("subject") as string,
      teacherId: formData.get("teacherId") as string,
      schedule: formData.get("schedule") as string,
      studentIds: editingGroup?.studentIds || [],
    };

    try {
      if (editingGroup) {
        await updateGroup.mutateAsync({ id: editingGroup.id, data: groupData });
      } else {
        await createGroup.mutateAsync(groupData as any);
      }
      setIsDialogOpen(false);
      setEditingGroup(null);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleEdit = (group: Group) => {
    setEditingGroup(group);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Вы уверены, что хотите удалить эту группу?")) {
      try {
        await deleteGroup.mutateAsync(id);
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
          <h1 className="text-3xl font-bold">Группы</h1>
          <p className="text-muted-foreground">Управление учебными группами</p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingGroup(null);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Создать группу
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingGroup ? "Редактировать группу" : "Новая группа"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Название группы</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingGroup?.name}
                  required
                />
              </div>
              <div>
                <Label htmlFor="subject">Предмет</Label>
                <Input
                  id="subject"
                  name="subject"
                  defaultValue={editingGroup?.subject}
                  required
                />
              </div>
              <div>
                <Label htmlFor="teacherId">Преподаватель</Label>
                <Select
                  name="teacherId"
                  defaultValue={editingGroup?.teacherId}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите преподавателя" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name} - {teacher.subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="schedule">Расписание</Label>
                <Input
                  id="schedule"
                  name="schedule"
                  placeholder="Пн, Ср, Пт 10:00-11:30"
                  defaultValue={editingGroup?.schedule}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {editingGroup ? "Сохранить" : "Создать"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Поиск по названию или предмету..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredGroups.map((group) => {
          const teacher = teachers.find((t) => t.id === group.teacherId);
          const groupStudents = students.filter((s) =>
            group.studentIds && group.studentIds.includes(s.id)
          );

          return (
            <Card key={group.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{group.name}</h3>
                    <Badge variant="secondary" className="mt-2">
                      {group.subject}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Преподаватель
                    </p>
                    <p className="font-medium">{teacher?.name || "Не назначен"}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {group.schedule}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{groupStudents.length}</span>
                    <span className="text-muted-foreground">учеников</span>
                  </div>
                  {groupStudents.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-medium">Ученики:</p>
                      <div className="flex flex-wrap gap-2">
                        {groupStudents.slice(0, 3).map((student) => (
                          <Badge key={student.id} variant="outline">
                            {student.name}
                          </Badge>
                        ))}
                        {groupStudents.length > 3 && (
                          <Badge variant="outline">
                            +{groupStudents.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(group)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Изменить
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(group.id)}
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

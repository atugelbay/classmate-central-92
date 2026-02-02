import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import moment from "moment";
import "moment/locale/ru";
import "moment/locale/kk";
import { useTeachers, useCreateTeacher, useUpdateTeacher, useDeleteTeacher, useGroups, useRooms, useStudents, useLessons } from "@/hooks/useData";
import { useConfirmDelete } from "@/hooks/useConfirmDelete";
import { LessonFormModal } from "@/components/LessonFormModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Mail, Phone, Loader2 } from "lucide-react";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader } from "@/components/PageHeader";
import { Teacher } from "@/types";
import { formatKzPhone, normalizeKzPhone } from "@/lib/phone";
import { toast } from "sonner";

export default function Teachers() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(["teachers", "common"]);
  moment.locale(i18n.language);
  
  const { data: teachers = [], isLoading } = useTeachers();
  const { data: groups = [] } = useGroups();
  const { data: rooms = [] } = useRooms();
  const { data: students = [] } = useStudents();
  const { data: lessons = [] } = useLessons();
  const createTeacher = useCreateTeacher();
  const updateTeacher = useUpdateTeacher();
  const deleteTeacher = useDeleteTeacher();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  // Lesson Form Modal state
  const [isLessonFormOpen, setIsLessonFormOpen] = useState(false);
  const [lessonFormData, setLessonFormData] = useState<any>(null);

  const filteredTeachers = teachers.filter((teacher) => {
    const matchesSearch =
      teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || teacher.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const teacherData: any = {
      name: formData.get("name") as string,
      subject: formData.get("subject") as string,
      email: formData.get("email") as string || "",
      phone: formData.get("phone") as string ? normalizeKzPhone(formData.get("phone") as string) : "",
      status: formData.get("status") as "active" | "inactive",
      workload: parseInt(formData.get("workload") as string) || 0,
    };

    try {
      if (editingTeacher) {
        await updateTeacher.mutateAsync({ id: editingTeacher.id, data: teacherData });
      } else {
        await createTeacher.mutateAsync(teacherData as any);
      }
      setIsDialogOpen(false);
      setEditingTeacher(null);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setIsDialogOpen(true);
  };

  const deleteConfirm = useConfirmDelete(async (id: string) => {
    try {
      await deleteTeacher.mutateAsync(id);
    } catch (error) {
      // Error is handled by the mutation
    }
  });

  const handleCreateLesson = (teacher: Teacher) => {
    setLessonFormData({
      teacherId: teacher.id,
      subject: teacher.subject,
      date: moment().format("YYYY-MM-DD"),
      startTime: "10:00",
      endTime: "11:30",
    });
    setIsLessonFormOpen(true);
  };

  const handleViewTeacherSchedule = (teacherId: string) => {
    navigate(`/teachers/${teacherId}`);
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
      <PageHeader
        title={t("title")}
        description={t("searchPlaceholder")}
        actions={
            <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingTeacher(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="sm:size-default">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t("addTeacher")}</span>
                <span className="sm:hidden">{t("add")}</span>
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTeacher ? t("editTeacher") : t("newTeacher")}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">{t("fields.name")}</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingTeacher?.name}
                  required
                />
              </div>
              <div>
                <Label htmlFor="subject">{t("fields.subject")}</Label>
                <Input
                  id="subject"
                  name="subject"
                  defaultValue={editingTeacher?.subject}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">{t("fields.email")}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={editingTeacher?.email}
                />
              </div>
              <div>
                <Label htmlFor="phone">{t("fields.phone")}</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={editingTeacher?.phone}
                  onChange={(e) => {
                    e.currentTarget.value = formatKzPhone(e.currentTarget.value);
                  }}
                />
              </div>
              <div>
                <Label htmlFor="workload">{t("fields.workload")}</Label>
                <Input
                  id="workload"
                  name="workload"
                  type="number"
                  min="0"
                  defaultValue={editingTeacher?.workload || 0}
                />
              </div>
              <div>
                <Label htmlFor="status">{t("fields.status")}</Label>
                <Select
                  name="status"
                  defaultValue={editingTeacher?.status || "active"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t("statuses.active")}</SelectItem>
                    <SelectItem value="inactive">{t("statuses.inactive")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button type="submit" className="w-full">
                {editingTeacher ? t("common:save") : t("add")}
              </Button>
            </form>
          </DialogContent>
          </Dialog>
        }
      />

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("searchByNameOrSubject")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allStatuses")}</SelectItem>
            <SelectItem value="active">{t("statuses.active")}</SelectItem>
            <SelectItem value="inactive">{t("statuses.inactive")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTeachers.map((teacher) => {
          // Get teacher's lessons for the current week
          const startOfWeek = moment().startOf('isoWeek');
          const endOfWeek = moment().endOf('isoWeek');
          const teacherLessons = lessons.filter((l) => 
            l.teacherId === teacher.id && 
            moment(l.start).isBetween(startOfWeek, endOfWeek, null, '[]')
          );
          
          // Calculate workload in hours for current week
          const totalMinutes = teacherLessons.reduce((sum, lesson) => {
            const duration = moment(lesson.end).diff(moment(lesson.start), 'minutes');
            return sum + duration;
          }, 0);
          const workloadHours = (totalMinutes / 60).toFixed(1);
          
          // Get upcoming lessons for this teacher
          const upcomingLessons = lessons
            .filter((l) => l.teacherId === teacher.id && moment(l.start).isAfter(moment()))
            .sort((a, b) => moment(a.start).diff(moment(b.start)));
          const nextLesson = upcomingLessons[0];
          const nextLessonGroup = nextLesson?.groupId ? groups.find((g) => g.id === nextLesson.groupId) : null;
          
          return (
            <Card 
              key={teacher.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleViewTeacherSchedule(teacher.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-lg font-bold text-white shadow-soft">
                      {teacher.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold">{teacher.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {teacher.subject}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={teacher.status === "active" ? "default" : "secondary"}
                  >
                    {teacher.status === "active" ? t("badge.active") : t("badge.inactive")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {teacher.email}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {teacher.phone}
                  </div>
                  
                  <div className="mt-4 rounded-2xl bg-gradient-to-br from-sky-50 to-blue-100 dark:from-sky-950 dark:to-blue-900 p-4">
                    <p className="text-sm font-medium text-sky-700 dark:text-sky-300">{t("workload.title")}</p>
                    <p className="text-2xl font-bold text-sky-900 dark:text-sky-100">
                      {workloadHours}
                      <span className="text-sm font-normal text-sky-600 dark:text-sky-400">
                        {" "}
                        {t("workload.hour")}
                      </span>
                    </p>
                    <p className="text-xs text-sky-600 dark:text-sky-400 mt-1">
                      {teacherLessons.length} {teacherLessons.length === 1 ? t("workload.lesson_one") : teacherLessons.length < 5 ? t("workload.lesson_few") : t("workload.lesson_many")}
                    </p>
                  </div>
                  
                  {/* Next Lesson */}
                  {nextLesson && (
                    <div className="mt-2 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950 dark:to-green-900 p-3">
                      <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1">{t("nextLesson")}</p>
                      <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                        {moment(nextLesson.start).format("DD MMM, HH:mm")}
                      </p>
                      {nextLessonGroup && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                          {nextLessonGroup.name}
                        </p>
                      )}
                      {!nextLessonGroup && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                          {t("individual")}
                        </p>
                      )}
                    </div>
                  )}
                  
                  <div className="pt-4">
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full rounded-xl"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateLesson(teacher);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {t("createLesson")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
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
        mode="create"
        onSuccess={() => {
          setLessonFormData(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm.isOpen}
        onOpenChange={(open) => !open && deleteConfirm.close()}
        title={t("deleteConfirm")}
        description={t("deleteDescription")}
        confirmText={t("common:delete")}
        cancelText={t("common:cancel")}
        variant="destructive"
        onConfirm={deleteConfirm.confirm}
      />
    </div>
  );
}

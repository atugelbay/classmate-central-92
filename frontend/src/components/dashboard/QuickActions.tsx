import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Calendar, 
  UserPlus, 
  DollarSign, 
  Users, 
  BookOpen,
  Zap
} from "lucide-react";
import { LessonFormModal } from "@/components/LessonFormModal";
import { useNavigate } from "react-router-dom";
import { useTeachers, useGroups, useRooms, useStudents } from "@/hooks/useData";
import { toast } from "sonner";

export function QuickActions() {
  const navigate = useNavigate();
  const [isLessonFormOpen, setIsLessonFormOpen] = useState(false);
  
  const { data: teachers = [] } = useTeachers();
  const { data: groups = [] } = useGroups();
  const { data: rooms = [] } = useRooms();
  const { data: students = [] } = useStudents();

  const actions = [
    {
      label: "Создать урок",
      icon: Calendar,
      onClick: () => setIsLessonFormOpen(true),
    },
    {
      label: "Добавить ученика",
      icon: UserPlus,
      onClick: () => {
        toast.info("Перенаправление на страницу учеников");
        navigate("/students");
      },
    },
    {
      label: "Принять платёж",
      icon: DollarSign,
      onClick: () => {
        toast.info("Перенаправление на страницу финансов");
        navigate("/finance");
      },
    },
    {
      label: "Создать группу",
      icon: Users,
      onClick: () => {
        toast.info("Перенаправление на страницу групп");
        navigate("/groups");
      },
    },
    {
      label: "Новый абонемент",
      icon: BookOpen,
      onClick: () => {
        toast.info("Перенаправление на страницу абонементов");
        navigate("/subscriptions");
      },
    },
  ];

  return (
    <>
      <Card className="h-full flex flex-col overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5" style={{ color: 'hsl(var(--dashboard-icon-muted))' }} />
            <CardTitle>Быстрые действия</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden min-h-0 flex flex-col">
          <div className="grid grid-cols-1 gap-2 flex-1 overflow-hidden min-h-0">
            {actions.map((action) => (
              <Button
                key={action.label}
                variant="ghost"
                className="h-auto py-3 px-3 justify-start gap-3 hover:bg-muted transition-all"
                onClick={action.onClick}
              >
                <div className="flex items-center justify-center w-9 h-9 rounded-lg border" style={{ backgroundColor: 'hsl(var(--dashboard-stat-neutral-bg))' }}>
                  <action.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-medium text-sm">{action.label}</span>
                </div>
                <Plus className="h-3.5 w-3.5 ml-auto" style={{ color: 'hsl(var(--dashboard-icon-muted))' }} />
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <LessonFormModal
        open={isLessonFormOpen}
        onOpenChange={setIsLessonFormOpen}
        teachers={teachers}
        groups={groups}
        rooms={rooms}
        students={students}
        mode="create"
      />
    </>
  );
}

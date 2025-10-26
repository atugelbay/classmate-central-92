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
      color: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20",
      onClick: () => setIsLessonFormOpen(true),
    },
    {
      label: "Добавить ученика",
      icon: UserPlus,
      color: "bg-green-500/10 text-green-600 hover:bg-green-500/20",
      onClick: () => {
        toast.info("Перенаправление на страницу учеников");
        navigate("/students");
      },
    },
    {
      label: "Принять платёж",
      icon: DollarSign,
      color: "bg-purple-500/10 text-purple-600 hover:bg-purple-500/20",
      onClick: () => {
        toast.info("Перенаправление на страницу финансов");
        navigate("/finance");
      },
    },
    {
      label: "Создать группу",
      icon: Users,
      color: "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20",
      onClick: () => {
        toast.info("Перенаправление на страницу групп");
        navigate("/groups");
      },
    },
    {
      label: "Новый абонемент",
      icon: BookOpen,
      color: "bg-pink-500/10 text-pink-600 hover:bg-pink-500/20",
      onClick: () => {
        toast.info("Перенаправление на страницу абонементов");
        navigate("/subscriptions");
      },
    },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-600" />
            <CardTitle>Быстрые действия</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2">
            {actions.map((action) => (
              <Button
                key={action.label}
                variant="ghost"
                className={`h-auto py-4 px-4 justify-start gap-3 ${action.color} transition-all`}
                onClick={action.onClick}
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-background/50">
                  <action.icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-medium">{action.label}</span>
                </div>
                <Plus className="h-4 w-4 ml-auto" />
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

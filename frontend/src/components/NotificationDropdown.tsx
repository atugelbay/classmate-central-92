import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Student } from "@/types";
import { useStudents, useDebts, useAllSubscriptions } from "@/hooks/useData";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: "one_lesson_left" | "debt";
  studentId: string;
  studentName: string;
  message: string;
  amount?: number;
}

export function NotificationDropdown() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [expandedOneLesson, setExpandedOneLesson] = useState(false);
  const [expandedDebts, setExpandedDebts] = useState(false);
  const { data: students = [] } = useStudents();
  const { data: debts = [] } = useDebts();
  const { data: subscriptions = [] } = useAllSubscriptions();

  // Calculate notifications grouped by type
  const oneLessonLeftStudents: NotificationItem[] = [];
  const debtStudents: NotificationItem[] = [];

  // Students with 1 lesson remaining
  subscriptions.forEach((sub) => {
    if (sub.status === "active" && sub.lessonsRemaining === 1) {
      const student = students.find((s) => s.id === sub.studentId);
      if (student) {
        oneLessonLeftStudents.push({
          id: `lesson-${sub.id}`,
          type: "one_lesson_left",
          studentId: student.id,
          studentName: student.name,
          message: "1 урок остался",
        });
      }
    }
  });

  // Students with debts
  debts
    .filter((debt) => debt.status === "pending")
    .forEach((debt) => {
      const student = students.find((s) => s.id === debt.studentId);
      if (student) {
        debtStudents.push({
          id: `debt-${debt.id}`,
          type: "debt",
          studentId: student.id,
          studentName: student.name,
          message: `Долг: ${debt.amount.toLocaleString()} ₸`,
          amount: debt.amount,
        });
      }
    });

  const handleNotificationClick = (notification: NotificationItem) => {
    navigate(`/students/${notification.studentId}`);
    setOpen(false);
  };

  const notificationCount = oneLessonLeftStudents.length + debtStudents.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              variant="destructive"
            >
              {notificationCount > 9 ? "9+" : notificationCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Уведомления</h3>
          {notificationCount > 0 && (
            <Badge variant="secondary">{notificationCount}</Badge>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notificationCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Нет уведомлений
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {/* One Lesson Left Section */}
              {oneLessonLeftStudents.length > 0 && (
                <>
                  <div 
                    className="p-3 bg-blue-50 border-b cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => setExpandedOneLesson(!expandedOneLesson)}
                  >
                    <div className="flex items-center gap-2">
                      {expandedOneLesson ? (
                        <ChevronDown className="h-4 w-4 text-blue-600" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-blue-600" />
                      )}
                      <Bell className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-900">
                        Осталось 1 урок
                      </span>
                      <Badge variant="secondary" className="ml-auto">
                        {oneLessonLeftStudents.length}
                      </Badge>
                    </div>
                  </div>
                  {expandedOneLesson && oneLessonLeftStudents.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-4 hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNotificationClick(notification);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                          <Bell className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {notification.studentName}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {notification.message}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
              
              {/* Debts Section */}
              {debtStudents.length > 0 && (
                <>
                  <div 
                    className="p-3 bg-red-50 border-b cursor-pointer hover:bg-red-100 transition-colors"
                    onClick={() => setExpandedDebts(!expandedDebts)}
                  >
                    <div className="flex items-center gap-2">
                      {expandedDebts ? (
                        <ChevronDown className="h-4 w-4 text-red-600" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-red-600" />
                      )}
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-semibold text-red-900">
                        Должники
                      </span>
                      <Badge variant="secondary" className="ml-auto">
                        {debtStudents.length}
                      </Badge>
                    </div>
                  </div>
                  {expandedDebts && debtStudents.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-4 hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNotificationClick(notification);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600">
                          <AlertCircle className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {notification.studentName}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {notification.message}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

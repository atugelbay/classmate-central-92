import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  const { t, i18n } = useTranslation(["dashboard", "common"]);
  const [open, setOpen] = useState(false);
  const [expandedOneLesson, setExpandedOneLesson] = useState(false);
  const [expandedDebts, setExpandedDebts] = useState(false);
  const { data: students = [] } = useStudents();
  const { data: debts = [] } = useDebts();
  const { data: subscriptions = [] } = useAllSubscriptions();

  // Message translations
  const getOneLessonMessage = () => {
    const texts = { ru: "1 урок остался", kk: "1 сабақ қалды", en: "1 lesson left" };
    return texts[i18n.language as 'ru' | 'kk' | 'en'] || texts.ru;
  };

  const getDebtMessage = (amount: number) => {
    const labels = { ru: "Долг", kk: "Борыш", en: "Debt" };
    const label = labels[i18n.language as 'ru' | 'kk' | 'en'] || labels.ru;
    return `${label}: ${amount.toLocaleString()} ₸`;
  };

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
          message: getOneLessonMessage(),
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
          message: getDebtMessage(debt.amount),
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
      <PopoverContent className="w-80 p-0 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg" align="end">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">{t("notifications.title")}</h3>
          {notificationCount > 0 && (
            <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {notificationCount}
            </span>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notificationCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
                <Bell className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">
                {i18n.language === 'kk' ? 'Хабарландырулар жоқ' : i18n.language === 'en' ? 'No notifications' : 'Нет уведомлений'}
              </p>
            </div>
          ) : (
            <div>
              {/* One Lesson Left Section */}
              {oneLessonLeftStudents.length > 0 && (
                <div>
                  {/* Group Header */}
                  <div 
                    className="px-4 py-3 bg-violet-50/50 dark:bg-violet-950/30 cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-950/50 transition-colors border-b border-slate-100 dark:border-slate-800"
                    onClick={() => setExpandedOneLesson(!expandedOneLesson)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/50">
                        <Bell className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div className="flex-1">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {t("notifications.oneLesson")}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/50 px-2 py-0.5 rounded-full">
                        {oneLessonLeftStudents.length}
                      </span>
                      {expandedOneLesson ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </div>
                  {/* Items */}
                  {expandedOneLesson && (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {oneLessonLeftStudents.map((notification) => (
                        <div
                          key={notification.id}
                          className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNotificationClick(notification);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                              <Bell className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                                {notification.studentName}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                {notification.message}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-300" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Debts Section */}
              {debtStudents.length > 0 && (
                <div>
                  {/* Group Header */}
                  <div 
                    className="px-4 py-3 bg-red-50/50 dark:bg-red-950/30 cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors border-b border-slate-100 dark:border-slate-800"
                    onClick={() => setExpandedDebts(!expandedDebts)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/50">
                        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex-1">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {i18n.language === 'kk' ? 'Борышкерлер' : i18n.language === 'en' ? 'Debtors' : 'Должники'}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50 px-2 py-0.5 rounded-full">
                        {debtStudents.length}
                      </span>
                      {expandedDebts ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </div>
                  {/* Items */}
                  {expandedDebts && (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {debtStudents.map((notification) => (
                        <div
                          key={notification.id}
                          className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNotificationClick(notification);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                              <AlertCircle className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                                {notification.studentName}
                              </div>
                              <div className="text-xs text-red-600 dark:text-red-400 font-medium mt-0.5">
                                {notification.message}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-300" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

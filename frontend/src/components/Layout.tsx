import { ReactNode, useEffect, useMemo, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { HeaderSearch } from "@/components/HeaderSearch";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { BranchSwitcher } from "@/components/BranchSwitcher";
import { OnboardingGate, OnboardingStep } from "@/components/Onboarding/OnboardingGate";
import { ArcadeEmbed } from "@/components/Onboarding/ArcadeEmbed";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, updateOnboardingStatus } = useAuth();
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const steps: OnboardingStep[] = useMemo(
    () => [
      {
        id: "add-student",
        title: "Добавить нового ученика",
        category: "Ученики",
        content: (
          <ArcadeEmbed
            src="https://demo.arcade.software/W8h3eIqDGuW4g41DC10P?embed&embed_mobile=tab&embed_desktop=inline&show_copy_link=true"
            title="Добавить нового ученика"
          />
        ),
      },
      {
        id: "student-subscription",
        title: "Добавление абонемента для ученика",
        category: "Ученики",
        content: (
          <ArcadeEmbed
            src="https://demo.arcade.software/hAahya10BksLSYF4rhxF?embed&embed_mobile=tab&embed_desktop=inline&show_copy_link=true"
            title="Добавление абонемента для ученика"
          />
        ),
      },
      {
        id: "student-discount-subscription",
        title: "Добавление скидки и абонемента для ученика",
        category: "Ученики",
        content: (
          <ArcadeEmbed
            src="https://demo.arcade.software/4PZpjTKSUVLYAtMyQBpq?embed&embed_mobile=tab&embed_desktop=inline&show_copy_link=true"
            title="Добавление скидки и абонемента для ученика"
          />
        ),
      },
      {
        id: "student-cash-payment",
        title: "Добавить оплату для студента",
        category: "Ученики",
        content: (
          <ArcadeEmbed
            src="https://demo.arcade.software/a7OF0N8MSeTQjJ83oyHl?embed&embed_mobile=tab&embed_desktop=inline&show_copy_link=true"
            title="Добавить оплату для студента"
          />
        ),
      },
      {
        id: "add-teacher",
        title: "Добавление нового учителя в систему",
        category: "Учителя",
        content: (
          <ArcadeEmbed
            src="https://demo.arcade.software/hpi1M9aGxw01j6LFiqDy?embed&embed_mobile=tab&embed_desktop=inline&show_copy_link=true"
            title="Добавление нового учителя в систему"
          />
        ),
      },
      {
        id: "add-teacher-rate",
        title: "Добавление новой ставки для учителя",
        category: "Учителя",
        content: (
          <ArcadeEmbed
            src="https://demo.arcade.software/4ZS8XIAOuFmqWDNNMJB2?embed&embed_mobile=tab&embed_desktop=inline&show_copy_link=true"
            title="Добавление новой ставки для учителя"
          />
        ),
      },
      {
        id: "add-subscription-type",
        title: "Добавление нового типа абонемента",
        category: "Абонементы",
        content: (
          <ArcadeEmbed
            src="https://demo.arcade.software/QwlQJ2qsSBb8M5lPjCIO?embed&embed_mobile=tab&embed_desktop=inline&show_copy_link=true"
            title="Добавление нового типа абонемента"
          />
        ),
      },
      {
        id: "add-room",
        title: "Добавление новой аудитории в расписание",
        category: "Расписание",
        content: (
          <ArcadeEmbed
            src="https://demo.arcade.software/xb5hSvTiBhGlbCBuwoL4?embed&embed_mobile=tab&embed_desktop=inline&show_copy_link=true"
            title="Добавление новой аудитории в расписание"
          />
        ),
      },
      {
        id: "schedule-individual-lesson",
        title: "Запланировать индивидуальный урок в расписании",
        category: "Расписание",
        content: (
          <ArcadeEmbed
            src="https://demo.arcade.software/MYXBktyqCUyPmw2NEJK3?embed&embed_mobile=tab&embed_desktop=inline&show_copy_link=true"
            title="Запланировать индивидуальный урок в расписании"
          />
        ),
      },
      {
        id: "mark-attendance",
        title: "Отметить посещаемость на уроке в расписании",
        category: "Расписание",
        content: (
          <ArcadeEmbed
            src="https://demo.arcade.software/Sv0FVOVAYTaTJJM0F5CI?embed&embed_mobile=tab&embed_desktop=inline&show_copy_link=true"
            title="Отметить посещаемость на уроке в расписании"
          />
        ),
      },
      {
        id: "create-group",
        title: "Создать новую учебную группу",
        category: "Группы",
        content: (
          <ArcadeEmbed
            src="https://demo.arcade.software/RvpM66JckKgJKLSx9KEK?embed&embed_mobile=tab&embed_desktop=inline&show_copy_link=true"
            title="Создать новую учебную группу"
          />
        ),
      },
      {
        id: "add-branch",
        title: "Добавление нового филиала в систему образовательного центра",
        category: "Филиалы",
        content: (
          <ArcadeEmbed
            src="https://demo.arcade.software/ykQk6lfvU4SguW99hFRV?embed&embed_mobile=tab&embed_desktop=inline&show_copy_link=true"
            title="Добавление нового филиала в систему образовательного центра"
          />
        ),
      },
      {
        id: "invite-user",
        title: "Пригласить нового пользователя и назначить ему роль",
        category: "Пользователи",
        content: (
          <ArcadeEmbed
            src="https://demo.arcade.software/FsecSj8QJD6Rc9SXPsqy?embed&embed_mobile=tab&embed_desktop=inline&show_copy_link=true"
            title="Пригласить нового пользователя и назначить ему роль"
          />
        ),
      },
      {
        id: "add-lead",
        title: "Добавление и сопровождение нового лида",
        category: "Лиды",
        content: (
          <ArcadeEmbed
            src="https://demo.arcade.software/deHQtB13fHPAXdCwsaAV?embed&embed_mobile=tab&embed_desktop=inline&show_copy_link=true"
            title="Добавление и сопровождение нового лида"
          />
        ),
      }
    ],
    []
  );

  useEffect(() => {
    if (user && user.onboardingCompleted !== true) {
      setIsOnboardingOpen(true);
    }
    if (user && user.onboardingCompleted === true) {
      setIsOnboardingOpen(false);
    }
  }, [user]);

  const handleOnboardingAction = async (action: "complete" | "skip" | "reset", closeAfter = true) => {
    setIsSubmitting(true);
    try {
      await updateOnboardingStatus(action);
      if (closeAfter) {
        setIsOnboardingOpen(false);
      } else {
        setIsOnboardingOpen(true);
      }
      if (action === "reset") {
        toast.success("Онбординг сброшен. Начинаем заново.");
      } else if (action === "skip") {
        toast.success("Онбординг пропущен");
      } else {
        toast.success("Онбординг завершен");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Не удалось обновить статус онбординга");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestart = async () => {
    await handleOnboardingAction("reset", false);
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-x-hidden">
        <AppSidebar onRestartOnboarding={handleRestart} />
        <div className="flex flex-1 flex-col min-w-0 overflow-x-hidden">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-2 sm:gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 sm:px-6">
            <SidebarTrigger />
            <HeaderSearch />
            <div className="flex-1" />
            <BranchSwitcher />
            <NotificationDropdown />
          </header>
          <main className="flex-1 p-4 sm:p-6 min-w-0 overflow-x-hidden">{children}</main>
        </div>
      </div>
      <OnboardingGate
        open={isOnboardingOpen}
        steps={steps}
        isSubmitting={isSubmitting}
        onComplete={() => handleOnboardingAction("complete")}
        onSkip={() => handleOnboardingAction("skip")}
      />
    </SidebarProvider>
  );
}

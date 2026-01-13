import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export type OnboardingActionHandler = () => Promise<void> | void;

export interface OnboardingStep {
  id: string;
  title: string;
  description?: string;
  content: React.ReactNode;
  category?: string;
}

interface OnboardingGateProps {
  open: boolean;
  steps: OnboardingStep[];
  isSubmitting?: boolean;
  onComplete: OnboardingActionHandler;
  onSkip: OnboardingActionHandler;
}

export function OnboardingGate({
  open,
  steps,
  isSubmitting,
  onComplete,
  onSkip,
}: OnboardingGateProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(
        steps
          .map((s) => s.category || "Общие")
          .filter(Boolean)
      )
    );
    return unique;
  }, [steps]);

  const filteredSteps = useMemo(() => {
    if (!activeCategory) return steps;
    return steps.filter((s) => (s.category || "Общие") === activeCategory);
  }, [steps, activeCategory]);

  const clampedStep = useMemo(() => {
    if (!filteredSteps.length) return 0;
    return Math.min(Math.max(activeStep, 0), filteredSteps.length - 1);
  }, [activeStep, filteredSteps.length]);

  const step = filteredSteps[clampedStep];
  const progressText = `${clampedStep + 1} / ${filteredSteps.length}`;

  const handleNext = () => {
    if (clampedStep < filteredSteps.length - 1) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (clampedStep > 0) {
      setActiveStep((prev) => prev - 1);
    }
  };

  if (!steps.length) return null;

  const renderIntro = () => (
    <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-2">
      {categories.map((cat) => (
        <Button
          key={cat}
          variant={cat === activeCategory ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setActiveCategory(cat);
            setActiveStep(0);
          }}
          disabled={isSubmitting}
        >
          {cat} · {steps.filter((s) => (s.category || "Общие") === cat).length} шаг(ов)
        </Button>
      ))}
    </div>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isSubmitting) {
          onSkip();
        }
      }}
    >
      <DialogContent className="max-w-[100vw] w-[100vw] h-[100vh] sm:max-w-[100vw] sm:w-[100vw] sm:h-[100vh] p-4 sm:p-6 gap-3 overflow-hidden flex flex-col bg-gradient-to-br from-slate-50 to-white">
        <DialogHeader className="pb-0">
          <div className="flex items-start justify-between gap-4 rounded-xl bg-white/80 border px-4 py-3 shadow-sm">
            <div className="space-y-1">
              <DialogTitle>Добро пожаловать в центр обучения</DialogTitle>
              <DialogDescription>
                Короткий тур по ключевым сценариям. Выберите категорию и шаг.
              </DialogDescription>
            </div>
            {activeCategory && <Badge variant="outline">{progressText}</Badge>}
          </div>
        </DialogHeader>

        <Separator />

        <div className="flex flex-1 min-h-0 gap-4 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 min-w-[240px] max-w-[260px] flex flex-col gap-3 border-r pr-2 overflow-y-auto overflow-x-hidden">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Категории</p>
              <div className="flex flex-col gap-2">
                {categories.map((cat) => {
                  const stepCount = steps.filter((s) => (s.category || "Общие") === cat).length;
                  return (
                    <Button
                      key={cat}
                      variant={cat === activeCategory ? "default" : "outline"}
                      size="sm"
                      className="justify-between"
                      onClick={() => {
                        setActiveCategory(cat);
                        setActiveStep(0);
                      }}
                      disabled={isSubmitting}
                    >
                      <span className="truncate">{cat}</span>
                      <Badge variant={cat === activeCategory ? "secondary" : "outline"} className="ml-2 shrink-0">
                        {stepCount}
                      </Badge>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Шаги</p>
              <div className="flex flex-col gap-2">
                {(activeCategory ? filteredSteps : []).map((s, idx) => (
                  <Button
                    key={s.id}
                    variant={idx === clampedStep ? "default" : "outline"}
                    size="sm"
                    className="justify-start h-auto py-2 px-3 text-left whitespace-normal"
                    onClick={() => setActiveStep(idx)}
                    disabled={isSubmitting}
                  >
                    <span className="font-medium mr-2 shrink-0">{idx + 1}.</span>
                    <span className="break-words">{s.title}</span>
                  </Button>
                ))}
              </div>
              {activeCategory && filteredSteps.length === 0 && (
                <p className="text-xs text-muted-foreground">Нет шагов в категории</p>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-auto pr-1">
            {!activeCategory && (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Выберите категорию слева, чтобы увидеть шаги.
              </div>
            )}
            {activeCategory && filteredSteps.length > 0 && (
              <div className="rounded-xl border bg-white/90 shadow-sm p-4 space-y-3 h-full">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  {step.description && <p className="text-sm text-muted-foreground">{step.description}</p>}
                </div>
                <div className="rounded-lg border bg-muted/10 p-2 sm:p-3 min-h-[40vh] max-h-[65vh] overflow-hidden">
                  {step.content}
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 sticky bottom-0 bg-background">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={!activeCategory || clampedStep === 0 || isSubmitting}
            >
              Назад
            </Button>
            <Button
              variant="outline"
              onClick={handleNext}
              disabled={!activeCategory || clampedStep === filteredSteps.length - 1 || isSubmitting}
            >
              Далее
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onSkip} disabled={isSubmitting}>
              Пропустить
            </Button>
            <Button onClick={onComplete} disabled={isSubmitting}>
              {isSubmitting ? "Сохраняем..." : "Понятно"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Wallet, BarChart3, Calendar, CreditCard, Bell, Users } from "lucide-react";

export type AuthMode = "login" | "register";

interface VisualPanelProps {
  mode: AuthMode;
  compact?: boolean;
  currentStep?: number;
}

const TRANSITION = { duration: 0.4, ease: [0.32, 0.72, 0, 1] as const };
const SLIDE_DURATION_MS = 3500;

const REGISTER_SLIDES = [
  {
    icon: BookOpen,
    headline: "Управление учениками и группами",
    description: "Всё расписание и посещаемость — в одном месте",
  },
  {
    icon: Wallet,
    headline: "Учёт оплат и задолженностей",
    description: "Кто оплатил, кто должен — видно сразу",
  },
  {
    icon: BarChart3,
    headline: "Понятные отчёты для руководителя",
    description: "Доходы, преподаватели, загрузка групп",
  },
  {
    icon: Calendar,
    headline: "Расписание занятий",
    description: "Неделя, смена преподавателей и комнат",
  },
  {
    icon: CreditCard,
    headline: "Абонементы и заморозки",
    description: "Списание занятий и переносы в один клик",
  },
  {
    icon: Bell,
    headline: "Уведомления и напоминания",
    description: "СМС и push для учеников и родителей",
  },
  {
    icon: Users,
    headline: "Лиды и воронка",
    description: "От заявки до первого занятия",
  },
] as const;

/** Register: auto-rotating product value presentation (left side only) */
function RegisterPresentation({ compact }: { compact?: boolean }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setIndex((i) => (i + 1) % REGISTER_SLIDES.length),
      SLIDE_DURATION_MS
    );
    return () => clearInterval(id);
  }, []);

  const slide = REGISTER_SLIDES[index];
  const Icon = slide.icon;

  return (
    <div className="flex h-full min-h-0 flex-col px-2 md:px-3">
      {/* Верх блока: бренд → хиро → плашка → подпись */}
      <div className="shrink-0 max-w-md pt-1">
        {!compact && (
          <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Neosmart CRM
          </div>
        )}
        <motion.h1
          className="text-xl md:text-2xl lg:text-[1.75rem] font-semibold text-white leading-tight tracking-tight"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        >
          Всё для вашей школы в одном месте
        </motion.h1>
        <motion.p
          className="mt-1.5 text-sm text-slate-400 max-w-[320px]"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06, ease: [0.32, 0.72, 0, 1] }}
        >
          Расписание, оплаты, отчёты — без лишней суеты
        </motion.p>
        <motion.div
          className="mt-4 mb-2 md:mb-3"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[13px] font-semibold tracking-tight text-white shadow-[0_0_24px_-4px_rgba(99,102,241,0.25)] md:text-sm">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/80" aria-hidden />
            Первый месяц бесплатно.
          </span>
        </motion.div>

      </div>
      {/* Центр: презентация фич */}
      <div className="relative min-h-[120px] flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={index}
            className="absolute inset-0 flex flex-col justify-center"
            initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          >
            <div className="flex items-start gap-3 relative max-w-md">
              <div className="absolute -left-2 -top-2 h-14 w-14 md:h-16 md:w-16 rounded-2xl bg-indigo-500/10 blur-xl pointer-events-none" aria-hidden />
              <div className="relative flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 border border-white/10 text-slate-300 shadow-[0_0_20px_-5px_rgba(99,102,241,0.15)]">
                <Icon className="h-4 w-4 md:h-5 md:w-5" strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <h2 className="text-lg md:text-xl font-semibold text-white leading-tight tracking-tight">
                  {slide.headline}
                </h2>
                <p className="mt-1.5 text-sm text-slate-400 leading-snug">
                  {slide.description}
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      {/* Низ: индикаторы слайдов */}
      {!compact && (
        <div className="shrink-0 flex gap-1.5 pb-2 pt-4" aria-hidden>
          {REGISTER_SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-0.5 flex-1 rounded-full transition-colors duration-300 ${
                i === index ? "bg-white/40" : "bg-white/15"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Login: calm message — quiet confidence, no selling */
function LoginCalm({ compact }: { compact?: boolean }) {
  return (
    <div className="flex h-full min-h-0 flex-col justify-center px-2 md:px-3">
      <div className="max-w-md">
        <motion.h1
          className="text-xl md:text-2xl lg:text-[1.75rem] font-medium text-white/95 leading-tight tracking-tight"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
        >
          Ваш бизнес под контролем
        </motion.h1>
        <motion.p
          className="mt-2 text-sm text-slate-400 leading-snug max-w-[300px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
        >
          Расписание, финансы и ученики — всегда под рукой
        </motion.p>
        {!compact && (
          <p className="mt-6 text-[11px] uppercase tracking-[0.15em] text-slate-500">
            Neosmart CRM
          </p>
        )}
      </div>
    </div>
  );
}

export function VisualPanel({ mode, compact = false }: VisualPanelProps) {
  const isLogin = mode === "login";

  return (
    <div
      className={`relative flex h-full min-h-[180px] flex-col overflow-hidden rounded-b-[24px] md:rounded-b-none bg-gradient-to-br from-[#0c1222] via-[#080d18] to-[#060a12] text-slate-100 ${
        !compact ? (isLogin ? "md:rounded-r-[28px]" : "md:rounded-l-[28px]") : ""
      }`}
    >
      {/* Background: register = more motion; login = very subtle, barely noticeable */}
      {isLogin ? (
        <>
          <motion.div
            className="pointer-events-none absolute -top-20 -left-20 h-48 w-48 rounded-full bg-[radial-gradient(circle,_rgba(99,102,241,0.1),_transparent_70%)] blur-3xl"
            animate={{ x: [0, 12, -8, 0], y: [0, -10, 6, 0] }}
            transition={{ duration: 28, ease: "easeInOut", repeat: Infinity }}
          />
          <motion.div
            className="pointer-events-none absolute bottom-0 right-0 h-40 w-40 rounded-full bg-[radial-gradient(circle,_rgba(59,130,246,0.08),_transparent_70%)] blur-3xl"
            animate={{ x: [0, -10, 8, 0], y: [0, 8, -4, 0] }}
            transition={{ duration: 24, ease: "easeInOut", repeat: Infinity }}
          />
        </>
      ) : (
        <>
          <motion.div
            className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,_rgba(99,102,241,0.25),_transparent_70%)] blur-3xl"
            animate={{ x: [0, 24, -16, 0], y: [0, -20, 12, 0] }}
            transition={{ duration: 18, ease: "easeInOut", repeat: Infinity }}
          />
          <motion.div
            className="pointer-events-none absolute bottom-0 right-0 h-44 w-44 rounded-full bg-[radial-gradient(circle,_rgba(59,130,246,0.2),_transparent_70%)] blur-3xl"
            animate={{ x: [0, -18, 14, 0], y: [0, 16, -8, 0] }}
            transition={{ duration: 15, ease: "easeInOut", repeat: Infinity }}
          />
        </>
      )}

      <div className="relative z-10 flex flex-1 flex-col min-h-0 p-5 md:p-6 lg:p-8">
        <AnimatePresence mode="wait">
          {isLogin ? (
            <motion.div
              key="login"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={TRANSITION}
              className="flex flex-1 flex-col min-h-0"
            >
              <LoginCalm compact={compact} />
            </motion.div>
          ) : (
            <motion.div
              key="register"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={TRANSITION}
              className="flex flex-1 flex-col min-h-0"
            >
              <RegisterPresentation compact={compact} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

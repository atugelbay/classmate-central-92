export type SpotlightCard = {
  title: string;
  description: string;
  /** Tailwind-compatible color for left indicator (e.g. bg-emerald-500) */
  indicatorColor?: string;
};

export const LOGIN_SPOTLIGHT_CARDS: SpotlightCard[] = [
  { title: "Система онлайн", description: "Доступ активен", indicatorColor: "bg-emerald-500" },
  { title: "Все данные в облаке", description: "Синхронизация включена", indicatorColor: "bg-blue-500" },
  { title: "Занятия запланированы", description: "Расписание обновлено", indicatorColor: "bg-violet-500" },
];

export const REGISTER_SPOTLIGHT_BY_STEP: Record<number, SpotlightCard[]> = {
  1: [
    { title: "Аккаунт инициализируется", description: "Готовим рабочий кабинет", indicatorColor: "bg-blue-500" },
    { title: "Демо-центр создаётся", description: "Скоро будет готов", indicatorColor: "bg-slate-500" },
    { title: "Доступ к панели готовится", description: "Осталось немного", indicatorColor: "bg-slate-500" },
  ],
  2: [
    { title: "Центр создан", description: "Можно менять позже", indicatorColor: "bg-emerald-500" },
    { title: "Группы подготовлены", description: "Добавлены в панель", indicatorColor: "bg-slate-500" },
    { title: "Расписание добавлено", description: "Готово к настройке", indicatorColor: "bg-slate-500" },
  ],
  3: [
    { title: "Коммуникации включены", description: "Напоминания будут работать", indicatorColor: "bg-violet-500" },
    { title: "Email подтверждён", description: "Уведомления активны", indicatorColor: "bg-slate-500" },
    { title: "Уведомления активны", description: "Доступ к системе открыт", indicatorColor: "bg-slate-500" },
  ],
  4: [
    { title: "Всё готово", description: "Остался последний шаг", indicatorColor: "bg-emerald-500" },
    { title: "Демо-данные загружены", description: "Можно смотреть примеры", indicatorColor: "bg-slate-500" },
    { title: "Панель готова", description: "Система к использованию", indicatorColor: "bg-slate-500" },
  ],
};

export function getSpotlightCards(mode: "login" | "register", step?: number): SpotlightCard[] {
  if (mode === "login") return LOGIN_SPOTLIGHT_CARDS;
  if (mode === "register" && step != null && step >= 1 && step <= 4) {
    return REGISTER_SPOTLIGHT_BY_STEP[step] ?? REGISTER_SPOTLIGHT_BY_STEP[1];
  }
  return REGISTER_SPOTLIGHT_BY_STEP[1];
}

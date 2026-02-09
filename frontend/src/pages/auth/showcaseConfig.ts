export type ScreenVariant =
  | "attendance"
  | "schedule"
  | "payments"
  | "students"
  | "reports"
  | "dashboard";

export type ShowcaseSlide = {
  title: string;
  subtitle: string;
  screenVariant: ScreenVariant;
  /** 2–3 short status lines for foreground micro-cards */
  microCards: string[];
};

export const REGISTER_BADGE = "1 месяц бесплатно";
export const LOGIN_BADGE = "С возвращением";

export const REGISTER_SLIDES: ShowcaseSlide[] = [
  {
    title: "Посещаемость → баланс обновляется",
    subtitle: "Отмечайте занятия — система считает списания сама",
    screenVariant: "attendance",
    microCards: ["Посещение отмечено", "Баланс обновлён", "+1 занятие"],
  },
  {
    title: "Расписание по группам",
    subtitle: "Наглядная неделя для администраторов и преподавателей",
    screenVariant: "schedule",
    microCards: ["Занятие добавлено", "Группа A1", "Время: 18:00"],
  },
  {
    title: "Оплаты и абонементы",
    subtitle: "Контроль оплат и долгов без Excel",
    screenVariant: "payments",
    microCards: ["Оплата учтена", "Абонемент активен", "Долг: 0"],
  },
  {
    title: "Ученики и карточки",
    subtitle: "Вся история ученика в одном месте",
    screenVariant: "students",
    microCards: ["Карточка открыта", "История загружена", "Контакты обновлены"],
  },
  {
    title: "Отчёты за минуту",
    subtitle: "Финансы и посещаемость — быстро и понятно",
    screenVariant: "reports",
    microCards: ["Отчёт сформирован", "Данные актуальны", "Экспорт готов"],
  },
];

export const LOGIN_SLIDES: ShowcaseSlide[] = [
  {
    title: "Быстрый доступ к расписанию",
    subtitle: "Неделя и день — в один клик",
    screenVariant: "schedule",
    microCards: ["Занятие добавлено", "Группа A1", "Время: 18:00"],
  },
  {
    title: "Проверяйте оплаты за секунды",
    subtitle: "Балансы и долги на виду",
    screenVariant: "payments",
    microCards: ["Оплата учтена", "Абонемент активен", "Долг: 0"],
  },
  {
    title: "Всё на месте: ученики, занятия, финансы",
    subtitle: "Один кабинет для управления центром",
    screenVariant: "dashboard",
    microCards: ["Система онлайн", "Данные синхронизированы", "Доступ активен"],
  },
];

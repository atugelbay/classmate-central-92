export type VisualStepState = {
  title: string;
  subtitle: string;
  events: string[];
};

export type LoginVisualState = {
  title: string;
  subtitle: string;
  statusCards: string[];
  activityItems?: string[];
};

export const LOGIN_VISUAL_STATE: LoginVisualState = {
  title: "С возвращением",
  subtitle: "Продолжайте с того места, где остановились",
  statusCards: [
    "Система онлайн",
    "Все данные в облаке",
    "Безопасный доступ активен",
  ],
  activityItems: [
    "Последний вход: сегодня",
    "Занятия запланированы",
    "Оплаты учтены",
  ],
};

export const REGISTER_VISUAL_STATES: Record<number, VisualStepState> = {
  1: {
    title: "Добро пожаловать в Neosmart",
    subtitle: "Сейчас создадим ваш рабочий кабинет",
    events: ["Аккаунт инициализируется…"],
  },
  2: {
    title: "Создаём образовательный центр",
    subtitle: "Группы и расписание появятся автоматически",
    events: ["Центр создан", "Группы и расписание подготовлены"],
  },
  3: {
    title: "Подключаем коммуникации",
    subtitle: "Уведомления и напоминания будут работать сразу",
    events: ["Email добавлен", "Уведомления активны", "Доступ к системе открыт"],
  },
  4: {
    title: "Всё готово 🚀",
    subtitle: "Можно начинать работу",
    events: ["Демо-данные загружены", "Ученик добавлен", "Система готова к использованию"],
  },
};

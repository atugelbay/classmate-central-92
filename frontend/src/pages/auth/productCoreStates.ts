/** One-line label shown above/below the Product Core. Edit here to change copy. */
export const REGISTER_CORE_LABELS: Record<number, string> = {
  1: "Создаём рабочее пространство",
  2: "Настраиваем центр",
  3: "Подключаем коммуникации",
  4: "Всё готово",
};

export const LOGIN_CORE_LABEL = "С возвращением";

export type CoreStateKind = "idle" | "structure" | "connections" | "ready" | "login";

export const REGISTER_STEP_TO_CORE: Record<number, CoreStateKind> = {
  1: "idle",
  2: "structure",
  3: "connections",
  4: "ready",
};

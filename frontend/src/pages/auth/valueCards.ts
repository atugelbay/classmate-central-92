export type ValueCard = {
  id: string;
  text: string;
};

export const REGISTER_CARDS: ValueCard[] = [
  { id: "r1", text: "Посещаемость → баланс обновляется" },
  { id: "r2", text: "Расписание и группы — наглядно" },
  { id: "r3", text: "Оплаты и отчёты — за минуту" },
];

export const LOGIN_CARDS: ValueCard[] = [
  { id: "l1", text: "Все данные в облаке" },
  { id: "l2", text: "Безопасный доступ" },
  { id: "l3", text: "Ученики, занятия, оплаты — рядом" },
];

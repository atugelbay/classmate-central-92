import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, StatCard } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, DollarSign, TrendingUp, TrendingDown, Users, Trash2, Edit, FileText, ArrowRight, CreditCard, Wallet, AlertCircle } from "lucide-react";
import { useTransactions, useCreateTransaction, useAllBalances, useDiscounts, useCreateDiscount, useUpdateDiscount, useDeleteDiscount, useDebts, useCreateDebt, useUpdateDebt, useStudents, useTeachers, useGroups } from "@/hooks/useData";
import { Discount, DebtRecord } from "@/types";
import moment from "moment";
import { PageHeader } from "@/components/PageHeader";
import "moment/locale/ru";
import { ExportDialog } from "@/components/ExportDialog";

moment.locale("ru");

export default function Finance() {
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions();
  const { data: balances = [], isLoading: balancesLoading } = useAllBalances();
  const { data: discounts = [], isLoading: discountsLoading } = useDiscounts();
  const { data: debts = [], isLoading: debtsLoading } = useDebts();
  const { data: students = [] } = useStudents();
  const { data: teachers = [] } = useTeachers();
  const { data: groups = [] } = useGroups();
  
  const createTransaction = useCreateTransaction();
  const createDiscount = useCreateDiscount();
  const updateDiscount = useUpdateDiscount();
  const deleteDiscount = useDeleteDiscount();
  const createDebt = useCreateDebt();
  const updateDebt = useUpdateDebt();

  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);
  const [isDebtDialogOpen, setIsDebtDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);
  const [selectedDebt, setSelectedDebt] = useState<DebtRecord | null>(null);

  // Statistics
  const totalIncome = transactions
    .filter(t => t.type === "payment")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalRefunds = transactions
    .filter(t => t.type === "refund")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalBalance = balances.reduce((sum, b) => sum + b.balance, 0);
  const pendingDebts = debts
    .filter(d => d.status === "pending")
    .reduce((sum, d) => sum + d.amount, 0);

  const handleTransactionSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    await createTransaction.mutateAsync({
      studentId: formData.get("studentId") as string,
      amount: parseFloat(formData.get("amount") as string),
      type: formData.get("type") as any,
      paymentMethod: formData.get("paymentMethod") as any,
      description: formData.get("description") as string,
    });

    setIsTransactionDialogOpen(false);
  };

  const handleDiscountSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const discountData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      type: formData.get("type") as "percentage" | "fixed",
      value: parseFloat(formData.get("value") as string),
      isActive: formData.get("isActive") === "true",
    };

    if (selectedDiscount) {
      await updateDiscount.mutateAsync({ id: selectedDiscount.id, data: discountData });
    } else {
      await createDiscount.mutateAsync(discountData);
    }

    setIsDiscountDialogOpen(false);
    setSelectedDiscount(null);
  };

  const handleDebtSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const debtData = {
      studentId: formData.get("studentId") as string,
      amount: parseFloat(formData.get("amount") as string),
      dueDate: formData.get("dueDate") as string,
      status: formData.get("status") as any,
      notes: formData.get("notes") as string,
    };

    if (selectedDebt) {
      await updateDebt.mutateAsync({ id: selectedDebt.id, data: debtData });
    } else {
      await createDebt.mutateAsync(debtData);
    }

    setIsDebtDialogOpen(false);
    setSelectedDebt(null);
  };

  const getStudentName = (studentId: string, studentName?: string) => {
    if (studentName) return studentName;
    const student = students.find(s => s.id === studentId);
    return student?.name || studentId;
  };

  // Group transactions by date
  const groupedTransactions = transactions.reduce((groups: Record<string, typeof transactions>, transaction) => {
    const date = moment(transaction.createdAt).format("YYYY-MM-DD");
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transaction);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  if (transactionsLoading || balancesLoading || debtsLoading || discountsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Финансы"
        description="Управление финансами и платежами"
      />

      {/* Bento Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950 dark:to-green-900 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-emerald-500/20">
              <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm text-emerald-700 dark:text-emerald-300">Общий доход</span>
          </div>
          <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
            {totalIncome.toLocaleString()} ₸
          </div>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-rose-50 to-red-100 dark:from-rose-950 dark:to-red-900 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-rose-500/20">
              <TrendingDown className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            </div>
            <span className="text-sm text-rose-700 dark:text-rose-300">Возвраты</span>
          </div>
          <div className="text-2xl font-bold text-rose-900 dark:text-rose-100">
            {totalRefunds.toLocaleString()} ₸
          </div>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-sky-50 to-blue-100 dark:from-sky-950 dark:to-blue-900 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-sky-500/20">
              <Wallet className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            </div>
            <span className="text-sm text-sky-700 dark:text-sky-300">Общий баланс</span>
          </div>
          <div className="text-2xl font-bold text-sky-900 dark:text-sky-100">
            {totalBalance.toLocaleString()} ₸
          </div>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-900 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-amber-500/20">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-sm text-amber-700 dark:text-amber-300">Долги</span>
          </div>
          <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
            {pendingDebts.toLocaleString()} ₸
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="transactions">
        <TabsList className="rounded-2xl p-1 bg-muted/50">
          <TabsTrigger value="transactions" className="rounded-xl">Транзакции</TabsTrigger>
          <TabsTrigger value="balances" className="rounded-xl">Балансы</TabsTrigger>
          <TabsTrigger value="discounts" className="rounded-xl">Скидки</TabsTrigger>
          <TabsTrigger value="debts" className="rounded-xl">Долги</TabsTrigger>
        </TabsList>

        {/* Transactions Tab - Card Based */}
        <TabsContent value="transactions" className="space-y-4 mt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-xl font-semibold">История транзакций</h2>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => setIsExportDialogOpen(true)}
                className="rounded-xl"
              >
                <FileText className="h-4 w-4 mr-2" />
                Экспорт
              </Button>
              <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-xl">
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-3xl">
                  <DialogHeader>
                    <DialogTitle>Новая транзакция</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleTransactionSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="studentId">Студент</Label>
                      <Select name="studentId" required>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Выберите студента" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map(student => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="amount">Сумма (₸)</Label>
                      <Input id="amount" name="amount" type="number" step="0.01" required className="rounded-xl" />
                    </div>
                    <div>
                      <Label htmlFor="type">Тип</Label>
                      <Select name="type" required>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Выберите тип" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="payment">Платеж</SelectItem>
                          <SelectItem value="refund">Возврат</SelectItem>
                          <SelectItem value="debt">Долг</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="paymentMethod">Способ оплаты</Label>
                      <Select name="paymentMethod" required>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Выберите способ" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Наличные</SelectItem>
                          <SelectItem value="card">Карта</SelectItem>
                          <SelectItem value="transfer">Перевод</SelectItem>
                          <SelectItem value="other">Другое</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="description">Описание</Label>
                      <Input id="description" name="description" className="rounded-xl" />
                    </div>
                    <Button type="submit" className="w-full rounded-xl">Создать</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Transactions as cards grouped by date */}
          <div className="space-y-6">
            {sortedDates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Нет транзакций</p>
              </div>
            ) : (
              sortedDates.slice(0, 10).map(date => (
                <div key={date}>
                  <div className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    {moment(date).format("D MMMM YYYY")}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {groupedTransactions[date].map(transaction => {
                      const isPositive = transaction.type === "payment";
                      return (
                        <div
                          key={transaction.id}
                          className={`p-4 rounded-2xl transition-all hover:scale-[1.02] cursor-pointer ${
                            isPositive 
                              ? "bg-emerald-50 dark:bg-emerald-950 hover:shadow-emerald-100 dark:hover:shadow-emerald-900/30" 
                              : "bg-rose-50 dark:bg-rose-950 hover:shadow-rose-100 dark:hover:shadow-rose-900/30"
                          } hover:shadow-lg`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className={`text-lg font-bold ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                {isPositive ? "+" : "-"}{transaction.amount.toLocaleString()} ₸
                              </div>
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate mt-1">
                                {getStudentName(transaction.studentId, transaction.studentName)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {moment(transaction.createdAt).format("HH:mm")} • {transaction.paymentMethod}
                              </div>
                            </div>
                            <Badge 
                              className={`shrink-0 rounded-lg ${
                                isPositive 
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" 
                                  : "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300"
                              }`}
                            >
                              {transaction.type === "payment" ? "Платеж" : transaction.type === "refund" ? "Возврат" : "Долг"}
                            </Badge>
                          </div>
                          {transaction.description && (
                            <div className="text-xs text-gray-400 mt-2 truncate">
                              {transaction.description}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* Balances Tab - Card Grid */}
        <TabsContent value="balances" className="space-y-4 mt-6">
          <h2 className="text-xl font-semibold">Балансы студентов</h2>
          
          {balances.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Нет данных о балансах</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {balances.map(balance => (
                <div
                  key={balance.studentId}
                  className={`p-4 rounded-2xl transition-all hover:scale-[1.02] cursor-pointer ${
                    balance.balance >= 0 
                      ? "bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950 dark:to-green-900" 
                      : "bg-gradient-to-br from-rose-50 to-red-100 dark:from-rose-950 dark:to-red-900"
                  }`}
                >
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {getStudentName(balance.studentId, balance.studentName)}
                  </div>
                  <div className={`text-2xl font-bold mt-2 ${
                    balance.balance >= 0 
                      ? "text-emerald-600 dark:text-emerald-400" 
                      : "text-rose-600 dark:text-rose-400"
                  }`}>
                    {balance.balance.toLocaleString()} ₸
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {balance.lastPaymentDate 
                      ? `Последний платеж: ${moment(balance.lastPaymentDate).format("D MMM")}`
                      : "Нет платежей"
                    }
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Discounts Tab */}
        <TabsContent value="discounts" className="space-y-4 mt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-xl font-semibold">Скидки</h2>
            <Dialog open={isDiscountDialogOpen} onOpenChange={(open) => { setIsDiscountDialogOpen(open); if (!open) setSelectedDiscount(null); }}>
              <DialogTrigger asChild>
                <Button className="rounded-xl">
                  <Plus className="h-4 w-4 mr-2" />
                  Создать скидку
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl">
                <DialogHeader>
                  <DialogTitle>{selectedDiscount ? "Редактировать скидку" : "Новая скидка"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleDiscountSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Название</Label>
                    <Input id="name" name="name" defaultValue={selectedDiscount?.name} required className="rounded-xl" />
                  </div>
                  <div>
                    <Label htmlFor="description">Описание</Label>
                    <Input id="description" name="description" defaultValue={selectedDiscount?.description} className="rounded-xl" />
                  </div>
                  <div>
                    <Label htmlFor="type">Тип скидки</Label>
                    <Select name="type" defaultValue={selectedDiscount?.type || "percentage"} required>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Процентная</SelectItem>
                        <SelectItem value="fixed">Фиксированная сумма</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="value">Значение</Label>
                    <Input id="value" name="value" type="number" step="0.01" defaultValue={selectedDiscount?.value} required className="rounded-xl" />
                  </div>
                  <div>
                    <Label htmlFor="isActive">Активна</Label>
                    <Select name="isActive" defaultValue={selectedDiscount?.isActive ? "true" : "false"} required>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Да</SelectItem>
                        <SelectItem value="false">Нет</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full rounded-xl">{selectedDiscount ? "Сохранить" : "Создать"}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {discounts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Нет скидок</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {discounts.map(discount => (
                <div 
                  key={discount.id} 
                  className="p-5 rounded-3xl bg-gradient-to-br from-violet-50 to-purple-100 dark:from-violet-950 dark:to-purple-900 transition-all hover:scale-[1.02]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-violet-900 dark:text-violet-100">{discount.name}</span>
                    <Badge className={`rounded-lg ${discount.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                      {discount.isActive ? "Активна" : "Неактивна"}
                    </Badge>
                  </div>
                  <div className="text-3xl font-bold text-violet-600 dark:text-violet-400">
                    {discount.type === "percentage" ? `${discount.value}%` : `${discount.value.toLocaleString()} ₸`}
                  </div>
                  <div className="text-xs text-violet-600/70 dark:text-violet-400/70 mt-1">
                    {discount.type === "percentage" ? "Процентная" : "Фиксированная"}
                  </div>
                  {discount.description && (
                    <div className="text-sm text-violet-700/80 dark:text-violet-300/80 mt-3">
                      {discount.description}
                    </div>
                  )}
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => {
                        setSelectedDiscount(discount);
                        setIsDiscountDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-xl text-rose-600 hover:text-rose-700"
                      onClick={() => {
                        if (confirm("Удалить эту скидку?")) {
                          deleteDiscount.mutate(discount.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Debts Tab */}
        <TabsContent value="debts" className="space-y-4 mt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-xl font-semibold">Долги</h2>
            <Dialog open={isDebtDialogOpen} onOpenChange={(open) => { setIsDebtDialogOpen(open); if (!open) setSelectedDebt(null); }}>
              <DialogTrigger asChild>
                <Button className="rounded-xl">
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить долг
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl">
                <DialogHeader>
                  <DialogTitle>{selectedDebt ? "Редактировать долг" : "Новый долг"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleDebtSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="debt-studentId">Студент</Label>
                    <Select name="studentId" defaultValue={selectedDebt?.studentId} required>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Выберите студента" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map(student => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="debt-amount">Сумма (₸)</Label>
                    <Input id="debt-amount" name="amount" type="number" step="0.01" defaultValue={selectedDebt?.amount} required className="rounded-xl" />
                  </div>
                  <div>
                    <Label htmlFor="dueDate">Срок погашения</Label>
                    <Input id="dueDate" name="dueDate" type="date" defaultValue={selectedDebt?.dueDate?.split('T')[0]} className="rounded-xl" />
                  </div>
                  <div>
                    <Label htmlFor="debt-status">Статус</Label>
                    <Select name="status" defaultValue={selectedDebt?.status || "pending"} required>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Ожидает оплаты</SelectItem>
                        <SelectItem value="paid">Оплачен</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="notes">Примечания</Label>
                    <Input id="notes" name="notes" defaultValue={selectedDebt?.notes} className="rounded-xl" />
                  </div>
                  <Button type="submit" className="w-full rounded-xl">{selectedDebt ? "Сохранить" : "Создать"}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {debts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Нет долгов</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {debts.map(debt => (
                <div
                  key={debt.id}
                  className={`p-4 rounded-2xl transition-all hover:scale-[1.02] cursor-pointer ${
                    debt.status === "paid" 
                      ? "bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950 dark:to-green-900" 
                      : "bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-900"
                  }`}
                  onClick={() => { setSelectedDebt(debt); setIsDebtDialogOpen(true); }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {getStudentName(debt.studentId)}
                    </span>
                    <Badge className={`rounded-lg ${
                      debt.status === "paid" 
                        ? "bg-emerald-100 text-emerald-700" 
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {debt.status === "paid" ? "Оплачен" : "Ожидает"}
                    </Badge>
                  </div>
                  <div className={`text-2xl font-bold ${
                    debt.status === "paid" 
                      ? "text-emerald-600 dark:text-emerald-400" 
                      : "text-amber-600 dark:text-amber-400"
                  }`}>
                    {debt.amount.toLocaleString()} ₸
                  </div>
                  {debt.dueDate && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Срок: {moment(debt.dueDate).format("D MMM YYYY")}
                    </div>
                  )}
                  {debt.notes && (
                    <div className="text-xs text-gray-400 mt-1 truncate">
                      {debt.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Export Dialog */}
      <ExportDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        type="transactions"
        teachers={teachers.map(t => ({ id: t.id, name: t.name }))}
        groups={groups.map(g => ({ id: g.id, name: g.name }))}
        students={students.map(s => ({ id: s.id, name: s.name }))}
        defaultStartDate={moment().subtract(30, 'days').format('YYYY-MM-DD')}
        defaultEndDate={moment().format('YYYY-MM-DD')}
      />
    </div>
  );
}

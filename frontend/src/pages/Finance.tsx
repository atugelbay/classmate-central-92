import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, DollarSign, TrendingUp, TrendingDown, Users, Trash2, Edit } from "lucide-react";
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useTransactions, useCreateTransaction, useAllBalances, useDiscounts, useCreateDiscount, useUpdateDiscount, useDeleteDiscount, useDebts, useCreateDebt, useUpdateDebt, useStudents } from "@/hooks/useData";
import { Discount, DebtRecord } from "@/types";
import moment from "moment";
import "moment/locale/ru";

moment.locale("ru");

const ITEMS_PER_PAGE = 39;

export default function Finance() {
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions();
  const { data: balances = [], isLoading: balancesLoading } = useAllBalances();
  const { data: discounts = [], isLoading: discountsLoading } = useDiscounts();
  const { data: debts = [], isLoading: debtsLoading } = useDebts();
  const { data: students = [] } = useStudents();
  
  const createTransaction = useCreateTransaction();
  const createDiscount = useCreateDiscount();
  const updateDiscount = useUpdateDiscount();
  const deleteDiscount = useDeleteDiscount();
  const createDebt = useCreateDebt();
  const updateDebt = useUpdateDebt();

  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);
  const [isDebtDialogOpen, setIsDebtDialogOpen] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);
  const [selectedDebt, setSelectedDebt] = useState<DebtRecord | null>(null);
  const [currentPageTransactions, setCurrentPageTransactions] = useState(1);
  const [currentPageBalances, setCurrentPageBalances] = useState(1);
  const [currentPageDebts, setCurrentPageDebts] = useState(1);

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

  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    return student?.name || studentId;
  };

  // Pagination for transactions
  const totalPagesTransactions = Math.ceil(transactions.length / ITEMS_PER_PAGE);
  const startIndexTransactions = (currentPageTransactions - 1) * ITEMS_PER_PAGE;
  const endIndexTransactions = startIndexTransactions + ITEMS_PER_PAGE;
  const paginatedTransactions = transactions.slice(startIndexTransactions, endIndexTransactions);

  // Pagination for balances
  const totalPagesBalances = Math.ceil(balances.length / ITEMS_PER_PAGE);
  const startIndexBalances = (currentPageBalances - 1) * ITEMS_PER_PAGE;
  const endIndexBalances = startIndexBalances + ITEMS_PER_PAGE;
  const paginatedBalances = balances.slice(startIndexBalances, endIndexBalances);

  // Pagination for debts
  const totalPagesDebts = Math.ceil(debts.length / ITEMS_PER_PAGE);
  const startIndexDebts = (currentPageDebts - 1) * ITEMS_PER_PAGE;
  const endIndexDebts = startIndexDebts + ITEMS_PER_PAGE;
  const paginatedDebts = debts.slice(startIndexDebts, endIndexDebts);

  if (transactionsLoading || balancesLoading || debtsLoading || discountsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Финансы</h1>
          <p className="text-muted-foreground">Управление финансами и платежами</p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Общий доход</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalIncome.toLocaleString()} ₸</div>
            <p className="text-xs text-muted-foreground">За все время</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Возвраты</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRefunds.toLocaleString()} ₸</div>
            <p className="text-xs text-muted-foreground">За все время</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Общий баланс</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBalance.toLocaleString()} ₸</div>
            <p className="text-xs text-muted-foreground">{balances.length} студентов</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Долги</CardTitle>
            <Users className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingDebts.toLocaleString()} ₸</div>
            <p className="text-xs text-muted-foreground">{debts.filter(d => d.status === "pending").length} должников</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Транзакции</TabsTrigger>
          <TabsTrigger value="balances">Балансы</TabsTrigger>
          <TabsTrigger value="discounts">Скидки</TabsTrigger>
          <TabsTrigger value="debts">Долги</TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">История транзакций</h2>
            <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить транзакцию
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Новая транзакция</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleTransactionSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="studentId">Студент</Label>
                    <Select name="studentId" required>
                      <SelectTrigger>
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
                    <Input id="amount" name="amount" type="number" step="0.01" required />
                  </div>
                  <div>
                    <Label htmlFor="type">Тип</Label>
                    <Select name="type" required>
                      <SelectTrigger>
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
                      <SelectTrigger>
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
                    <Input id="description" name="description" />
                  </div>
                  <Button type="submit" className="w-full">Создать</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Студент</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Способ</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Нет транзакций
                        </TableCell>
                      </TableRow>
                    ) : (
                    paginatedTransactions.map(transaction => (
                      <TableRow key={transaction.id}>
                        <TableCell>{moment(transaction.createdAt).format("DD.MM.YYYY HH:mm")}</TableCell>
                        <TableCell>{getStudentName(transaction.studentId)}</TableCell>
                        <TableCell>
                          <Badge variant={transaction.type === "payment" ? "default" : transaction.type === "refund" ? "destructive" : transaction.type === "deduction" ? "secondary" : "destructive"}>
                            {transaction.type === "payment" ? "Платеж" : transaction.type === "refund" ? "Возврат" : transaction.type === "deduction" ? "Списание" : "Долг"}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">{transaction.paymentMethod}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell className="text-right font-medium">
                          {transaction.type === "payment" ? "+" : "-"}{transaction.amount.toLocaleString()} ₸
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination for Transactions */}
          {totalPagesTransactions > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPageTransactions > 1) setCurrentPageTransactions(currentPageTransactions - 1);
                    }}
                    className={currentPageTransactions === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {Array.from({ length: totalPagesTransactions }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPageTransactions(page);
                      }}
                      isActive={currentPageTransactions === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPageTransactions < totalPagesTransactions) setCurrentPageTransactions(currentPageTransactions + 1);
                    }}
                    className={currentPageTransactions === totalPagesTransactions ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </TabsContent>

        {/* Balances Tab */}
        <TabsContent value="balances" className="space-y-4">
          <h2 className="text-xl font-semibold">Балансы студентов</h2>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Студент</TableHead>
                    <TableHead>Баланс</TableHead>
                    <TableHead>Последний платеж</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBalances.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          Нет данных о балансах
                        </TableCell>
                      </TableRow>
                    ) : (
                    paginatedBalances.map(balance => (
                      <TableRow key={balance.studentId}>
                        <TableCell>{getStudentName(balance.studentId)}</TableCell>
                        <TableCell>
                          <span className={balance.balance >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                            {balance.balance.toLocaleString()} ₸
                          </span>
                        </TableCell>
                        <TableCell>
                          {balance.lastPaymentDate ? moment(balance.lastPaymentDate).format("DD.MM.YYYY HH:mm") : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination for Balances */}
          {totalPagesBalances > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPageBalances > 1) setCurrentPageBalances(currentPageBalances - 1);
                    }}
                    className={currentPageBalances === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {Array.from({ length: totalPagesBalances }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPageBalances(page);
                      }}
                      isActive={currentPageBalances === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPageBalances < totalPagesBalances) setCurrentPageBalances(currentPageBalances + 1);
                    }}
                    className={currentPageBalances === totalPagesBalances ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </TabsContent>

        {/* Discounts Tab */}
        <TabsContent value="discounts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Скидки</h2>
            <Dialog open={isDiscountDialogOpen} onOpenChange={(open) => { setIsDiscountDialogOpen(open); if (!open) setSelectedDiscount(null); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Создать скидку
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{selectedDiscount ? "Редактировать скидку" : "Новая скидка"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleDiscountSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Название</Label>
                    <Input id="name" name="name" defaultValue={selectedDiscount?.name} required />
                  </div>
                  <div>
                    <Label htmlFor="description">Описание</Label>
                    <Input id="description" name="description" defaultValue={selectedDiscount?.description} />
                  </div>
                  <div>
                    <Label htmlFor="type">Тип скидки</Label>
                    <Select name="type" defaultValue={selectedDiscount?.type || "percentage"} required>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Процентная</SelectItem>
                        <SelectItem value="fixed">Фиксированная сумма</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="value">
                      {selectedDiscount?.type === "fixed" || document.querySelector('[name="type"]')?.getAttribute('value') === 'fixed' ? "Сумма (₸)" : "Процент (%)"}
                    </Label>
                    <Input id="value" name="value" type="number" step="0.01" defaultValue={selectedDiscount?.value} required />
                  </div>
                  <div>
                    <Label htmlFor="isActive">Активна</Label>
                    <Select name="isActive" defaultValue={selectedDiscount?.isActive ? "true" : "false"} required>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Да</SelectItem>
                        <SelectItem value="false">Нет</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">{selectedDiscount ? "Сохранить" : "Создать"}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {discountsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : discounts.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">Нет скидок</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {discounts.map(discount => (
                <Card key={discount.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{discount.name}</CardTitle>
                      <Badge variant={discount.isActive ? "default" : "secondary"}>
                        {discount.isActive ? "Активна" : "Неактивна"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{discount.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold">
                          {discount.type === "percentage" 
                            ? `${discount.value}%` 
                            : `${discount.value.toLocaleString()} ₸`}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {discount.type === "percentage" ? "Процентная скидка" : "Фиксированная сумма"}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDiscount(discount);
                            setIsDiscountDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm("Вы уверены, что хотите удалить эту скидку?")) {
                              deleteDiscount.mutate(discount.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Debts Tab */}
        <TabsContent value="debts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Долги</h2>
            <Dialog open={isDebtDialogOpen} onOpenChange={(open) => { setIsDebtDialogOpen(open); if (!open) setSelectedDebt(null); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить долг
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{selectedDebt ? "Редактировать долг" : "Новый долг"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleDebtSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="debt-studentId">Студент</Label>
                    <Select name="studentId" defaultValue={selectedDebt?.studentId} required>
                      <SelectTrigger>
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
                    <Input id="debt-amount" name="amount" type="number" step="0.01" defaultValue={selectedDebt?.amount} required />
                  </div>
                  <div>
                    <Label htmlFor="dueDate">Срок погашения</Label>
                    <Input id="dueDate" name="dueDate" type="date" defaultValue={selectedDebt?.dueDate?.split('T')[0]} />
                  </div>
                  <div>
                    <Label htmlFor="debt-status">Статус</Label>
                    <Select name="status" defaultValue={selectedDebt?.status || "pending"} required>
                      <SelectTrigger>
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
                    <Input id="notes" name="notes" defaultValue={selectedDebt?.notes} />
                  </div>
                  <Button type="submit" className="w-full">{selectedDebt ? "Сохранить" : "Создать"}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Студент</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Срок погашения</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Примечания</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDebts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Нет долгов
                        </TableCell>
                      </TableRow>
                    ) : (
                    paginatedDebts.map(debt => (
                      <TableRow key={debt.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedDebt(debt); setIsDebtDialogOpen(true); }}>
                        <TableCell>{getStudentName(debt.studentId)}</TableCell>
                        <TableCell className="font-medium text-orange-600">{debt.amount.toLocaleString()} ₸</TableCell>
                        <TableCell>{debt.dueDate ? moment(debt.dueDate).format("DD.MM.YYYY") : "—"}</TableCell>
                        <TableCell>
                          <Badge variant={debt.status === "paid" ? "default" : "destructive"}>
                            {debt.status === "paid" ? "Оплачен" : "Ожидает оплаты"}
                          </Badge>
                        </TableCell>
                        <TableCell>{debt.notes}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination for Debts */}
          {totalPagesDebts > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPageDebts > 1) setCurrentPageDebts(currentPageDebts - 1);
                    }}
                    className={currentPageDebts === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {Array.from({ length: totalPagesDebts }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPageDebts(page);
                      }}
                      isActive={currentPageDebts === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPageDebts < totalPagesDebts) setCurrentPageDebts(currentPageDebts + 1);
                    }}
                    className={currentPageDebts === totalPagesDebts ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}


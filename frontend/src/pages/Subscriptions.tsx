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
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Calendar, Snowflake, CheckCircle2, XCircle } from "lucide-react";
import { 
  useSubscriptionTypes, 
  useCreateSubscriptionType, 
  useUpdateSubscriptionType, 
  useDeleteSubscriptionType,
  useAllSubscriptions,
  useCreateStudentSubscription,
  useUpdateSubscription,
  useStudents,
  useLessons,
} from "@/hooks/useData";
import { SubscriptionType, StudentSubscription } from "@/types";
import moment from "moment";
import "moment/locale/ru";

moment.locale("ru");

export default function Subscriptions() {
  const { data: subscriptionTypes = [], isLoading: typesLoading } = useSubscriptionTypes();
  const { data: subscriptions = [], isLoading: subscriptionsLoading } = useAllSubscriptions();
  const { data: students = [] } = useStudents();
  const { data: lessons = [] } = useLessons();
  
  const createType = useCreateSubscriptionType();
  const updateType = useUpdateSubscriptionType();
  const deleteType = useDeleteSubscriptionType();
  const createSubscription = useCreateStudentSubscription();
  const updateSubscription = useUpdateSubscription();

  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<SubscriptionType | null>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<StudentSubscription | null>(null);
  const [billingTypeFilter, setBillingTypeFilter] = useState<string>("all");

  // Statistics
  const activeSubscriptions = subscriptions.filter(s => s.status === "active").length;
  const expiredSubscriptions = subscriptions.filter(s => s.status === "expired").length;
  const frozenSubscriptions = subscriptions.filter(s => s.status === "frozen").length;
  const totalLessonsRemaining = subscriptions
    .filter(s => s.status === "active")
    .reduce((sum, s) => sum + s.lessonsRemaining, 0);
  
  // Filter subscription types by billing type
  const filteredTypes = subscriptionTypes.filter(type => 
    billingTypeFilter === "all" || type.billingType === billingTypeFilter
  );
  
  const billingTypeLabels = {
    per_lesson: "Поурочный",
    monthly: "Помесячный",
    unlimited: "Безлимитный",
  } as const;
  
  const billingTypeColors = {
    per_lesson: "bg-blue-100 text-blue-800",
    monthly: "bg-green-100 text-green-800",
    unlimited: "bg-purple-100 text-purple-800",
  } as const;

  const handleTypeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const typeData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      lessonsCount: parseInt(formData.get("lessonsCount") as string),
      price: parseFloat(formData.get("price") as string),
      validityDays: formData.get("validityDays") ? parseInt(formData.get("validityDays") as string) : undefined,
      canFreeze: formData.get("canFreeze") === "on",
    };

    if (selectedType) {
      await updateType.mutateAsync({ id: selectedType.id, data: typeData });
    } else {
      await createType.mutateAsync(typeData);
    }

    setIsTypeDialogOpen(false);
    setSelectedType(null);
  };

  const handleSubscriptionSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const subscriptionData = {
      studentId: formData.get("studentId") as string,
      subscriptionTypeId: formData.get("subscriptionTypeId") as string,
      lessonsRemaining: parseInt(formData.get("lessonsRemaining") as string),
      startDate: new Date(formData.get("startDate") as string).toISOString(),
      endDate: formData.get("endDate") ? new Date(formData.get("endDate") as string).toISOString() : undefined,
      status: (formData.get("status") as any) || "active",
      freezeDaysRemaining: parseInt(formData.get("freezeDaysRemaining") as string) || 0,
    };

    if (selectedSubscription) {
      await updateSubscription.mutateAsync({ id: selectedSubscription.id, data: subscriptionData });
    } else {
      await createSubscription.mutateAsync(subscriptionData);
    }

    setIsSubscriptionDialogOpen(false);
    setSelectedSubscription(null);
  };

  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    return student?.name || studentId;
  };

  const getTypeName = (typeId: string) => {
    const type = subscriptionTypes.find(t => t.id === typeId);
    return type?.name || typeId;
  };

  if (typesLoading || subscriptionsLoading) {
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
          <h1 className="text-3xl font-bold">Абонементы</h1>
          <p className="text-muted-foreground">Управление абонементами и посещаемостью</p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активные</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">Абонементов</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Истекшие</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expiredSubscriptions}</div>
            <p className="text-xs text-muted-foreground">Абонементов</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Заморожено</CardTitle>
            <Snowflake className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{frozenSubscriptions}</div>
            <p className="text-xs text-muted-foreground">Абонементов</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Осталось уроков</CardTitle>
            <Calendar className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLessonsRemaining}</div>
            <p className="text-xs text-muted-foreground">Всего</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="subscriptions">
        <TabsList>
          <TabsTrigger value="subscriptions">Абонементы студентов</TabsTrigger>
          <TabsTrigger value="types">Типы абонементов</TabsTrigger>
        </TabsList>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Абонементы студентов</h2>
            <Dialog open={isSubscriptionDialogOpen} onOpenChange={(open) => { setIsSubscriptionDialogOpen(open); if (!open) setSelectedSubscription(null); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Выдать абонемент
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{selectedSubscription ? "Редактировать абонемент" : "Новый абонемент"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubscriptionSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="studentId">Студент</Label>
                    <Select name="studentId" defaultValue={selectedSubscription?.studentId} required>
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
                    <Label htmlFor="subscriptionTypeId">Тип абонемента</Label>
                    <Select name="subscriptionTypeId" defaultValue={selectedSubscription?.subscriptionTypeId} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тип" />
                      </SelectTrigger>
                      <SelectContent>
                        {subscriptionTypes.map(type => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name} ({type.lessonsCount} уроков, {type.price.toLocaleString()} ₸)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="lessonsRemaining">Осталось уроков</Label>
                    <Input id="lessonsRemaining" name="lessonsRemaining" type="number" defaultValue={selectedSubscription?.lessonsRemaining} required />
                  </div>
                  <div>
                    <Label htmlFor="startDate">Дата начала</Label>
                    <Input 
                      id="startDate" 
                      name="startDate" 
                      type="date" 
                      defaultValue={selectedSubscription?.startDate ? moment(selectedSubscription.startDate).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD")}
                      required 
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">Дата окончания (необязательно)</Label>
                    <Input 
                      id="endDate" 
                      name="endDate" 
                      type="date" 
                      defaultValue={selectedSubscription?.endDate ? moment(selectedSubscription.endDate).format("YYYY-MM-DD") : ""}
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Статус</Label>
                    <Select name="status" defaultValue={selectedSubscription?.status || "active"}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Активный</SelectItem>
                        <SelectItem value="frozen">Заморожен</SelectItem>
                        <SelectItem value="expired">Истёк</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="freezeDaysRemaining">Осталось дней заморозки</Label>
                    <Input id="freezeDaysRemaining" name="freezeDaysRemaining" type="number" defaultValue={selectedSubscription?.freezeDaysRemaining || 0} />
                  </div>
                  <Button type="submit" className="w-full">{selectedSubscription ? "Сохранить" : "Создать"}</Button>
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
                    <TableHead>Тип</TableHead>
                    <TableHead>Уроков осталось</TableHead>
                    <TableHead>Период</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Заморозка</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Нет абонементов
                      </TableCell>
                    </TableRow>
                  ) : (
                    subscriptions.map(subscription => (
                      <TableRow key={subscription.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedSubscription(subscription); setIsSubscriptionDialogOpen(true); }}>
                        <TableCell>{getStudentName(subscription.studentId)}</TableCell>
                        <TableCell>{getTypeName(subscription.subscriptionTypeId)}</TableCell>
                        <TableCell className="font-medium">{subscription.lessonsRemaining}</TableCell>
                        <TableCell>
                          {moment(subscription.startDate).format("DD.MM.YYYY")} - {subscription.endDate ? moment(subscription.endDate).format("DD.MM.YYYY") : "∞"}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              subscription.status === "active" ? "default" : 
                              subscription.status === "frozen" ? "secondary" : 
                              "destructive"
                            }
                          >
                            {subscription.status === "active" ? "Активный" : subscription.status === "frozen" ? "Заморожен" : "Истёк"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {subscription.freezeDaysRemaining > 0 ? (
                            <span className="text-sm text-blue-600">{subscription.freezeDaysRemaining} дней</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Types Tab */}
        <TabsContent value="types" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Типы абонементов</h2>
            <div className="flex gap-3 items-center">
              <Select value={billingTypeFilter} onValueChange={setBillingTypeFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Все типы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  <SelectItem value="per_lesson">Поурочный</SelectItem>
                  <SelectItem value="monthly">Помесячный</SelectItem>
                  <SelectItem value="unlimited">Безлимитный</SelectItem>
                </SelectContent>
              </Select>
              <Dialog open={isTypeDialogOpen} onOpenChange={(open) => { setIsTypeDialogOpen(open); if (!open) setSelectedType(null); }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Создать тип
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{selectedType ? "Редактировать тип" : "Новый тип абонемента"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleTypeSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Название</Label>
                      <Input id="name" name="name" defaultValue={selectedType?.name} required />
                    </div>
                    <div>
                      <Label htmlFor="description">Описание</Label>
                      <Input id="description" name="description" defaultValue={selectedType?.description} />
                    </div>
                    <div>
                      <Label htmlFor="lessonsCount">Количество уроков</Label>
                      <Input id="lessonsCount" name="lessonsCount" type="number" defaultValue={selectedType?.lessonsCount} required />
                    </div>
                    <div>
                      <Label htmlFor="price">Цена (₸)</Label>
                      <Input id="price" name="price" type="number" step="0.01" defaultValue={selectedType?.price} required />
                    </div>
                    <div>
                      <Label htmlFor="validityDays">Срок действия (дней, необязательно)</Label>
                      <Input id="validityDays" name="validityDays" type="number" defaultValue={selectedType?.validityDays} placeholder="Неограничено" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="canFreeze" name="canFreeze" defaultChecked={selectedType?.canFreeze} />
                      <Label htmlFor="canFreeze">Можно замораживать</Label>
                    </div>
                    <Button type="submit" className="w-full">{selectedType ? "Сохранить" : "Создать"}</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTypes.length === 0 ? (
              <p className="text-muted-foreground col-span-full text-center py-8">
                {billingTypeFilter === "all" ? "Нет типов абонементов" : "Нет типов с выбранной тарификацией"}
              </p>
            ) : (
              filteredTypes.map(type => (
                <Card key={type.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => { setSelectedType(type); setIsTypeDialogOpen(true); }}>
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${billingTypeColors[type.billingType]}`}>
                        {billingTypeLabels[type.billingType]}
                      </span>
                      {type.canFreeze && <Snowflake className="h-4 w-4 text-blue-500" />}
                    </div>
                    <CardTitle>{type.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-2">{type.price.toLocaleString()} ₸</div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {type.lessonsCount} уроков
                      </div>
                      <div>Цена за урок: {(type.price / type.lessonsCount).toFixed(0)} ₸</div>
                      <div>Срок: {type.validityDays ? `${type.validityDays} дней` : "Неограничено"}</div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}


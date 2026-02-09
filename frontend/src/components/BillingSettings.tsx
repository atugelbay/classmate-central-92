import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { licenseAPI, LicenseWithUsage, Plan } from "@/api/license";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  Crown, Users, UserCog, BookOpen, Building2, 
  AlertCircle, Loader2, ArrowRight,
  Check
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function BillingSettings() {
  const [licenseData, setLicenseData] = useState<LicenseWithUsage | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showChangePlanDialog, setShowChangePlanDialog] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [isChanging, setIsChanging] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [licenseResponse, plansResponse] = await Promise.all([
        licenseAPI.getCurrentLicense(),
        licenseAPI.getPlans(),
      ]);
      setLicenseData(licenseResponse);
      // Ensure plansResponse is an array
      setPlans(Array.isArray(plansResponse) ? plansResponse : []);
      if (licenseResponse.license) {
        setSelectedPlanId(licenseResponse.license.planId);
      }
    } catch (error) {
      toast.error("Не удалось загрузить данные о тарифе");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePlan = async () => {
    if (!selectedPlanId) return;
    
    setIsChanging(true);
    try {
      await licenseAPI.selectPlan(selectedPlanId);
      toast.success("Тариф успешно изменен!");
      setShowChangePlanDialog(false);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Ошибка при смене тарифа");
    } finally {
      setIsChanging(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("kk-KZ", {
      style: "currency",
      currency: "KZT",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      active: { label: "Активен", variant: "default" },
      trial: { label: "Пробный", variant: "secondary" },
      suspended: { label: "Приостановлен", variant: "destructive" },
      cancelled: { label: "Отменен", variant: "outline" },
      expired: { label: "Истек", variant: "destructive" },
    };
    const config = statusConfig[status] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const calculateUsagePercent = (current: number, max: number | undefined) => {
    if (!max) return 0; // Unlimited
    return Math.min((current / max) * 100, 100);
  };

  const getUsageColor = (percent: number) => {
    if (percent >= 90) return "bg-red-500";
    if (percent >= 70) return "bg-amber-500";
    return "bg-green-500";
  };

  const getDaysRemaining = () => {
    if (!licenseData?.license) return 0;
    const endDate = new Date(licenseData.license.currentPeriodEnd);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!licenseData?.license) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Тариф не выбран
          </CardTitle>
          <CardDescription>
            У вашей компании еще не выбран тариф. Выберите подходящий тариф для продолжения работы.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => navigate("/")}>
            Перейти в личный кабинет
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { license, usage } = licenseData;
  const daysRemaining = getDaysRemaining();

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Crown className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{license.planName}</CardTitle>
                <CardDescription>Текущий тариф</CardDescription>
              </div>
            </div>
            {getStatusBadge(license.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Стоимость</div>
              <div className="text-2xl font-bold">{formatPrice(license.priceMonthly)}</div>
              <div className="text-sm text-muted-foreground">в месяц</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Период действия</div>
              <div className="text-lg font-medium">
                {formatDate(license.currentPeriodStart)}
              </div>
              <div className="text-sm text-muted-foreground">
                до {formatDate(license.currentPeriodEnd)}
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Осталось дней</div>
              <div className={`text-2xl font-bold ${daysRemaining <= 7 ? "text-red-500" : ""}`}>
                {daysRemaining}
              </div>
              {daysRemaining <= 7 && (
                <div className="text-sm text-red-500">Скоро истекает!</div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setShowChangePlanDialog(true)}>
              Сменить тариф
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Использование лимитов</CardTitle>
          <CardDescription>
            Текущее использование ресурсов в рамках вашего тарифа
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Students */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Ученики</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {usage.studentsCount} / {license.maxStudents || "∞"}
              </span>
            </div>
            {license.maxStudents && (
              <Progress 
                value={calculateUsagePercent(usage.studentsCount, license.maxStudents)} 
                className="h-2"
              />
            )}
          </div>

          {/* Users */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCog className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Пользователи системы</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {usage.usersCount} / {license.maxUsers || "∞"}
              </span>
            </div>
            {license.maxUsers && (
              <Progress 
                value={calculateUsagePercent(usage.usersCount, license.maxUsers)} 
                className="h-2"
              />
            )}
          </div>

          {/* Teachers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Преподаватели</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {usage.teachersCount} / {license.maxTeachers || "∞"}
              </span>
            </div>
            {license.maxTeachers && (
              <Progress 
                value={calculateUsagePercent(usage.teachersCount, license.maxTeachers)} 
                className="h-2"
              />
            )}
          </div>

          {/* Branches */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Филиалы</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {usage.branchesCount} / {license.maxBranches || "∞"}
              </span>
            </div>
            {license.maxBranches && (
              <Progress 
                value={calculateUsagePercent(usage.branchesCount, license.maxBranches)} 
                className="h-2"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Features Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Доступные функции</CardTitle>
          <CardDescription>
            Функции, включенные в ваш тариф
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(license.planFeatures || {}).map(([key, value]) => (
              <div 
                key={key} 
                className={`flex items-center gap-2 p-3 rounded-lg ${
                  value ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-400"
                }`}
              >
                <Check className={`h-4 w-4 ${value ? "text-green-500" : "text-gray-300"}`} />
                <span className="text-sm">{getFeatureLabel(key)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Change Plan Dialog */}
      <Dialog open={showChangePlanDialog} onOpenChange={setShowChangePlanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Сменить тариф</DialogTitle>
            <DialogDescription>
              Выберите новый тариф для вашей компании
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите тариф" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{plan.name}</span>
                      <span className="text-muted-foreground ml-2">
                        {formatPrice(plan.priceMonthly)}/мес
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedPlanId && selectedPlanId !== license.planId && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  После смены тарифа новые лимиты вступят в силу немедленно.
                  При переходе на более низкий тариф убедитесь, что текущее использование 
                  не превышает новые лимиты.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangePlanDialog(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleChangePlan} 
              disabled={isChanging || selectedPlanId === license.planId}
            >
              {isChanging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Подтвердить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper function to get feature labels
function getFeatureLabel(key: string): string {
  const labels: Record<string, string> = {
    groups: "Групповые занятия",
    individual: "Индивидуальные занятия",
    schedule: "Расписание",
    attendance: "Посещаемость",
    finance: "Финансы",
    subscriptions: "Абонементы",
    reports: "Отчеты",
    leads: "Лиды и воронка",
    advanced_analytics: "Расширенная аналитика",
    priority_support: "Приоритетная поддержка",
    custom_reports: "Кастомные отчеты",
    dedicated_manager: "Персональный менеджер",
    custom_integration: "Кастомная интеграция",
  };
  return labels[key] || key;
}

export default BillingSettings;

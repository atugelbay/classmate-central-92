import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { licenseAPI, Plan } from "@/api/license";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { GraduationCap, Check, X, Crown, Sparkles, Users, Building2, BookOpen, UserCog, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Feature display configuration
const featureLabels: Record<string, string> = {
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

export default function SelectPlan() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const data = await licenseAPI.getPlans();
      // Ensure data is an array
      setPlans(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Не удалось загрузить тарифы");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    
    // Enterprise is free for 1 month promo
    if (plan.id === "enterprise") {
      handleConfirmPlan(plan);
    } else {
      setShowPaymentDialog(true);
    }
  };

  const handleConfirmPlan = async (plan: Plan) => {
    setIsSubmitting(true);
    
    try {
      // Get token from localStorage (set during registration)
      const token = localStorage.getItem("token");
      
      if (!token) {
        // If no token, user needs to login first
        toast.success("Тариф выбран! Войдите в систему для активации.");
        // Store selected plan for later
        localStorage.setItem("selectedPlanId", plan.id);
        navigate("/login");
        return;
      }

      await licenseAPI.selectPlan(plan.id);
      toast.success(`Тариф "${plan.name}" успешно активирован!`);
      navigate("/login");
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Token expired or invalid - redirect to login
        localStorage.setItem("selectedPlanId", plan.id);
        toast.info("Войдите в систему для активации тарифа");
        navigate("/login");
      } else {
        toast.error(error.response?.data?.error || "Ошибка при выборе тарифа");
      }
    } finally {
      setIsSubmitting(false);
      setShowPaymentDialog(false);
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

  const formatLimit = (limit: number | undefined) => {
    if (limit === undefined || limit === null) return "Безлимит";
    return limit.toLocaleString();
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case "standard":
        return <Users className="h-6 w-6" />;
      case "professional":
        return <BookOpen className="h-6 w-6" />;
      case "business":
        return <Building2 className="h-6 w-6" />;
      case "enterprise":
        return <Crown className="h-6 w-6" />;
      default:
        return <Users className="h-6 w-6" />;
    }
  };

  const getPlanColor = (planId: string) => {
    switch (planId) {
      case "standard":
        return "bg-slate-100 text-slate-700";
      case "professional":
        return "bg-blue-100 text-blue-700";
      case "business":
        return "bg-violet-100 text-violet-700";
      case "enterprise":
        return "bg-amber-100 text-amber-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-indigo-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <GraduationCap className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Выберите тариф
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Выберите подходящий тариф для вашего учебного центра. 
            Все тарифы включают основные функции CRM.
          </p>
        </div>

        {/* Promo Banner */}
        <div className="mb-8 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-6 text-white text-center shadow-lg">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-6 w-6" />
            <span className="text-xl font-bold">Специальное предложение!</span>
            <Sparkles className="h-6 w-6" />
          </div>
          <p className="text-lg">
            Тариф <strong>Enterprise</strong> бесплатно на 1 месяц для новых клиентов
          </p>
          <p className="text-sm opacity-90 mt-1">
            Все функции без ограничений. Никаких обязательств.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative flex flex-col ${
                plan.id === "enterprise" 
                  ? "border-2 border-amber-400 shadow-xl" 
                  : plan.id === "professional"
                  ? "border-2 border-blue-400"
                  : ""
              }`}
            >
              {/* Badges */}
              {plan.id === "professional" && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500">
                  Рекомендуем
                </Badge>
              )}
              {plan.id === "enterprise" && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500">
                  1 месяц бесплатно
                </Badge>
              )}

              <CardHeader className="text-center pb-2">
                <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-3 ${getPlanColor(plan.id)}`}>
                  {getPlanIcon(plan.id)}
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription className="text-sm min-h-[40px]">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-grow">
                {/* Price */}
                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-gray-900">
                    {plan.id === "enterprise" ? (
                      <span className="line-through text-gray-400 text-xl">
                        {formatPrice(plan.priceMonthly)}
                      </span>
                    ) : (
                      formatPrice(plan.priceMonthly)
                    )}
                  </div>
                  {plan.id === "enterprise" && (
                    <div className="text-2xl font-bold text-green-600">
                      Бесплатно
                    </div>
                  )}
                  <div className="text-sm text-gray-500">в месяц</div>
                </div>

                {/* Limits */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Ученики</span>
                    <span className="font-medium">{formatLimit(plan.maxStudents)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Пользователи</span>
                    <span className="font-medium">{formatLimit(plan.maxUsers)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Преподаватели</span>
                    <span className="font-medium">{formatLimit(plan.maxTeachers)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Филиалы</span>
                    <span className="font-medium">{formatLimit(plan.maxBranches)}</span>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-2">
                  {Object.entries(plan.features || {}).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      {value ? (
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-gray-300 flex-shrink-0" />
                      )}
                      <span className={value ? "text-gray-700" : "text-gray-400"}>
                        {featureLabels[key] || key}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.id === "enterprise" ? "default" : "outline"}
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isSubmitting}
                >
                  {isSubmitting && selectedPlan?.id === plan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {plan.id === "enterprise" ? "Начать бесплатно" : "Выбрать"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Comparison Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-center">Сравнение тарифов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Функция</th>
                    {plans.map((plan) => (
                      <th key={plan.id} className="text-center py-3 px-4">
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium">Цена/месяц</td>
                    {plans.map((plan) => (
                      <td key={plan.id} className="text-center py-3 px-4">
                        {plan.id === "enterprise" ? (
                          <span className="text-green-600 font-bold">Бесплатно*</span>
                        ) : (
                          formatPrice(plan.priceMonthly)
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium">Активные ученики</td>
                    {plans.map((plan) => (
                      <td key={plan.id} className="text-center py-3 px-4">
                        {formatLimit(plan.maxStudents)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium">Пользователи системы</td>
                    {plans.map((plan) => (
                      <td key={plan.id} className="text-center py-3 px-4">
                        {formatLimit(plan.maxUsers)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium">Преподаватели</td>
                    {plans.map((plan) => (
                      <td key={plan.id} className="text-center py-3 px-4">
                        {formatLimit(plan.maxTeachers)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium">Филиалы</td>
                    {plans.map((plan) => (
                      <td key={plan.id} className="text-center py-3 px-4">
                        {formatLimit(plan.maxBranches)}
                      </td>
                    ))}
                  </tr>
                  {Object.keys(featureLabels).map((featureKey) => (
                    <tr key={featureKey} className="border-b">
                      <td className="py-3 px-4">{featureLabels[featureKey]}</td>
                      {plans.map((plan) => (
                        <td key={plan.id} className="text-center py-3 px-4">
                          {plan.features?.[featureKey] ? (
                            <Check className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-gray-300 mx-auto" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 text-center mt-4">
              * Enterprise бесплатно на 1 месяц для новых клиентов
            </p>
          </CardContent>
        </Card>

        {/* Contact info */}
        <div className="text-center text-gray-600">
          <p className="mb-2">Нужна помощь с выбором тарифа?</p>
          <p>
            Свяжитесь с нами: <a href="mailto:support@smartcrm.kz" className="text-primary hover:underline">support@smartcrm.kz</a>
          </p>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Оплата тарифа</DialogTitle>
            <DialogDescription>
              {selectedPlan && (
                <div className="mt-4 space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{selectedPlan.name}</span>
                      <span className="font-bold">{formatPrice(selectedPlan.priceMonthly)}/мес</span>
                    </div>
                    <p className="text-sm text-gray-600">{selectedPlan.description}</p>
                  </div>
                  
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Sparkles className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-800">Онлайн-оплата скоро будет доступна</p>
                        <p className="text-sm text-amber-700 mt-1">
                          Мы работаем над интеграцией с платежными системами (Kassa24, Kaspi Pay и др.). 
                          Пока вы можете связаться с нами для оформления подписки.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center text-sm text-gray-600">
                    <p>Для оплаты свяжитесь с нами:</p>
                    <p className="font-medium">+7 (777) 123-45-67</p>
                    <p>support@smartcrm.kz</p>
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Отмена
            </Button>
            <Button onClick={() => handleConfirmPlan(selectedPlan!)}>
              Связаться позже, начать пробный
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

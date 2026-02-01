import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow, isPast, isBefore, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  CreditCard,
  Search,
  Plus,
  MoreHorizontal,
  Calendar,
  Users,
  GraduationCap,
  Building2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { licensesApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface License {
  id: number;
  company_id: string;
  company_name: string;
  plan_id: string;
  plan_name: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
  students_count: number;
  users_count: number;
  max_students: number | null;
  max_users: number | null;
  notes: string | null;
  created_at: string;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  max_students: number | null;
  max_users: number | null;
  max_teachers: number | null;
  max_branches: number | null;
}

interface LicenseStats {
  total: number;
  active: number;
  trial: number;
  suspended: number;
  expired: number;
  expiringSoon: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  active: { label: 'Активна', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  trial: { label: 'Пробный', color: 'bg-blue-100 text-blue-800', icon: Clock },
  suspended: { label: 'Приостановлена', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
  cancelled: { label: 'Отменена', color: 'bg-red-100 text-red-800', icon: XCircle },
  expired: { label: 'Истекла', color: 'bg-gray-100 text-gray-800', icon: XCircle },
};

export default function Licenses() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [planFilter, setPlanFilter] = useState<string>('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [formData, setFormData] = useState({
    companyId: '',
    planId: '',
    status: 'active',
    periodMonths: 1,
    notes: '',
  });
  const [editData, setEditData] = useState({
    planId: '',
    status: '',
    extendMonths: 0,
    notes: '',
  });

  // Queries
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['license-stats'],
    queryFn: () => licensesApi.getStats(),
  });

  const { data: licensesData, isLoading: licensesLoading } = useQuery({
    queryKey: ['licenses', page, search, statusFilter, planFilter],
    queryFn: () => licensesApi.getAll({
      page,
      limit: 20,
      search: search || undefined,
      status: statusFilter || undefined,
      plan_id: planFilter || undefined,
    }),
  });

  const { data: plansData } = useQuery({
    queryKey: ['plans'],
    queryFn: () => licensesApi.getPlans(),
  });

  const { data: unassignedData } = useQuery({
    queryKey: ['unassigned-companies'],
    queryFn: () => licensesApi.getUnassigned(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: licensesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      queryClient.invalidateQueries({ queryKey: ['license-stats'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-companies'] });
      setIsCreateOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ companyId, data }: { companyId: string; data: Parameters<typeof licensesApi.update>[1] }) =>
      licensesApi.update(companyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      queryClient.invalidateQueries({ queryKey: ['license-stats'] });
      setIsEditOpen(false);
      setSelectedLicense(null);
    },
  });

  const extendMutation = useMutation({
    mutationFn: ({ companyId, months }: { companyId: string; months: number }) =>
      licensesApi.extend(companyId, months),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: licensesApi.suspend,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      queryClient.invalidateQueries({ queryKey: ['license-stats'] });
    },
  });

  const activateMutation = useMutation({
    mutationFn: licensesApi.activate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      queryClient.invalidateQueries({ queryKey: ['license-stats'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: licensesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      queryClient.invalidateQueries({ queryKey: ['license-stats'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-companies'] });
    },
  });

  const stats: LicenseStats = statsData?.data || {
    total: 0,
    active: 0,
    trial: 0,
    suspended: 0,
    expired: 0,
    expiringSoon: 0,
  };

  const licenses: License[] = licensesData?.data || [];
  const plans: Plan[] = plansData?.data || [];
  const unassignedCompanies = unassignedData?.data || [];
  const totalPages = licensesData?.totalPages || 1;

  const resetForm = () => {
    setFormData({
      companyId: '',
      planId: '',
      status: 'active',
      periodMonths: 1,
      notes: '',
    });
  };

  const handleCreate = () => {
    if (!formData.companyId || !formData.planId) return;
    createMutation.mutate(formData);
  };

  const handleEdit = (license: License) => {
    setSelectedLicense(license);
    setEditData({
      planId: license.plan_id,
      status: license.status,
      extendMonths: 0,
      notes: license.notes || '',
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedLicense) return;
    const updatePayload: Parameters<typeof licensesApi.update>[1] = {};
    
    if (editData.planId !== selectedLicense.plan_id) {
      updatePayload.planId = editData.planId;
    }
    if (editData.status !== selectedLicense.status) {
      updatePayload.status = editData.status;
    }
    if (editData.extendMonths > 0) {
      updatePayload.extendMonths = editData.extendMonths;
    }
    if (editData.notes !== (selectedLicense.notes || '')) {
      updatePayload.notes = editData.notes;
    }

    updateMutation.mutate({ companyId: selectedLicense.company_id, data: updatePayload });
  };

  const isExpiringSoon = (endDate: string) => {
    const end = new Date(endDate);
    const warningDate = addDays(new Date(), 7);
    return isBefore(end, warningDate) && !isPast(end);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price) + ' ₸';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Лицензии</h1>
          <p className="text-muted-foreground">Управление лицензиями компаний</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} disabled={unassignedCompanies.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Назначить лицензию
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.total}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активные</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Пробные</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.trial}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Приостановлены</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.suspended}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Истекшие</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Скоро истекут</CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.expiringSoon}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию компании..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter || 'all'} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Все статусы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="active">Активные</SelectItem>
            <SelectItem value="trial">Пробные</SelectItem>
            <SelectItem value="suspended">Приостановлены</SelectItem>
            <SelectItem value="expired">Истекшие</SelectItem>
            <SelectItem value="cancelled">Отменены</SelectItem>
          </SelectContent>
        </Select>
        <Select value={planFilter || 'all'} onValueChange={(v) => { setPlanFilter(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Все тарифы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все тарифы</SelectItem>
            {plans.map((plan) => (
              <SelectItem key={plan.id} value={plan.id}>
                {plan.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(statusFilter || planFilter || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('');
              setPlanFilter('');
              setSearch('');
              setPage(1);
            }}
          >
            <X className="h-4 w-4 mr-2" />
            Сбросить
          </Button>
        )}
      </div>

      {/* Licenses Table */}
      <Card>
        <CardContent className="p-0">
          {licensesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : licenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CreditCard className="h-12 w-12 mb-4" />
              <p>Лицензии не найдены</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">Компания</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Тариф</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Статус</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Использование</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Истекает</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {licenses.map((license) => {
                    const StatusIcon = statusConfig[license.status]?.icon || Clock;
                    const expiringSoon = isExpiringSoon(license.current_period_end);
                    const isExpired = isPast(new Date(license.current_period_end));
                    
                    return (
                      <tr key={license.id} className="border-b hover:bg-muted/25">
                        <td className="px-4 py-3">
                          <div className="font-medium">{license.company_name}</div>
                          <div className="text-xs text-muted-foreground">{license.company_id}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{license.plan_name}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusConfig[license.status]?.color || 'bg-gray-100'}`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig[license.status]?.label || license.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1" title="Студенты">
                              <GraduationCap className="h-4 w-4 text-muted-foreground" />
                              {license.students_count}
                              {license.max_students && (
                                <span className="text-muted-foreground">/ {license.max_students}</span>
                              )}
                            </span>
                            <span className="flex items-center gap-1" title="Пользователи">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              {license.users_count}
                              {license.max_users && (
                                <span className="text-muted-foreground">/ {license.max_users}</span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className={`text-sm ${isExpired ? 'text-red-600' : expiringSoon ? 'text-orange-600' : ''}`}>
                            {format(new Date(license.current_period_end), 'dd.MM.yyyy')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {isExpired ? (
                              <span className="text-red-600">Истекла</span>
                            ) : (
                              formatDistanceToNow(new Date(license.current_period_end), {
                                addSuffix: true,
                                locale: ru,
                              })
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(license)}>
                                Редактировать
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => extendMutation.mutate({ companyId: license.company_id, months: 1 })}
                              >
                                Продлить на 1 месяц
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => extendMutation.mutate({ companyId: license.company_id, months: 3 })}
                              >
                                Продлить на 3 месяца
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {license.status === 'active' && (
                                <DropdownMenuItem
                                  onClick={() => suspendMutation.mutate(license.company_id)}
                                  className="text-yellow-600"
                                >
                                  Приостановить
                                </DropdownMenuItem>
                              )}
                              {license.status === 'suspended' && (
                                <DropdownMenuItem
                                  onClick={() => activateMutation.mutate(license.company_id)}
                                  className="text-green-600"
                                >
                                  Активировать
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  if (confirm('Удалить лицензию? Это действие нельзя отменить.')) {
                                    deleteMutation.mutate(license.company_id);
                                  }
                                }}
                                className="text-red-600"
                              >
                                Удалить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Страница {page} из {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create License Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Назначить лицензию</DialogTitle>
            <DialogDescription>
              Выберите компанию и тариф для назначения лицензии
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Компания</Label>
              <Select value={formData.companyId} onValueChange={(v) => setFormData({ ...formData, companyId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите компанию" />
                </SelectTrigger>
                <SelectContent>
                  {unassignedCompanies.map((company: { id: string; name: string }) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Тариф</Label>
              <Select value={formData.planId} onValueChange={(v) => setFormData({ ...formData, planId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тариф" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      <div className="flex items-center justify-between gap-4">
                        <span>{plan.name}</span>
                        <span className="text-muted-foreground">{formatPrice(plan.price_monthly)}/мес</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Статус</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Активна</SelectItem>
                  <SelectItem value="trial">Пробный период</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Период (месяцев)</Label>
              <Select
                value={formData.periodMonths.toString()}
                onValueChange={(v) => setFormData({ ...formData, periodMonths: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 месяц</SelectItem>
                  <SelectItem value="3">3 месяца</SelectItem>
                  <SelectItem value="6">6 месяцев</SelectItem>
                  <SelectItem value="12">12 месяцев</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Заметки</Label>
              <Textarea
                placeholder="Дополнительные заметки..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending || !formData.companyId || !formData.planId}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit License Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать лицензию</DialogTitle>
            <DialogDescription>
              {selectedLicense?.company_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Тариф</Label>
              <Select value={editData.planId} onValueChange={(v) => setEditData({ ...editData, planId: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      <div className="flex items-center justify-between gap-4">
                        <span>{plan.name}</span>
                        <span className="text-muted-foreground">{formatPrice(plan.price_monthly)}/мес</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Статус</Label>
              <Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Активна</SelectItem>
                  <SelectItem value="trial">Пробный период</SelectItem>
                  <SelectItem value="suspended">Приостановлена</SelectItem>
                  <SelectItem value="cancelled">Отменена</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Продлить на</Label>
              <Select
                value={editData.extendMonths.toString()}
                onValueChange={(v) => setEditData({ ...editData, extendMonths: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Не продлевать</SelectItem>
                  <SelectItem value="1">+1 месяц</SelectItem>
                  <SelectItem value="3">+3 месяца</SelectItem>
                  <SelectItem value="6">+6 месяцев</SelectItem>
                  <SelectItem value="12">+12 месяцев</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Заметки</Label>
              <Textarea
                placeholder="Дополнительные заметки..."
                value={editData.notes}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

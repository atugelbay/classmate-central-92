import { useState } from "react";
import {
  useLeads,
  useCreateLead,
  useUpdateLead,
  useDeleteLead,
  useLeadStats,
  useLeadActivities,
  useLeadTasks,
  useAddLeadActivity,
  useCreateLeadTask,
  useUpdateLeadTask,
} from "@/hooks/useData";
import { Lead, LeadStatus, LeadSource } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatCard } from "@/components/StatCard";
import {
  Plus,
  Phone,
  Mail,
  Calendar,
  Loader2,
  Trash2,
  Edit,
  MessageSquare,
  CheckSquare,
  UserPlus,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import moment from "moment";
import "moment/locale/ru";

moment.locale("ru");

const statusLabels: Record<LeadStatus, string> = {
  new: "Новый",
  in_progress: "В работе",
  enrolled: "Записан",
  rejected: "Отказ",
};

const sourceLabels: Record<LeadSource, string> = {
  call: "Звонок",
  website: "Сайт",
  social: "Соцсети",
  referral: "Рекомендация",
  other: "Другое",
};

const statusColors: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-800 border-blue-200",
  in_progress: "bg-yellow-100 text-yellow-800 border-yellow-200",
  enrolled: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
};

export default function Leads() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  
  // Drag and drop states
  const [draggingLead, setDraggingLead] = useState<Lead | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<LeadStatus | null>(null);

  const { data: leads = [], isLoading } = useLeads();
  const { data: stats } = useLeadStats();
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();

  const handleCreateLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const leadData = {
      name: formData.get("name") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      source: formData.get("source") as LeadSource,
      status: "new" as LeadStatus,
      notes: formData.get("notes") as string,
    };

    try {
      await createLead.mutateAsync(leadData);
      setIsCreateDialogOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleStatusChange = async (lead: Lead, newStatus: LeadStatus) => {
    try {
      // Передаем все данные лида, не только статус
      await updateLead.mutateAsync({
        id: lead.id,
        data: {
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          source: lead.source,
          status: newStatus,
          notes: lead.notes,
        },
      });
      toast.success(`Статус изменен на "${statusLabels[newStatus]}"`);
    } catch (error) {
      toast.error("Ошибка при изменении статуса");
    }
  };

  const handleDelete = async () => {
    if (!deleteLeadId) return;
    try {
      await deleteLead.mutateAsync(deleteLeadId);
      setDeleteLeadId(null);
      if (selectedLead?.id === deleteLeadId) {
        setIsDetailsDialogOpen(false);
        setSelectedLead(null);
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  const openDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDetailsDialogOpen(true);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    setDraggingLead(lead);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", e.currentTarget.innerHTML);
  };

  const handleDragEnd = () => {
    setDraggingLead(null);
    setDragOverStatus(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (status: LeadStatus) => {
    setDragOverStatus(status);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the container, not a child
    if (e.currentTarget === e.target) {
      setDragOverStatus(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, newStatus: LeadStatus) => {
    e.preventDefault();
    
    if (!draggingLead || draggingLead.status === newStatus) {
      setDraggingLead(null);
      setDragOverStatus(null);
      return;
    }

    try {
      // Передаем все данные лида, не только статус
      await updateLead.mutateAsync({
        id: draggingLead.id,
        data: {
          name: draggingLead.name,
          phone: draggingLead.phone,
          email: draggingLead.email,
          source: draggingLead.source,
          status: newStatus,
          notes: draggingLead.notes,
        },
      });
      toast.success(`Лид перемещен в "${statusLabels[newStatus]}"`);
    } catch (error) {
      toast.error("Ошибка при перемещении лида");
    }

    setDraggingLead(null);
    setDragOverStatus(null);
  };

  const groupedLeads: Record<LeadStatus, Lead[]> = {
    new: [],
    in_progress: [],
    enrolled: [],
    rejected: [],
  };

  leads.forEach((lead) => {
    groupedLeads[lead.status].push(lead);
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Лиды</h1>
          <p className="text-muted-foreground">
            Управление потенциальными клиентами
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Добавить лид
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новый лид</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateLead} className="space-y-4">
              <div>
                <Label htmlFor="name">Имя *</Label>
                <Input id="name" name="name" required />
              </div>
              <div>
                <Label htmlFor="phone">Телефон *</Label>
                <Input id="phone" name="phone" type="tel" required />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" />
              </div>
              <div>
                <Label htmlFor="source">Источник *</Label>
                <Select name="source" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите источник" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(sourceLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Заметки</Label>
                <Textarea id="notes" name="notes" rows={3} />
              </div>
              <Button type="submit" className="w-full">
                Создать лид
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="Всего лидов"
            value={stats.totalLeads}
            icon={UserPlus}
          />
          <StatCard
            title="Новые"
            value={stats.newLeads}
            icon={UserPlus}
          />
          <StatCard
            title="В работе"
            value={stats.inProgressLeads}
            icon={MessageSquare}
          />
          <StatCard
            title="Записано"
            value={stats.enrolledLeads}
            icon={CheckSquare}
          />
          <StatCard
            title="Конверсия"
            value={`${stats.conversionRate.toFixed(1)}%`}
            icon={TrendingUp}
          />
        </div>
      )}

      {/* Kanban Board */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Object.entries(groupedLeads).map(([status, statusLeads]) => (
          <Card 
            key={status} 
            className={`flex flex-col transition-colors ${
              dragOverStatus === status ? 'ring-2 ring-primary bg-primary/5' : ''
            }`}
            onDragOver={handleDragOver}
            onDragEnter={() => handleDragEnter(status as LeadStatus)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status as LeadStatus)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>{statusLabels[status as LeadStatus]}</span>
                <Badge variant="outline">{statusLeads.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-3 overflow-y-auto max-h-[600px]">
              {statusLeads.map((lead) => (
                <Card
                  key={lead.id}
                  draggable
                  className={`cursor-move hover:shadow-md transition-all border-l-4 select-none ${
                    statusColors[lead.status]
                  } ${draggingLead?.id === lead.id ? 'opacity-50 scale-95' : ''}`}
                  onClick={() => openDetails(lead)}
                  onDragStart={(e) => handleDragStart(e, lead)}
                  onDragEnd={handleDragEnd}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <h4 className="font-semibold pointer-events-none">{lead.name}</h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteLeadId(lead.id);
                        }}
                        onDragStart={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground pointer-events-none">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        {lead.phone}
                      </div>
                      {lead.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          {lead.email}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs pointer-events-none">
                      {sourceLabels[lead.source]}
                    </Badge>
                    <div className="text-xs text-muted-foreground pointer-events-none">
                      {moment(lead.createdAt).fromNow()}
                    </div>
                    {status !== "enrolled" && status !== "rejected" && (
                      <div className="pt-2" onDragStart={(e) => e.stopPropagation()}>
                        <Select
                          value={lead.status}
                          onValueChange={(value) => {
                            handleStatusChange(lead, value as LeadStatus);
                          }}
                        >
                          <SelectTrigger
                            className="h-8 text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {statusLeads.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Нет лидов
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lead Details Dialog */}
      {selectedLead && (
        <LeadDetailsDialog
          lead={selectedLead}
          isOpen={isDetailsDialogOpen}
          onClose={() => {
            setIsDetailsDialogOpen(false);
            setSelectedLead(null);
          }}
          onUpdate={(data) => {
            updateLead.mutate({ id: selectedLead.id, data });
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteLeadId} onOpenChange={() => setDeleteLeadId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить лид?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Лид будет удален безвозвратно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Lead Details Dialog Component
function LeadDetailsDialog({
  lead,
  isOpen,
  onClose,
  onUpdate,
}: {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (data: Partial<Lead>) => void;
}) {
  const [activeTab, setActiveTab] = useState<"info" | "activities" | "tasks">("info");
  const { data: activities = [] } = useLeadActivities(lead.id);
  const { data: tasks = [] } = useLeadTasks(lead.id);
  const addActivity = useAddLeadActivity();
  const createTask = useCreateLeadTask();
  const updateTask = useUpdateLeadTask();

  const handleAddActivity = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    await addActivity.mutateAsync({
      leadId: lead.id,
      activity: {
        activityType: formData.get("activityType") as any,
        description: formData.get("description") as string,
      },
    });
    
    e.currentTarget.reset();
  };

  const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const dueDate = formData.get("dueDate") as string;
    
    await createTask.mutateAsync({
      leadId: lead.id,
      task: {
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        status: "pending",
      },
    });
    
    e.currentTarget.reset();
  };

  const handleToggleTask = (taskId: number, currentStatus: string) => {
    updateTask.mutate({
      leadId: lead.id,
      taskId,
      task: { status: currentStatus === "completed" ? "pending" : "completed" },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Детали лида: {lead.name}</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <button
            className={`px-4 py-2 ${activeTab === "info" ? "border-b-2 border-primary font-semibold" : ""}`}
            onClick={() => setActiveTab("info")}
          >
            Информация
          </button>
          <button
            className={`px-4 py-2 ${activeTab === "activities" ? "border-b-2 border-primary font-semibold" : ""}`}
            onClick={() => setActiveTab("activities")}
          >
            Активности ({activities.length})
          </button>
          <button
            className={`px-4 py-2 ${activeTab === "tasks" ? "border-b-2 border-primary font-semibold" : ""}`}
            onClick={() => setActiveTab("tasks")}
          >
            Задачи ({tasks.filter(t => t.status === "pending").length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {activeTab === "info" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Телефон</Label>
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {lead.phone}
                  </p>
                </div>
                {lead.email && (
                  <div>
                    <Label className="text-sm font-semibold">Email</Label>
                    <p className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {lead.email}
                    </p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-semibold">Источник</Label>
                  <p>{sourceLabels[lead.source]}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Статус</Label>
                  <Badge className={statusColors[lead.status]}>
                    {statusLabels[lead.status]}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Создан</Label>
                  <p>{moment(lead.createdAt).format("DD.MM.YYYY HH:mm")}</p>
                </div>
              </div>
              {lead.notes && (
                <div>
                  <Label className="text-sm font-semibold">Заметки</Label>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {lead.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "activities" && (
            <div className="space-y-4">
              <form onSubmit={handleAddActivity} className="space-y-3 border p-4 rounded">
                <h4 className="font-semibold">Добавить активность</h4>
                <Select name="activityType" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Тип активности" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Звонок</SelectItem>
                    <SelectItem value="meeting">Встреча</SelectItem>
                    <SelectItem value="note">Заметка</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea name="description" placeholder="Описание" required rows={2} />
                <Button type="submit" size="sm">Добавить</Button>
              </form>

              <div className="space-y-2">
                {activities.map((activity) => (
                  <Card key={activity.id}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge variant="outline" className="mb-2">
                            {activity.activityType === "call" && "Звонок"}
                            {activity.activityType === "meeting" && "Встреча"}
                            {activity.activityType === "note" && "Заметка"}
                            {activity.activityType === "email" && "Email"}
                          </Badge>
                          <p className="text-sm">{activity.description}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {moment(activity.createdAt).fromNow()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {activities.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Нет активностей
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === "tasks" && (
            <div className="space-y-4">
              <form onSubmit={handleCreateTask} className="space-y-3 border p-4 rounded">
                <h4 className="font-semibold">Создать задачу</h4>
                <Input name="title" placeholder="Название задачи" required />
                <Textarea name="description" placeholder="Описание" rows={2} />
                <Input name="dueDate" type="datetime-local" />
                <Button type="submit" size="sm">Создать задачу</Button>
              </form>

              <div className="space-y-2">
                {tasks.map((task) => (
                  <Card key={task.id}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={task.status === "completed"}
                          onChange={() => handleToggleTask(task.id, task.status)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p className={`font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-sm text-muted-foreground">{task.description}</p>
                          )}
                          {task.dueDate && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Calendar className="h-3 w-3" />
                              {moment(task.dueDate).format("DD.MM.YYYY HH:mm")}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {tasks.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Нет задач
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


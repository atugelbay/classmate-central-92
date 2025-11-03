import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AttendanceChart } from "./AttendanceChart";
import { TodaySchedule } from "./TodaySchedule";
import { QuickActions } from "./QuickActions";
import { FinancialSummary } from "./FinancialSummary";
import { StudentStatistics } from "./StudentStatistics";
import { RecentPayments } from "./RecentPayments";
import { Button } from "@/components/ui/button";
import { Settings, GripVertical } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface Widget {
  id: string;
  name: string;
  component: React.ComponentType;
  visible: boolean;
  gridClass: string;
}

const STORAGE_KEY = "dashboard-widgets-config";

const defaultWidgets: Widget[] = [
  {
    id: "today-schedule",
    name: "Уроки на сегодня",
    component: TodaySchedule,
    visible: true,
    gridClass: "col-span-1 md:col-span-1 lg:col-span-1",
  },
  {
    id: "financial-summary",
    name: "Финансовая сводка",
    component: FinancialSummary,
    visible: true,
    gridClass: "col-span-1 md:col-span-1 lg:col-span-1",
  },
  {
    id: "attendance-chart",
    name: "Посещаемость",
    component: AttendanceChart,
    visible: true,
    gridClass: "col-span-1 md:col-span-1 lg:col-span-1",
  },
  {
    id: "student-statistics",
    name: "Статистика учеников",
    component: StudentStatistics,
    visible: true,
    gridClass: "col-span-1 md:col-span-1 lg:col-span-1",
  },
  {
    id: "recent-payments",
    name: "Последние платежи",
    component: RecentPayments,
    visible: true,
    gridClass: "col-span-1 md:col-span-1 lg:col-span-1",
  },
  {
    id: "quick-actions",
    name: "Быстрые действия",
    component: QuickActions,
    visible: true,
    gridClass: "col-span-1 md:col-span-1 lg:col-span-1",
  },
];

interface SortableWidgetProps {
  widget: Widget;
  isDragging?: boolean;
}

function SortableWidget({ widget, isDragging }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Component = widget.component;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${widget.gridClass} relative group h-full`}
      {...attributes}
    >
      <div
        {...listeners}
        className="absolute top-2 right-2 z-10 cursor-move opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-background/80 rounded-lg border"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="h-full">
        <Component />
      </div>
    </div>
  );
}

export function DashboardGrid() {
  const [widgets, setWidgets] = useState<Widget[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        
        // Restore saved widgets in saved order
        const restoredWidgets: Widget[] = [];
        const savedIds = new Set<string>();
        
        // First, add all saved widgets in their saved order
        parsed.forEach((savedWidget: Widget) => {
          const defaultWidget = defaultWidgets.find(w => w.id === savedWidget.id);
          if (defaultWidget) {
            // Merge saved preferences with default component reference
            restoredWidgets.push({ 
              ...defaultWidget, 
              visible: savedWidget.visible,
              gridClass: savedWidget.gridClass || defaultWidget.gridClass
            });
            savedIds.add(savedWidget.id);
          }
        });
        
        // Then, add any new widgets that weren't in saved config
        defaultWidgets.forEach(defaultWidget => {
          if (!savedIds.has(defaultWidget.id)) {
            restoredWidgets.push(defaultWidget);
          }
        });
        
        return restoredWidgets;
      } catch (e) {
        console.error('Error loading dashboard config:', e);
        return defaultWidgets;
      }
    }
    return defaultWidgets;
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    // Save only necessary data (not component references)
    const widgetsToSave = widgets.map(w => ({
      id: w.id,
      name: w.name,
      visible: w.visible,
      gridClass: w.gridClass,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgetsToSave));
    console.log('Dashboard config saved:', widgetsToSave);
  }, [widgets]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
      toast.success("Расположение виджетов сохранено");
    }
  };

  const toggleWidgetVisibility = (widgetId: string) => {
    setWidgets((items) =>
      items.map((item) =>
        item.id === widgetId ? { ...item, visible: !item.visible } : item
      )
    );
  };

  const resetToDefaults = () => {
    setWidgets(defaultWidgets);
    localStorage.removeItem(STORAGE_KEY);
    toast.success("Настройки Dashboard сброшены");
  };

  const visibleWidgets = widgets.filter((w) => w.visible);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Аналитика и обзор вашего учебного центра
          </p>
        </div>
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              Настройки виджетов
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Настройки Dashboard</DialogTitle>
              <DialogDescription>
                Выберите, какие виджеты отображать на главной странице. Вы также можете
                перетаскивать виджеты для изменения их порядка.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {widgets.map((widget) => (
                <div key={widget.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={widget.id}
                    checked={widget.visible}
                    onCheckedChange={() => toggleWidgetVisibility(widget.id)}
                  />
                  <Label
                    htmlFor={widget.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {widget.name}
                  </Label>
                </div>
              ))}
              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={resetToDefaults}
                  className="w-full"
                >
                  Сбросить к настройкам по умолчанию
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={visibleWidgets.map((w) => w.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[500px]">
            {visibleWidgets.map((widget) => (
              <SortableWidget key={widget.id} widget={widget} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}


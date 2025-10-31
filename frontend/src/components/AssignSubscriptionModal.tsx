import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubscriptionType, BillingType, Student, Group, Teacher } from "@/types";
import { getSubscriptionTypes, createStudentSubscription } from "@/api/subscriptions";
import { groupsAPI } from "@/api/groups";
import { teachersAPI } from "@/api/teachers";
import { Calendar, DollarSign, BookOpen, Clock, User, Users, AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface AssignSubscriptionModalProps {
  open: boolean;
  onClose: () => void;
  student: Student;
  onSuccess: () => void;
}

const billingTypeLabels: Record<BillingType, string> = {
  per_lesson: "Поурочный",
  monthly: "Помесячный",
  unlimited: "Безлимитный",
};

const billingTypeColors: Record<BillingType, string> = {
  per_lesson: "bg-blue-100 text-blue-800",
  monthly: "bg-green-100 text-green-800",
  unlimited: "bg-purple-100 text-purple-800",
};

export default function AssignSubscriptionModal({
  open,
  onClose,
  student,
  onSuccess,
}: AssignSubscriptionModalProps) {
  const [subscriptionTypes, setSubscriptionTypes] = useState<SubscriptionType[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [selectedType, setSelectedType] = useState<SubscriptionType | null>(null);
  
  // Customization options
  const [customMode, setCustomMode] = useState(false);
  const [totalLessons, setTotalLessons] = useState<number>(0);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [pricePerLesson, setPricePerLesson] = useState<number>(0);
  
  // Assignment
  const [groupId, setGroupId] = useState<string>("");
  const [teacherId, setTeacherId] = useState<string>("");
  
  // Dates
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>("");
  const [validityDays, setValidityDays] = useState<number>(0);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  useEffect(() => {
    if (selectedTypeId) {
      const type = subscriptionTypes.find(t => t.id === selectedTypeId);
      setSelectedType(type || null);
      
      if (type) {
        setTotalLessons(type.lessonsCount);
        setTotalPrice(type.price);
        setPricePerLesson(type.lessonsCount > 0 ? type.price / type.lessonsCount : 0);
        setValidityDays(type.validityDays || 0);
        
        // Calculate end date
        if (type.validityDays) {
          const end = new Date();
          end.setDate(end.getDate() + type.validityDays);
          setEndDate(end.toISOString().split('T')[0]);
        }
      }
    }
  }, [selectedTypeId, subscriptionTypes]);

  useEffect(() => {
    // Recalculate price per lesson when lessons or total price changes
    if (customMode && totalLessons > 0) {
      setPricePerLesson(totalPrice / totalLessons);
    }
  }, [totalLessons, totalPrice, customMode]);

  useEffect(() => {
    // Calculate end date based on validity days
    if (validityDays > 0) {
      const start = new Date(startDate);
      start.setDate(start.getDate() + validityDays);
      setEndDate(start.toISOString().split('T')[0]);
    }
  }, [validityDays, startDate]);

  const loadData = async () => {
    try {
      const [types, groups, teachers] = await Promise.all([
        getSubscriptionTypes(),
        groupsAPI.getAll(),
        teachersAPI.getAll(),
      ]);
      
      setSubscriptionTypes(types);
      setGroups(groups);
      setTeachers(teachers);
    } catch (err: any) {
      setError("Ошибка загрузки данных");
      console.error(err);
    }
  };

  const handleSubmit = async () => {
    if (!selectedTypeId && !customMode) {
      setError("Выберите тип абонемента");
      return;
    }

    if (totalLessons <= 0) {
      setError("Укажите количество занятий");
      return;
    }

    if (totalPrice <= 0) {
      setError("Укажите стоимость");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Convert dates to ISO 8601 format with time (YYYY-MM-DDTHH:MM:SSZ)
      const formatDateForBackend = (dateStr: string) => {
        if (!dateStr) return undefined;
        return `${dateStr}T00:00:00Z`;
      };

      const data = {
        studentId: student.id,
        subscriptionTypeId: customMode ? undefined : selectedTypeId,
        groupId: groupId || undefined,
        teacherId: teacherId || undefined,
        // Note: lessonsRemaining is computed field (total_lessons - used_lessons), don't send it
        totalLessons,
        usedLessons: 0,
        totalPrice,
        pricePerLesson,
        startDate: formatDateForBackend(startDate),
        endDate: formatDateForBackend(endDate),
        status: "active" as const,
        freezeDaysRemaining: 0,
      } as any;

      await createStudentSubscription(data);
      onSuccess();
      onClose();
      resetForm();
    } catch (err: any) {
      setError(err.response?.data?.error || "Ошибка создания абонемента");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedTypeId("");
    setSelectedType(null);
    setCustomMode(false);
    setTotalLessons(0);
    setTotalPrice(0);
    setPricePerLesson(0);
    setGroupId("");
    setTeacherId("");
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate("");
    setValidityDays(0);
    setError("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Назначить абонемент: {student.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Custom Mode Toggle */}
          <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
            <Switch
              id="custom-mode"
              checked={customMode}
              onCheckedChange={setCustomMode}
            />
            <Label htmlFor="custom-mode" className="cursor-pointer">
              Создать индивидуальный абонемент (без шаблона)
            </Label>
          </div>

          {/* Select Subscription Type */}
          {!customMode && (
            <div className="space-y-2">
              <Label htmlFor="subscription-type">Тип абонемента *</Label>
              <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тип абонемента" />
                </SelectTrigger>
                <SelectContent>
                  {subscriptionTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${billingTypeColors[type.billingType]}`}>
                          {billingTypeLabels[type.billingType]}
                        </span>
                        <span>{type.name}</span>
                        <span className="text-gray-500">
                          ({type.lessonsCount} занятий - {type.price.toLocaleString()} ₸)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedType && (
                <div className="p-3 bg-blue-50 rounded-lg text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 rounded text-xs ${billingTypeColors[selectedType.billingType]}`}>
                      {billingTypeLabels[selectedType.billingType]}
                    </span>
                    <span className="font-medium">{selectedType.name}</span>
                  </div>
                  <p className="text-gray-600">{selectedType.description}</p>
                  <div className="mt-2 space-y-1">
                    <p>• Занятий: {selectedType.lessonsCount}</p>
                    <p>• Стоимость: {selectedType.price.toLocaleString()} ₸</p>
                    <p>• Цена за занятие: {(selectedType.price / selectedType.lessonsCount).toFixed(0)} ₸</p>
                    {selectedType.validityDays && <p>• Срок действия: {selectedType.validityDays} дней</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Customization Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Total Lessons */}
            <div className="space-y-2">
              <Label htmlFor="total-lessons">
                <BookOpen className="inline w-4 h-4 mr-1" />
                Количество занятий *
              </Label>
              <Input
                id="total-lessons"
                type="number"
                min="1"
                value={totalLessons}
                onChange={(e) => setTotalLessons(parseInt(e.target.value) || 0)}
                disabled={!customMode && !selectedTypeId}
              />
            </div>

            {/* Total Price */}
            <div className="space-y-2">
              <Label htmlFor="total-price">
                <DollarSign className="inline w-4 h-4 mr-1" />
                Общая стоимость *
              </Label>
              <Input
                id="total-price"
                type="number"
                min="0"
                step="100"
                value={totalPrice}
                onChange={(e) => setTotalPrice(parseFloat(e.target.value) || 0)}
                disabled={!customMode && !selectedTypeId}
              />
            </div>

            {/* Price Per Lesson (Read-only) */}
            <div className="space-y-2">
              <Label>
                <DollarSign className="inline w-4 h-4 mr-1" />
                Цена за занятие
              </Label>
              <Input
                value={pricePerLesson.toFixed(2)}
                disabled
                className="bg-gray-50"
              />
            </div>

            {/* Validity Days */}
            <div className="space-y-2">
              <Label htmlFor="validity-days">
                <Clock className="inline w-4 h-4 mr-1" />
                Срок действия (дней)
              </Label>
              <Input
                id="validity-days"
                type="number"
                min="0"
                value={validityDays}
                onChange={(e) => setValidityDays(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Assignment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Group */}
            <div className="space-y-2">
              <Label htmlFor="group">
                <Users className="inline w-4 h-4 mr-1" />
                Группа (опционально)
              </Label>
              <Select value={groupId || "none"} onValueChange={(val) => setGroupId(val === "none" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Без группы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без группы</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name} ({group.subject})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Teacher */}
            <div className="space-y-2">
              <Label htmlFor="teacher">
                <User className="inline w-4 h-4 mr-1" />
                Преподаватель (опционально)
              </Label>
              <Select value={teacherId || "none"} onValueChange={(val) => setTeacherId(val === "none" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Без преподавателя" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без преподавателя</SelectItem>
                  {teachers.filter(t => t.status === "active").map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name} ({teacher.subject})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="start-date">
                <Calendar className="inline w-4 h-4 mr-1" />
                Дата начала *
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label htmlFor="end-date">
                <Calendar className="inline w-4 h-4 mr-1" />
                Дата окончания
              </Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Summary */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-semibold mb-2">Итого:</h4>
            <div className="space-y-1 text-sm">
              <p>• Занятий: <span className="font-semibold">{totalLessons}</span></p>
              <p>• Стоимость: <span className="font-semibold">{totalPrice.toLocaleString()} ₸</span></p>
              <p>• За занятие: <span className="font-semibold">{pricePerLesson.toFixed(0)} ₸</span></p>
              {selectedType && (
                <p>• Тип: <span className={`px-2 py-0.5 rounded text-xs ${billingTypeColors[selectedType.billingType]}`}>
                  {billingTypeLabels[selectedType.billingType]}
                </span></p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Создание..." : "Создать абонемент"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


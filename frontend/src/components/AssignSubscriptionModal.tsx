import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubscriptionType, BillingType, Student, Group, Teacher, Discount, StudentDiscount } from "@/types";
import { getSubscriptionTypes, createStudentSubscription } from "@/api/subscriptions";
import { groupsAPI } from "@/api/groups";
import { teachersAPI } from "@/api/teachers";
import { useStudentDiscounts, useDiscounts } from "@/hooks/useData";
import { Calendar, DollarSign, BookOpen, Clock, User, Users, AlertCircle, ChevronsUpDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface AssignSubscriptionModalProps {
  open: boolean;
  onClose: () => void;
  student: Student;
  onSuccess: () => void;
}

const billingTypeColors: Record<BillingType, string> = {
  per_lesson: "bg-blue-100 text-blue-800",
  monthly: "bg-green-100 text-green-800",
  unlimited: "bg-purple-100 text-purple-800",
};

// Calculate final price with discounts applied
function calculatePriceWithDiscounts(basePrice: number, discounts: Discount[]): { finalPrice: number; discountAmount: number } {
  if (!discounts || discounts.length === 0) {
    return { finalPrice: basePrice, discountAmount: 0 };
  }

  let finalPrice = basePrice;
  let totalDiscount = 0;

  // Filter active discounts and check expiration
  const now = new Date();
  const activeDiscounts = discounts.filter(d => {
    if (!d.isActive) return false;
    // Check expiration if exists (assuming StudentDiscount has expiresAt)
    return true; // We'll filter expired discounts when we get student discounts
  });

  // Separate percentage and fixed discounts
  const percentageDiscounts = activeDiscounts.filter(d => d.type === "percentage");
  const fixedDiscounts = activeDiscounts.filter(d => d.type === "fixed");

  // Apply percentage discounts first
  for (const d of percentageDiscounts) {
    if (d.value > 0 && d.value <= 100) {
      const discountAmount = finalPrice * (d.value / 100);
      finalPrice = Math.max(0, finalPrice - discountAmount);
      totalDiscount += discountAmount;
    }
  }

  // Apply fixed discounts after percentage
  for (const d of fixedDiscounts) {
    if (d.value > 0) {
      const discountAmount = Math.min(finalPrice, d.value);
      finalPrice = Math.max(0, finalPrice - discountAmount);
      totalDiscount += discountAmount;
    }
  }

  return { finalPrice, discountAmount: totalDiscount };
}

export default function AssignSubscriptionModal({
  open,
  onClose,
  student,
  onSuccess,
}: AssignSubscriptionModalProps) {
  const { t } = useTranslation("subscriptions");
  
  const billingTypeLabels: Record<BillingType, string> = {
    per_lesson: t("billingTypes.per_lesson"),
    monthly: t("billingTypes.monthly"),
    unlimited: t("billingTypes.unlimited"),
  };

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
  const [templateComboboxOpen, setTemplateComboboxOpen] = useState(false);
  const [groupComboboxOpen, setGroupComboboxOpen] = useState(false);
  const [teacherComboboxOpen, setTeacherComboboxOpen] = useState(false);

  // Get student discounts
  const { data: studentDiscounts = [] } = useStudentDiscounts(student.id);
  const { data: allDiscounts = [] } = useDiscounts();

  // Get active discounts for the student
  const activeDiscounts = useMemo(() => {
    const now = new Date();
    return studentDiscounts
      .filter((sd: StudentDiscount) => {
        if (!sd.isActive) return false;
        // Check expiration
        if (sd.expiresAt) {
          const expiresAt = new Date(sd.expiresAt);
          if (expiresAt < now) return false;
        }
        return true;
      })
      .map((sd: StudentDiscount) => allDiscounts.find((d: Discount) => d.id === sd.discountId))
      .filter((d): d is Discount => d !== undefined && d.isActive);
  }, [studentDiscounts, allDiscounts]);

  // Calculate final price with discounts
  const priceCalculation = useMemo(() => {
    return calculatePriceWithDiscounts(totalPrice, activeDiscounts);
  }, [totalPrice, activeDiscounts]);

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
      setError(t("errors.loadError"));
      console.error(err);
    }
  };

  const handleSubmit = async () => {
    if (!selectedTypeId && !customMode) {
      setError(t("errors.selectType"));
      return;
    }

    if (totalLessons <= 0) {
      setError(t("errors.setLessons"));
      return;
    }

    if (totalPrice <= 0) {
      setError(t("errors.setPrice"));
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

      // Send original price - backend will apply discounts
      const data = {
        studentId: student.id,
        subscriptionTypeId: customMode ? undefined : selectedTypeId,
        groupId: groupId || undefined,
        teacherId: teacherId || undefined,
        // Note: lessonsRemaining is computed field (total_lessons - used_lessons), don't send it
        totalLessons,
        usedLessons: 0,
        totalPrice, // Send original price, backend will apply discounts
        pricePerLesson, // Will be recalculated by backend
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
      setError(err.response?.data?.error || t("errors.createError"));
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
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {t("assignSubscription")}: {student.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-2 -mr-2">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Custom Mode Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <Label htmlFor="custom-mode" className="cursor-pointer text-sm">
              {t("customMode")}
            </Label>
            <Switch
              id="custom-mode"
              checked={customMode}
              onCheckedChange={setCustomMode}
            />
          </div>

          {/* Select template */}
          {!customMode && (
            <div className="space-y-1.5">
              <Label htmlFor="subscription-type">{t("template")} *</Label>
              <Popover open={templateComboboxOpen} onOpenChange={setTemplateComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={templateComboboxOpen}
                    className="w-full justify-between font-normal"
                  >
                    {selectedTypeId
                      ? (() => {
                          const type = subscriptionTypes.find((x) => x.id === selectedTypeId);
                          return type
                            ? `${type.name} — ${type.lessonsCount} × ${(type.price / type.lessonsCount).toFixed(0)} ₸`
                            : t("selectType");
                        })()
                      : t("selectType")}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl" align="start">
                  <Command>
                    <CommandInput placeholder={t("searchTemplate")} className="border-0 border-b rounded-t-xl" />
                    <CommandList>
                      <CommandEmpty>{t("noTemplatesFound")}</CommandEmpty>
                      <CommandGroup>
                        {subscriptionTypes.map((type) => (
                          <CommandItem
                            key={type.id}
                            value={`${type.name} ${billingTypeLabels[type.billingType]} ${type.lessonsCount} ${type.price}`}
                            onSelect={() => {
                              setSelectedTypeId(type.id);
                              setTemplateComboboxOpen(false);
                            }}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] ${billingTypeColors[type.billingType]}`}>
                                {billingTypeLabels[type.billingType]}
                              </span>
                              <span className="truncate">{type.name}</span>
                              <span className="text-muted-foreground text-xs shrink-0">
                                {type.lessonsCount} × {(type.price / type.lessonsCount).toFixed(0)} ₸
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Lessons & Price - One row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="total-lessons">{t("lessonsCount")} *</Label>
              <Input
                id="total-lessons"
                type="number"
                min="1"
                placeholder="8"
                value={totalLessons || ""}
                onChange={(e) => setTotalLessons(parseInt(e.target.value) || 0)}
                disabled={!customMode && !selectedTypeId}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="total-price">{t("totalPrice")} *</Label>
              <Input
                id="total-price"
                type="number"
                min="0"
                step="100"
                placeholder="40000"
                value={totalPrice || ""}
                onChange={(e) => setTotalPrice(parseFloat(e.target.value) || 0)}
                disabled={!customMode && !selectedTypeId}
              />
            </div>
          </div>

          {/* Price per lesson - Readonly computed field */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800/50">
            <span className="text-xs text-slate-500">{t("pricePerLesson")}</span>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {totalLessons > 0 ? `${pricePerLesson.toFixed(0)} ₸` : "—"}
            </span>
          </div>

          {/* Group & Teacher - One row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="group">{t("group")}</Label>
              <Popover open={groupComboboxOpen} onOpenChange={setGroupComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={groupComboboxOpen}
                    className="w-full justify-between font-normal"
                  >
                    {groupId ? groups.find((g) => g.id === groupId)?.name ?? t("notSelected") : t("notSelected")}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl" align="start">
                  <Command>
                    <CommandInput placeholder={t("searchGroup")} className="border-0 border-b rounded-t-xl" />
                    <CommandList>
                      <CommandEmpty>{t("noGroupsFound")}</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="__none__"
                          onSelect={() => {
                            setGroupId("");
                            setGroupComboboxOpen(false);
                          }}
                        >
                          {t("notSelected")}
                        </CommandItem>
                        {groups.map((group) => (
                          <CommandItem
                            key={group.id}
                            value={`${group.name} ${group.subject ?? ""}`}
                            onSelect={() => {
                              setGroupId(group.id);
                              setGroupComboboxOpen(false);
                            }}
                          >
                            {group.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="teacher">{t("teacher")}</Label>
              <Popover open={teacherComboboxOpen} onOpenChange={setTeacherComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={teacherComboboxOpen}
                    className="w-full justify-between font-normal"
                  >
                    {teacherId ? teachers.find((teach) => teach.id === teacherId)?.name ?? t("notSelectedMale") : t("notSelectedMale")}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl" align="start">
                  <Command>
                    <CommandInput placeholder={t("searchTeacher")} className="border-0 border-b rounded-t-xl" />
                    <CommandList>
                      <CommandEmpty>{t("noTeachersFound")}</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="__none__"
                          onSelect={() => {
                            setTeacherId("");
                            setTeacherComboboxOpen(false);
                          }}
                        >
                          {t("notSelectedMale")}
                        </CommandItem>
                        {teachers.filter((teach) => teach.status === "active").map((teacher) => (
                          <CommandItem
                            key={teacher.id}
                            value={teacher.name}
                            onSelect={() => {
                              setTeacherId(teacher.id);
                              setTeacherComboboxOpen(false);
                            }}
                          >
                            {teacher.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Start & End Date - One row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start-date">{t("startDate")} *</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end-date">{t("endDate")}</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Validity days */}
          <div className="space-y-1.5">
            <Label htmlFor="validity-days">{t("validityDays")}</Label>
            <Input
              id="validity-days"
              type="number"
              min="0"
              placeholder="30"
              value={validityDays || ""}
              onChange={(e) => setValidityDays(parseInt(e.target.value) || 0)}
            />
          </div>

          {/* Modern Summary - Just text, no heavy blocks */}
          {(totalLessons > 0 || totalPrice > 0) && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("totalToPay")}</p>
                  {priceCalculation.discountAmount > 0 && (
                    <p className="text-xs text-emerald-600">
                      {t("discount")}: -{priceCalculation.discountAmount.toLocaleString()} ₸
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {priceCalculation.discountAmount > 0 ? (
                    <>
                      <p className="text-xs text-muted-foreground line-through">{totalPrice.toLocaleString()} ₸</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {priceCalculation.finalPrice.toLocaleString()} ₸
                      </p>
                    </>
                  ) : (
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {totalPrice.toLocaleString()} ₸
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {totalLessons} {t("lessons")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 space-y-2 pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
          <Button 
            onClick={handleSubmit} 
            disabled={loading} 
            className="w-full bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#a855f7] hover:opacity-90 text-white shadow-md"
          >
            {loading ? t("creating") : t("createSubscription")}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={loading} className="w-full text-muted-foreground">
            {t("cancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


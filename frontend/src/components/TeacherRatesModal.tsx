import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { TeacherRate } from "@/types";
import { useTeacherRates, useCreateTeacherRate, useUpdateTeacherRate, useDeleteTeacherRate } from "@/hooks/useData";
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

interface TeacherRatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: string;
}

export function TeacherRatesModal({ open, onOpenChange, teacherId }: TeacherRatesModalProps) {
  const { t } = useTranslation(["teachers", "common"]);
  const { data: rates = [], isLoading } = useTeacherRates(teacherId);
  const createRate = useCreateTeacherRate();
  const updateRate = useUpdateTeacherRate();
  const deleteRate = useDeleteTeacherRate();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<TeacherRate | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    lessonType: "group" as "group" | "individual" | "special",
    rateType: "hourly" as "hourly" | "per_lesson",
    rateValue: "",
    isActive: true,
  });

  const handleOpenForm = (rate?: TeacherRate) => {
    if (rate) {
      setEditingRate(rate);
      setFormData({
        lessonType: rate.lessonType,
        rateType: rate.rateType,
        rateValue: rate.rateValue.toString(),
        isActive: rate.isActive,
      });
    } else {
      setEditingRate(null);
      setFormData({
        lessonType: "group",
        rateType: "hourly",
        rateValue: "",
        isActive: true,
      });
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingRate(null);
    setFormData({
      lessonType: "group",
      rateType: "hourly",
      rateValue: "",
      isActive: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const rateValue = parseFloat(formData.rateValue);
    if (isNaN(rateValue) || rateValue <= 0) {
      return;
    }

    try {
      if (editingRate) {
        await updateRate.mutateAsync({
          teacherId,
          rateId: editingRate.id,
          rate: {
            lessonType: formData.lessonType,
            rateType: formData.rateType,
            rateValue,
            isActive: formData.isActive,
          },
        });
      } else {
        await createRate.mutateAsync({
          teacherId,
          rate: {
            lessonType: formData.lessonType,
            rateType: formData.rateType,
            rateValue,
            isActive: formData.isActive,
          },
        });
      }
      handleCloseForm();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async (rateId: string) => {
    try {
      await deleteRate.mutateAsync({ teacherId, rateId });
      setDeleteConfirm(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const getLessonTypeLabel = (type: string) => {
    switch (type) {
      case "group":
        return t("rates.lessonTypes.group");
      case "individual":
        return t("rates.lessonTypes.individual");
      case "special":
        return t("rates.lessonTypes.special");
      default:
        return type;
    }
  };

  const getRateTypeLabel = (type: string) => {
    return type === "hourly" ? t("rates.rateTypes.hourly") : t("rates.rateTypes.per_lesson");
  };

  // Check if rate combination already exists (for validation)
  const rateExists = (lessonType: string, rateType: string, excludeId?: string) => {
    return rates.some(
      (r) =>
        r.isActive &&
        r.lessonType === lessonType &&
        r.rateType === rateType &&
        r.id !== excludeId
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("rates.title")}</DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => handleOpenForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("rates.addRate")}
                </Button>
              </div>

              {rates.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    {t("rates.noRates")}
                  </CardContent>
                </Card>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("rates.lessonType")}</TableHead>
                        <TableHead>{t("rates.rateType")}</TableHead>
                        <TableHead>{t("rates.value")}</TableHead>
                        <TableHead>{t("rates.status")}</TableHead>
                        <TableHead className="text-right">{t("rates.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rates.map((rate) => (
                        <TableRow key={rate.id}>
                          <TableCell>{getLessonTypeLabel(rate.lessonType)}</TableCell>
                          <TableCell>{getRateTypeLabel(rate.rateType)}</TableCell>
                          <TableCell className="font-semibold">
                            {rate.rateValue.toLocaleString()} ₸
                            <span className="text-xs text-muted-foreground ml-1">
                              /{rate.rateType === "hourly" ? t("rates.units.hour") : t("rates.units.lesson")}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={rate.isActive ? "default" : "secondary"}>
                              {rate.isActive ? t("rates.active") : t("rates.inactive")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenForm(rate)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteConfirm(rate.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Rate Form */}
      <Dialog open={isFormOpen} onOpenChange={(open) => !open && handleCloseForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRate ? t("rates.editRate") : t("rates.addRate")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="lessonType">{t("rates.lessonType")} *</Label>
              <Select
                value={formData.lessonType}
                onValueChange={(value: "group" | "individual" | "special") =>
                  setFormData({ ...formData, lessonType: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">{t("rates.lessonTypes.group")}</SelectItem>
                  <SelectItem value="individual">{t("rates.lessonTypes.individual")}</SelectItem>
                  <SelectItem value="special">{t("rates.lessonTypes.special")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="rateType">{t("rates.rateType")} *</Label>
              <Select
                value={formData.rateType}
                onValueChange={(value: "hourly" | "per_lesson") =>
                  setFormData({ ...formData, rateType: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">{t("rates.rateTypes.hourly")}</SelectItem>
                  <SelectItem value="per_lesson">{t("rates.rateTypes.per_lesson")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="rateValue">
                {t("rates.rateValue")} *
              </Label>
              <Input
                id="rateValue"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.rateValue}
                onChange={(e) => setFormData({ ...formData, rateValue: e.target.value })}
                placeholder={
                  formData.rateType === "hourly"
                    ? "2000"
                    : "2500"
                }
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.rateType === "hourly"
                  ? t("rates.hourlyDesc")
                  : t("rates.perLessonDesc")}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className="h-4 w-4"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                {t("rates.active")}
              </Label>
            </div>

            {!editingRate &&
              rateExists(formData.lessonType, formData.rateType) && (
                <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                  ⚠️ {t("rates.duplicateWarning")}
                </div>
              )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCloseForm}>
                {t("common:cancel")}
              </Button>
              <Button type="submit">
                {editingRate ? t("common:save") : t("common:add")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("rates.deleteRate")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("rates.deleteWarning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common:delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

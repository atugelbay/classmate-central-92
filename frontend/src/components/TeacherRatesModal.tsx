import { useState } from "react";
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
        return "Групповые";
      case "individual":
        return "Индивидуальные";
      case "special":
        return "Спец уроки";
      default:
        return type;
    }
  };

  const getRateTypeLabel = (type: string) => {
    return type === "hourly" ? "Почасовая" : "Поурочная";
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
            <DialogTitle>Управление ставками</DialogTitle>
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
                  Добавить ставку
                </Button>
              </div>

              {rates.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    Ставки не добавлены. Нажмите "Добавить ставку" чтобы создать первую ставку.
                  </CardContent>
                </Card>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Тип урока</TableHead>
                        <TableHead>Тип ставки</TableHead>
                        <TableHead>Значение</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead className="text-right">Действия</TableHead>
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
                              /{rate.rateType === "hourly" ? "час" : "урок"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={rate.isActive ? "default" : "secondary"}>
                              {rate.isActive ? "Активна" : "Неактивна"}
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
              {editingRate ? "Редактировать ставку" : "Добавить ставку"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="lessonType">Тип урока *</Label>
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
                  <SelectItem value="group">Групповые</SelectItem>
                  <SelectItem value="individual">Индивидуальные</SelectItem>
                  <SelectItem value="special">Спец уроки</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="rateType">Тип ставки *</Label>
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
                  <SelectItem value="hourly">Почасовая</SelectItem>
                  <SelectItem value="per_lesson">Поурочная</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="rateValue">
                Значение ставки (₸) *
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
                    ? "Например, 2000"
                    : "Например, 2500"
                }
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.rateType === "hourly"
                  ? "Стоимость одного часа"
                  : "Стоимость одного урока"}
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
                Активна
              </Label>
            </div>

            {!editingRate &&
              rateExists(formData.lessonType, formData.rateType) && (
                <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                  ⚠️ Активная ставка с таким типом урока и типом ставки уже существует.
                  Деактивируйте существующую или выберите другую комбинацию.
                </div>
              )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCloseForm}>
                Отмена
              </Button>
              <Button type="submit">
                {editingRate ? "Сохранить" : "Добавить"}
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
            <AlertDialogTitle>Удалить ставку?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Ставка будет удалена навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

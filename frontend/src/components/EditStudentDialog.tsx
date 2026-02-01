import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Student } from "@/types";
import { formatKzPhone, normalizeKzPhone } from "@/lib/phone";
import { useUpdateStudent } from "@/hooks/useData";
import { toast } from "sonner";

interface EditStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
}

export function EditStudentDialog({ open, onOpenChange, student }: EditStudentDialogProps) {
  const updateStudent = useUpdateStudent();
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    email: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name || "",
        age: student.age?.toString() || "",
        email: student.email || "",
        phone: student.phone || "",
        address: student.address || "",
      });
    }
  }, [student]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    try {
      await updateStudent.mutateAsync({
        id: student.id,
        data: {
          name: formData.name,
          age: parseInt(formData.age),
          email: formData.email,
          phone: normalizeKzPhone(formData.phone),
          address: formData.address,
        },
      });
      toast.success("Студент обновлен");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Ошибка: ${error.response?.data?.error || error.message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Редактировать студента</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Section: Личные данные */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Личные данные</h4>
            
            {/* Name - Full width */}
            <div className="space-y-1.5">
              <Label htmlFor="name">ФИО *</Label>
              <Input
                id="name"
                placeholder="Иван Иванов"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Age & Phone - Two columns */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="age">Возраст *</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="14"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Телефон *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+7 (777) 123-45-67"
                  value={formatKzPhone(formData.phone)}
                  onChange={(e) => {
                    const normalized = normalizeKzPhone(e.target.value);
                    setFormData({ ...formData, phone: normalized });
                  }}
                  required
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 dark:border-slate-800" />

          {/* Section: Контакты */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Контакты</h4>
            
            {/* Email & Address - Two columns */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ivan@mail.ru"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">Адрес</Label>
                <Input
                  id="address"
                  placeholder="ул. Абая, 10"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button 
              type="submit" 
              disabled={updateStudent.isPending}
              className="w-full bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#a855f7] hover:opacity-90 text-white shadow-md"
            >
              {updateStudent.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                "Сохранить изменения"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={updateStudent.isPending}
              className="w-full text-muted-foreground"
            >
              Отмена
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


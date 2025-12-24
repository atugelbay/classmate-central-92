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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Редактировать студента</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">ФИО *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="age">Возраст *</Label>
            <Input
              id="age"
              type="number"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div>
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
          <div>
            <Label htmlFor="address">Адрес</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateStudent.isPending}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={updateStudent.isPending}>
              {updateStudent.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                "Сохранить"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


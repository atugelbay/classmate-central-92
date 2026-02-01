import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Trash2, Loader2, Building2 } from "lucide-react";
import { useRooms, useCreateRoom, useUpdateRoom, useDeleteRoom } from "@/hooks/useData";
import { toast } from "sonner";
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

interface RoomsManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RoomFormData {
  name: string;
  capacity: number;
  color: string;
  status: "active" | "inactive";
}

const colorOptions = [
  { value: "#3b82f6", label: "Синий" },
  { value: "#10b981", label: "Зеленый" },
  { value: "#f59e0b", label: "Оранжевый" },
  { value: "#ef4444", label: "Красный" },
  { value: "#8b5cf6", label: "Фиолетовый" },
  { value: "#ec4899", label: "Розовый" },
  { value: "#6366f1", label: "Индиго" },
  { value: "#14b8a6", label: "Бирюзовый" },
];

export function RoomsManagementDialog({ open, onOpenChange }: RoomsManagementDialogProps) {
  const { data: rooms = [] } = useRooms();
  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();
  const deleteRoom = useDeleteRoom();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<any>(null);
  const [formData, setFormData] = useState<RoomFormData>({
    name: "",
    capacity: 10,
    color: "#3b82f6",
    status: "active",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      capacity: 10,
      color: "#3b82f6",
      status: "active",
    });
    setEditingRoom(null);
    setIsFormOpen(false);
  };

  const handleEdit = (room: any) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      capacity: room.capacity,
      color: room.color,
      status: room.status,
    });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (room: any) => {
    setRoomToDelete(room);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!roomToDelete) return;

    try {
      await deleteRoom.mutateAsync(roomToDelete.id);
      toast.success("Аудитория удалена");
      setDeleteConfirmOpen(false);
      setRoomToDelete(null);
    } catch (error: any) {
      toast.error(`Ошибка: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingRoom) {
        await updateRoom.mutateAsync({
          id: editingRoom.id,
          data: formData,
        });
        toast.success("Аудитория обновлена");
      } else {
        await createRoom.mutateAsync(formData);
        toast.success("Аудитория создана");
      }
      resetForm();
    } catch (error: any) {
      toast.error(`Ошибка: ${error.response?.data?.error || error.message}`);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Управление аудиториями
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-2">
            {/* Add New Room Button */}
            {!isFormOpen && (
              <Button
                onClick={() => setIsFormOpen(true)}
                className="w-full rounded-xl"
              >
                <Plus className="mr-2 h-4 w-4" />
                Добавить аудиторию
              </Button>
            )}

            {/* Room Form */}
            {isFormOpen && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-100 dark:from-violet-950 dark:to-purple-900">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Название *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Например: Аудитория 101"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="capacity">Вместимость *</Label>
                      <Input
                        id="capacity"
                        type="number"
                        min="1"
                        value={formData.capacity}
                        onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                        required
                      />
                    </div>

                    <div>
                      <Label>Цвет</Label>
                      <div className="grid grid-cols-4 gap-3 mt-2">
                        {colorOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, color: option.value })}
                            className={`h-12 rounded-xl transition-all ${
                              formData.color === option.value
                                ? "ring-2 ring-offset-2 ring-primary scale-110 shadow-lg"
                                : "hover:scale-105 shadow-soft"
                            }`}
                            style={{ backgroundColor: option.value }}
                            title={option.label}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetForm}
                        className="flex-1 rounded-xl"
                        disabled={createRoom.isPending || updateRoom.isPending}
                      >
                        Отмена
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 rounded-xl"
                        disabled={createRoom.isPending || updateRoom.isPending}
                      >
                        {createRoom.isPending || updateRoom.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Сохранение...
                          </>
                        ) : (
                          <>{editingRoom ? "Обновить" : "Создать"}</>
                        )}
                      </Button>
                    </div>
                  </form>
              </div>
            )}

            {/* Rooms List */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Аудитории ({rooms.length})
              </h3>
              {rooms.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Нет аудиторий. Добавьте первую аудиторию.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {rooms.map((room) => (
                    <div 
                      key={room.id} 
                      className="p-4 rounded-2xl transition-all hover:shadow-soft"
                      style={{ 
                        backgroundColor: `${room.color}15`,
                        borderLeft: `4px solid ${room.color}`
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl shadow-soft flex items-center justify-center"
                            style={{ backgroundColor: room.color }}
                          >
                            <Building2 className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold">{room.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Вместимость: {room.capacity} чел.
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(room)}
                            disabled={isFormOpen}
                            className="rounded-xl"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(room)}
                            disabled={deleteRoom.isPending}
                            className="rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                          >
                            {deleteRoom.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить аудиторию?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить аудиторию "{roomToDelete?.name}"?
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
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


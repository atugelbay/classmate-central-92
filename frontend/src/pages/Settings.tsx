import { useState } from "react";
import { useSettings, useUpdateSettings, useRooms, useCreateRoom, useUpdateRoom, useDeleteRoom } from "@/hooks/useData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Edit, Trash2, Building2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MigrationSettings } from "@/components/MigrationSettings";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Room } from "@/types";

export default function Settings() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { data: rooms = [], isLoading: roomsLoading } = useRooms();
  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();
  const deleteRoom = useDeleteRoom();
  
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      await updateSettings.mutateAsync({
        centerName: formData.get("centerName") as string,
        themeColor: formData.get("themeColor") as string,
      });
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleRoomSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const roomData = {
      name: formData.get("name") as string,
      capacity: parseInt(formData.get("capacity") as string),
      color: formData.get("color") as string,
      status: formData.get("status") as "active" | "inactive",
    };

    try {
      if (editingRoom) {
        await updateRoom.mutateAsync({ id: editingRoom.id, data: roomData });
      } else {
        await createRoom.mutateAsync(roomData);
      }
      setIsRoomDialogOpen(false);
      setEditingRoom(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeleteRoom = async () => {
    if (!deleteRoomId) return;
    try {
      await deleteRoom.mutateAsync(deleteRoomId);
      setDeleteRoomId(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const openEditRoom = (room: Room) => {
    setEditingRoom(room);
    setIsRoomDialogOpen(true);
  };

  const openCreateRoom = () => {
    setEditingRoom(null);
    setIsRoomDialogOpen(true);
  };

  if (isLoading || !settings) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold">Настройки</h1>
        <p className="text-muted-foreground">
          Конфигурация учебного центра
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">Основные</TabsTrigger>
          <TabsTrigger value="rooms">Аудитории</TabsTrigger>
          <TabsTrigger value="migration">Миграция</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 max-w-2xl">
          <Card>
        <CardHeader>
          <CardTitle>Основные настройки</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="centerName">Название учебного центра</Label>
              <Input
                id="centerName"
                name="centerName"
                defaultValue={settings.centerName}
                required
              />
            </div>
            <div>
              <Label htmlFor="themeColor">Цветовая схема (основной цвет)</Label>
              <div className="flex gap-4 items-center">
                <Input
                  id="themeColor"
                  name="themeColor"
                  type="color"
                  defaultValue={settings.themeColor}
                  className="h-12 w-24"
                />
                <Input
                  type="text"
                  defaultValue={settings.themeColor}
                  disabled
                  className="flex-1"
                />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Выберите основной цвет для интерфейса
              </p>
            </div>
            <Button type="submit" className="w-full">
              Сохранить настройки
            </Button>
          </form>
        </CardContent>
      </Card>

          <Card>
            <CardHeader>
              <CardTitle>О системе</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Версия:</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Последнее обновление:</span>
                <span className="font-medium">Октябрь 2025</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Хранилище:</span>
                <span className="font-medium">PostgreSQL</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rooms" className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Управление аудиториями для расписания
            </p>
            <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateRoom}>
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить аудиторию
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingRoom ? "Редактировать аудиторию" : "Новая аудитория"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleRoomSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Название *</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={editingRoom?.name}
                      required
                      placeholder="Например: Аудитория 101"
                    />
                  </div>
                  <div>
                    <Label htmlFor="capacity">Вместимость *</Label>
                    <Input
                      id="capacity"
                      name="capacity"
                      type="number"
                      min="1"
                      defaultValue={editingRoom?.capacity || 10}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="color">Цвет</Label>
                    <div className="flex gap-2">
                      <Input
                        id="color"
                        name="color"
                        type="color"
                        defaultValue={editingRoom?.color || "#8B5CF6"}
                        className="w-20 h-10"
                      />
                      <span className="text-sm text-muted-foreground flex items-center">
                        Цвет для визуального отображения
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="status">Статус *</Label>
                    <Select name="status" defaultValue={editingRoom?.status || "active"}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Активна</SelectItem>
                        <SelectItem value="inactive">Неактивна</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">
                    {editingRoom ? "Сохранить" : "Создать"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {roomsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <Card key={room.id} className="border-l-4" style={{ borderLeftColor: room.color }}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-lg">{room.name}</CardTitle>
                      </div>
                      <Badge variant={room.status === "active" ? "default" : "secondary"}>
                        {room.status === "active" ? "Активна" : "Неактивна"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      Вместимость: <span className="font-medium text-foreground">{room.capacity} чел.</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditRoom(room)}
                        className="flex-1"
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        Редактировать
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteRoomId(room.id)}
                      >
                        <Trash2 className="h-3 w-3 text-red-600" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {rooms.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  Аудитории не созданы. Добавьте первую аудиторию.
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="migration" className="space-y-6">
          <MigrationSettings />
        </TabsContent>
      </Tabs>

      {/* Delete Room Confirmation */}
      <AlertDialog open={!!deleteRoomId} onOpenChange={() => setDeleteRoomId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить аудиторию?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Аудитория будет удалена, но уроки сохранятся.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRoom}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

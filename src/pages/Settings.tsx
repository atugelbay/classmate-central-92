import { useStore } from "@/store/useStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Settings() {
  const { settings, updateSettings } = useStore();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateSettings({
      centerName: formData.get("centerName") as string,
      themeColor: formData.get("themeColor") as string,
    });
    toast.success("Настройки успешно сохранены");
  };

  return (
    <div className="space-y-6 animate-fade-in-up max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Настройки</h1>
        <p className="text-muted-foreground">
          Конфигурация учебного центра
        </p>
      </div>

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
            <span className="font-medium">LocalStorage</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

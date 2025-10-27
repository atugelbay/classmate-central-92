import { useState } from "react";
import { useSettings, useUpdateSettings } from "@/hooks/useData";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Sun, Moon, Monitor, Palette, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MigrationSettings } from "@/components/MigrationSettings";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useThemeContext } from "@/context/ThemeContext";
import { ColorThemeName, InterfaceSize, DataDensity } from "@/types";

const COLOR_THEMES = [
  { name: "blue" as ColorThemeName, label: "Синий", color: "#6366F1" },
  { name: "purple" as ColorThemeName, label: "Фиолетовый", color: "#A855F7" },
  { name: "green" as ColorThemeName, label: "Зеленый", color: "#10B981" },
  { name: "orange" as ColorThemeName, label: "Оранжевый", color: "#F59E0B" },
  { name: "red" as ColorThemeName, label: "Красный", color: "#EF4444" },
  { name: "pink" as ColorThemeName, label: "Розовый", color: "#EC4899" },
];

export default function Settings() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { theme, setTheme, uiPreferences, updateUIPreference, applyColorTheme } = useThemeContext();

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
          Конфигурация учебного центра и интерфейса
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">Общие</TabsTrigger>
          <TabsTrigger value="interface">Интерфейс</TabsTrigger>
          <TabsTrigger value="migration">Миграция</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Основные настройки</CardTitle>
              <CardDescription>
                Общая информация об учебном центре
              </CardDescription>
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
                  <Label htmlFor="themeColor">Акцентный цвет (для совместимости)</Label>
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
                    Используйте вкладку "Интерфейс" для выбора палитры
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

        <TabsContent value="interface" className="space-y-6 max-w-4xl">
          {/* Theme Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Тема оформления</CardTitle>
              <CardDescription>
                Выберите светлую, темную или системную тему
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={theme}
                onValueChange={setTheme}
                className="grid grid-cols-3 gap-4"
              >
                <div>
                  <RadioGroupItem
                    value="light"
                    id="light"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="light"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <Sun className="mb-3 h-6 w-6" />
                    <span className="text-sm font-medium">Светлая</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="dark"
                    id="dark"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="dark"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <Moon className="mb-3 h-6 w-6" />
                    <span className="text-sm font-medium">Темная</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="system"
                    id="system"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="system"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <Monitor className="mb-3 h-6 w-6" />
                    <span className="text-sm font-medium">Системная</span>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Color Palette */}
          <Card>
            <CardHeader>
              <CardTitle>Цветовая палитра</CardTitle>
              <CardDescription>
                Выберите основной цвет для интерфейса
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {COLOR_THEMES.map((colorTheme) => (
                  <button
                    key={colorTheme.name}
                    onClick={() => applyColorTheme(colorTheme.name)}
                    className={`relative flex items-center gap-3 rounded-lg border-2 p-4 transition-all hover:border-primary ${
                      uiPreferences.colorTheme === colorTheme.name
                        ? "border-primary bg-primary/5"
                        : "border-muted"
                    }`}
                  >
                    <div
                      className="h-10 w-10 rounded-full border-2 border-background shadow-sm"
                      style={{ backgroundColor: colorTheme.color }}
                    />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{colorTheme.label}</div>
                    </div>
                    {uiPreferences.colorTheme === colorTheme.name && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Interface Size */}
          <Card>
            <CardHeader>
              <CardTitle>Размер интерфейса</CardTitle>
              <CardDescription>
                Настройте размер текста и элементов интерфейса
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={uiPreferences.interfaceSize}
                onValueChange={(value) =>
                  updateUIPreference("interfaceSize", value as InterfaceSize)
                }
                className="grid grid-cols-3 gap-4"
              >
                <div>
                  <RadioGroupItem
                    value="compact"
                    id="compact"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="compact"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <span className="text-xs mb-2">Aa</span>
                    <span className="text-sm font-medium">Компактный</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="normal"
                    id="normal"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="normal"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <span className="text-sm mb-2">Aa</span>
                    <span className="text-sm font-medium">Нормальный</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="comfortable"
                    id="comfortable"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="comfortable"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <span className="text-base mb-2">Aa</span>
                    <span className="text-sm font-medium">Комфортный</span>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Animations and Data Density */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Анимации</CardTitle>
                <CardDescription>
                  Включите или отключите анимации в интерфейсе
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="animations">Включить анимации</Label>
                    <p className="text-sm text-muted-foreground">
                      Переходы и эффекты
                    </p>
                  </div>
                  <Switch
                    id="animations"
                    checked={uiPreferences.animationsEnabled}
                    onCheckedChange={(checked) =>
                      updateUIPreference("animationsEnabled", checked)
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Плотность данных</CardTitle>
                <CardDescription>
                  Настройте отступы в таблицах и списках
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={uiPreferences.dataDensity}
                  onValueChange={(value) =>
                    updateUIPreference("dataDensity", value as DataDensity)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Компактная</SelectItem>
                    <SelectItem value="standard">Стандартная</SelectItem>
                    <SelectItem value="spacious">Просторная</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          {/* Preview Section */}
          <Card>
            <CardHeader>
              <CardTitle>Предпросмотр</CardTitle>
              <CardDescription>
                Пример отображения с текущими настройками
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border bg-card p-4">
                  <h3 className="font-semibold mb-2">Пример заголовка</h3>
                  <p className="text-muted-foreground mb-4">
                    Это пример текста с текущими настройками интерфейса. 
                    Здесь вы можете увидеть, как будет выглядеть контент.
                  </p>
                  <Button>Пример кнопки</Button>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Palette className="h-4 w-4 text-primary" />
                    <span>Акцентный элемент с основным цветом</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="migration" className="space-y-6">
          <MigrationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

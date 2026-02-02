import { useState } from "react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useSettings, useUpdateSettings } from "@/hooks/useData";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Sun, Moon, Monitor, Palette, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BranchManagement } from "@/components/BranchManagement";
import { BillingSettings } from "@/components/BillingSettings";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useThemeContext } from "@/context/ThemeContext";
import { ColorThemeName, InterfaceSize, DataDensity } from "@/types";
import { PageHeader } from "@/components/PageHeader";
import { EmailVerification } from "@/components/EmailVerification";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const COLOR_THEMES: { name: ColorThemeName; labelKey: string; color: string }[] = [
  { name: "blue", labelKey: "blue", color: "#6366F1" },
  { name: "purple", labelKey: "purple", color: "#A855F7" },
  { name: "green", labelKey: "green", color: "#10B981" },
  { name: "orange", labelKey: "orange", color: "#F59E0B" },
  { name: "red", labelKey: "red", color: "#EF4444" },
  { name: "pink", labelKey: "pink", color: "#EC4899" },
];

export default function Settings() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { theme, setTheme, uiPreferences, updateUIPreference, applyColorTheme } = useThemeContext();
  const { t } = useTranslation("settings");
  
  const [centerName, setCenterName] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  // Update local state when settings are loaded (only on initial load)
  React.useEffect(() => {
    if (settings && !isInitialized) {
      setCenterName(settings.centerName || "");
      setIsInitialized(true);
    }
  }, [settings, isInitialized]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      await updateSettings.mutateAsync({
        centerName,
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
      <PageHeader
        title={t("title")}
        description={t("general.title")}
      />

      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">{t("tabs.general")}</TabsTrigger>
          <TabsTrigger value="billing">{t("tabs.billing")}</TabsTrigger>
          <TabsTrigger value="interface">{t("general.theme")}</TabsTrigger>
          <TabsTrigger value="branches">{t("tabs.branches")}</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 max-w-2xl">
          {/* Language Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t("general.language")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t("general.language")}</Label>
                </div>
                <LanguageSwitcher />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("general.title")}</CardTitle>
              <CardDescription>
                {t("company.title")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="centerName">{t("company.name")}</Label>
                  <Input
                    id="centerName"
                    name="centerName"
                    value={centerName}
                    onChange={(e) => setCenterName(e.target.value)}
                    required
                    disabled={updateSettings.isPending}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={updateSettings.isPending}>
                  {updateSettings.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("common:loading")}
                    </>
                  ) : (
                    t("common:save")
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <EmailVerification />

          <Card>
            <CardHeader>
              <CardTitle>{t("about.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("about.version")}:</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("about.lastUpdate")}:</span>
                <span className="font-medium">Октябрь 2025</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("about.storage")}:</span>
                <span className="font-medium">PostgreSQL</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interface" className="space-y-6 max-w-4xl">
          {/* Theme Selection */}
          <Card>
            <CardHeader>
              <CardTitle>{t("interface.themeTitle")}</CardTitle>
              <CardDescription>
                {t("interface.themeDescription")}
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
                    <span className="text-sm font-medium">{t("general.themes.light")}</span>
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
                    <span className="text-sm font-medium">{t("general.themes.dark")}</span>
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
                    <span className="text-sm font-medium">{t("general.themes.system")}</span>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Color Palette */}
          <Card>
            <CardHeader>
              <CardTitle>{t("interface.colorPalette")}</CardTitle>
              <CardDescription>
                {t("interface.colorPaletteDescription")}
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
                      <div className="font-medium">{t(`colors.${colorTheme.labelKey}`)}</div>
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
              <CardTitle>{t("interface.interfaceSize")}</CardTitle>
              <CardDescription>
                {t("interface.interfaceSizeDescription")}
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
                    <span className="text-sm font-medium">{t("interface.compact")}</span>
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
                    <span className="text-sm font-medium">{t("interface.normal")}</span>
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
                    <span className="text-sm font-medium">{t("interface.comfortable")}</span>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Animations and Data Density */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("interface.animations")}</CardTitle>
                <CardDescription>
                  {t("interface.animationsDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="animations">{t("interface.enableAnimations")}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t("interface.transitionsAndEffects")}
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
                <CardTitle>{t("interface.dataDensity")}</CardTitle>
                <CardDescription>
                  {t("interface.dataDensityDescription")}
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
                    <SelectItem value="compact">{t("interface.densityCompact")}</SelectItem>
                    <SelectItem value="standard">{t("interface.densityStandard")}</SelectItem>
                    <SelectItem value="spacious">{t("interface.densitySpacious")}</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          {/* Preview Section */}
          <Card>
            <CardHeader>
              <CardTitle>{t("interface.preview")}</CardTitle>
              <CardDescription>
                {t("interface.previewDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border bg-card p-4">
                  <h3 className="font-semibold mb-2">{t("interface.previewTitle")}</h3>
                  <p className="text-muted-foreground mb-4">
                    {t("interface.previewText")}
                  </p>
                  <Button>{t("interface.previewButton")}</Button>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Palette className="h-4 w-4 text-primary" />
                    <span>{t("interface.accentElement")}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <BillingSettings />
        </TabsContent>

        <TabsContent value="branches" className="space-y-6">
          <BranchManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}

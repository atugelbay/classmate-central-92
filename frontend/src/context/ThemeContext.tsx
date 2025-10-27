import React, { createContext, useContext, useEffect, ReactNode } from "react";
import { ThemeProvider as NextThemeProvider, useTheme as useNextTheme } from "next-themes";
import { UIPreferences, ColorThemeName, InterfaceSize, DataDensity } from "@/types";

interface ThemeContextType {
  theme: string | undefined;
  setTheme: (theme: string) => void;
  uiPreferences: UIPreferences;
  updateUIPreference: <K extends keyof UIPreferences>(key: K, value: UIPreferences[K]) => void;
  applyColorTheme: (theme: ColorThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const COLOR_THEMES = {
  blue: {
    primary: "239 84% 67%",
    primaryLight: "239 84% 85%",
    primaryDark: "239 84% 50%",
    primaryForeground: "0 0% 100%",
  },
  purple: {
    primary: "271 81% 56%",
    primaryLight: "271 81% 75%",
    primaryDark: "271 81% 40%",
    primaryForeground: "0 0% 100%",
  },
  green: {
    primary: "142 76% 36%",
    primaryLight: "142 76% 55%",
    primaryDark: "142 76% 25%",
    primaryForeground: "0 0% 100%",
  },
  orange: {
    primary: "38 92% 50%",
    primaryLight: "38 92% 70%",
    primaryDark: "38 92% 35%",
    primaryForeground: "0 0% 100%",
  },
  red: {
    primary: "0 84% 60%",
    primaryLight: "0 84% 75%",
    primaryDark: "0 84% 45%",
    primaryForeground: "0 0% 100%",
  },
  pink: {
    primary: "330 81% 60%",
    primaryLight: "330 81% 75%",
    primaryDark: "330 81% 45%",
    primaryForeground: "0 0% 100%",
  },
};

const DEFAULT_PREFERENCES: UIPreferences = {
  colorTheme: "blue",
  interfaceSize: "normal",
  animationsEnabled: true,
  dataDensity: "standard",
};

const STORAGE_KEY = "ui-preferences";

function ThemeContextProvider({ children }: { children: ReactNode }) {
  const { theme, setTheme } = useNextTheme();
  
  const loadPreferences = (): UIPreferences => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error("Failed to load UI preferences:", error);
    }
    return DEFAULT_PREFERENCES;
  };

  const [uiPreferences, setUiPreferences] = React.useState<UIPreferences>(loadPreferences);

  const savePreferences = (prefs: UIPreferences) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (error) {
      console.error("Failed to save UI preferences:", error);
    }
  };

  const updateUIPreference = <K extends keyof UIPreferences>(
    key: K,
    value: UIPreferences[K]
  ) => {
    setUiPreferences((prev) => {
      const updated = { ...prev, [key]: value };
      savePreferences(updated);
      return updated;
    });
  };

  const applyColorTheme = (themeName: ColorThemeName) => {
    const colors = COLOR_THEMES[themeName];
    const root = document.documentElement;

    root.style.setProperty("--primary", colors.primary);
    root.style.setProperty("--primary-light", colors.primaryLight);
    root.style.setProperty("--primary-dark", colors.primaryDark);
    root.style.setProperty("--primary-foreground", colors.primaryForeground);
    
    // Also update sidebar colors
    root.style.setProperty("--sidebar-primary", colors.primary);
    root.style.setProperty("--sidebar-ring", colors.primary);

    updateUIPreference("colorTheme", themeName);
  };

  // Apply preferences on mount and when they change
  useEffect(() => {
    applyColorTheme(uiPreferences.colorTheme);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    
    // Apply interface size
    root.classList.remove("ui-compact", "ui-normal", "ui-comfortable");
    root.classList.add(`ui-${uiPreferences.interfaceSize}`);

    // Apply animations
    if (!uiPreferences.animationsEnabled) {
      root.classList.add("reduce-motion");
    } else {
      root.classList.remove("reduce-motion");
    }

    // Apply data density
    root.classList.remove("density-compact", "density-standard", "density-spacious");
    root.classList.add(`density-${uiPreferences.dataDensity}`);
  }, [uiPreferences]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        uiPreferences,
        updateUIPreference,
        applyColorTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used within ThemeContextProvider");
  }
  return context;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ThemeContextProvider>{children}</ThemeContextProvider>
    </NextThemeProvider>
  );
}


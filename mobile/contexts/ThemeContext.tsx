import { createContext, useContext, useState, type ReactNode } from "react";
import { View } from "react-native";
import { useColorScheme } from "nativewind";

const LIGHT = {
  bg: "#f5f0f0",
  card: "#ffffff",
  cardSolid: "#ffffff",
  cardBorder: "rgba(168,77,72,0.22)",
  text: "#3d2020",
  subtext: "#6b6b6b",
  muted: "#999",
  inputBg: "#ffffff",
  inputBorder: "rgba(168,77,72,0.28)",
  accent: "#A84D48",
  accentHover: "#8f3e3a",
  tabBar: "rgba(255,255,255,0.95)",
  tabBarBorder: "rgba(168,77,72,0.15)",
  separator: "rgba(168,77,72,0.15)",
};

const DARK = {
  bg: "#1a1a1b",
  card: "rgba(39,39,41,0.92)",
  cardSolid: "#272729",
  cardBorder: "rgba(52,53,54,0.9)",
  text: "#D7DADC",
  subtext: "#B8BABD",
  muted: "#818384",
  inputBg: "rgba(39,39,41,0.95)",
  inputBorder: "rgba(82,83,84,0.8)",
  accent: "#FF4500",
  accentHover: "#E03D00",
  tabBar: "rgba(26,26,27,0.97)",
  tabBarBorder: "rgba(52,53,54,0.9)",
  separator: "rgba(52,53,54,0.8)",
};

export type ThemeColors = typeof LIGHT;

type ThemeMode = "auto" | "light" | "dark";

interface ThemeContextType {
  t: ThemeColors & { isDark: boolean };
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  t: { ...DARK, isDark: true },
  themeMode: "auto",
  setThemeMode: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("auto");

  const isDark =
    themeMode === "dark" ? true :
    themeMode === "light" ? false :
    colorScheme === "dark";

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    setColorScheme(mode === "dark" ? "dark" : mode === "light" ? "light" : "system");
  };

  const t = { ...(isDark ? DARK : LIGHT), isDark };

  return (
    <ThemeContext.Provider value={{ t, themeMode, setThemeMode }}>
      <View className="flex-1">
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

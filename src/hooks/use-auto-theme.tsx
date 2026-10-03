import { useEffect, useState, useCallback } from "react";

const THEME_STORAGE_KEY = "dramabox_theme";
const NIGHT_START_HOUR = 19; // 7 PM
const NIGHT_END_HOUR = 6; // 6 AM

type ThemeMode = "auto" | "light" | "dark";

function getStoredTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "auto") {
      return stored;
    }
  } catch {}
  return "auto";
}

export function useAutoTheme() {
  const [mode, setMode] = useState<ThemeMode>(getStoredTheme);
  const [isNightTime, setIsNightTime] = useState(false);

  const checkNightTime = useCallback(() => {
    const hour = new Date().getHours();
    return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
  }, []);

  const applyTheme = useCallback((isDark: boolean) => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, []);

  const setThemeMode = useCallback((newMode: ThemeMode) => {
    setMode(newMode);
    localStorage.setItem(THEME_STORAGE_KEY, newMode);
    console.log('[Theme] Saved preference:', newMode);
  }, []);

  useEffect(() => {
    const updateTheme = () => {
      const isNight = checkNightTime();
      setIsNightTime(isNight);

      if (mode === "auto") {
        // Check system preference first
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        applyTheme(prefersDark || isNight);
      } else {
        applyTheme(mode === "dark");
      }
    };

    updateTheme();

    // Update every minute to catch time changes
    const interval = setInterval(updateTheme, 60000);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (mode === "auto") updateTheme();
    };
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      clearInterval(interval);
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [mode, checkNightTime, applyTheme]);

  return {
    mode,
    setMode: setThemeMode,
    isNightTime,
    isDarkMode: mode === "dark" || (mode === "auto" && isNightTime),
  };
}

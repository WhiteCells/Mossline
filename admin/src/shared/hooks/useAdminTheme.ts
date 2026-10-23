import { useLayoutEffect, useState } from "react";

export type ThemeMode = "light" | "dark";

function initialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem("mossline-admin-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* 存储不可用时跟随系统主题。 */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#171519" : "#faf8f6");
}

// 在会话恢复前应用主题，避免深色模式下的加载画面使用浅色背景。
export function initializeAdminTheme() {
  applyTheme(initialTheme());
}

export function useAdminTheme() {
  const [theme, setTheme] = useState<ThemeMode>(initialTheme);
  useLayoutEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem("mossline-admin-theme", theme);
    } catch {
      /* 当前会话仍可切换主题。 */
    }
  }, [theme]);
  return {
    theme,
    toggleTheme: () =>
      setTheme((current) => (current === "dark" ? "light" : "dark")),
  };
}

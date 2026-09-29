import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function initialTheme(): Theme {
  const saved = localStorage.getItem("sovereign-theme");
  if (saved === "light" || saved === "dark") return saved;
  return "dark";
}

export function ThemeButton({ variant = "default", onToggle }: { variant?: "default" | "menu"; onToggle?: () => void }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("sovereign-theme", theme);
  }, [theme]);
  const nextTheme = theme === "dark" ? "light" : "dark";
  return <button type="button" className={variant === "menu" ? "menu-item" : "theme-button"} aria-label={`Use ${nextTheme} theme`} onClick={() => { setTheme(nextTheme); onToggle?.(); }}>{variant === "menu" ? `Switch to ${nextTheme} mode` : nextTheme === "light" ? "Light" : "Dark"}</button>;
}

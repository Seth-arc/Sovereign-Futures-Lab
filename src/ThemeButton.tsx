import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function initialTheme(): Theme {
  const saved = localStorage.getItem("sovereign-theme");
  if (saved === "light" || saved === "dark") return saved;
  return "dark";
}

export function ThemeButton() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("sovereign-theme", theme);
  }, [theme]);
  return <button type="button" className="theme-button" aria-label={`Use ${theme === "dark" ? "light" : "dark"} theme`} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "Light" : "Dark"}</button>;
}

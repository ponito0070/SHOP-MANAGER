"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex items-center gap-3 w-full px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition text-sm"
    >
      {theme === "dark" ? <Sun size={16} className="text-yellow-400" /> : <Moon size={16} />}
      {theme === "dark" ? "Mode Clair" : "Mode Sombre"}
    </button>
  );
}

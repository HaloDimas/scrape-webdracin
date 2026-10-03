import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

type ThemeMode = "auto" | "light" | "dark";

interface ThemeToggleProps {
  mode: ThemeMode;
  onModeChange: (mode: ThemeMode) => void;
  className?: string;
}

export function ThemeToggle({ mode, onModeChange, className }: ThemeToggleProps) {
  const modes: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
    { value: "auto", icon: Monitor, label: "Auto" },
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
  ];

  return (
    <div className={cn("flex rounded-xl bg-muted p-1", className)}>
      {modes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => onModeChange(value)}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
            mode === value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

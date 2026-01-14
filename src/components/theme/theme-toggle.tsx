"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  variant?: "icon" | "switch" | "dropdown";
  className?: string;
}

export function ThemeToggle({ variant = "icon", className }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon-sm" className={className} disabled>
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  // Simple icon toggle between light/dark
  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        className={cn("relative", className)}
        aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
      >
        <Sun className={cn(
          "h-4 w-4 transition-all duration-300",
          resolvedTheme === "dark" ? "rotate-0 scale-100" : "-rotate-90 scale-0"
        )} />
        <Moon className={cn(
          "absolute h-4 w-4 transition-all duration-300",
          resolvedTheme === "dark" ? "rotate-90 scale-0" : "rotate-0 scale-100"
        )} />
      </Button>
    );
  }

  // Switch-style toggle with all three options
  if (variant === "switch") {
    return (
      <div className={cn(
        "flex items-center gap-1 p-1 rounded-xl bg-muted",
        className
      )}>
        <button
          onClick={() => setTheme("light")}
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200",
            theme === "light"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-label="Light mode"
        >
          <Sun className="h-4 w-4" />
        </button>
        <button
          onClick={() => setTheme("system")}
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200",
            theme === "system"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-label="System preference"
        >
          <Monitor className="h-4 w-4" />
        </button>
        <button
          onClick={() => setTheme("dark")}
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200",
            theme === "dark"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-label="Dark mode"
        >
          <Moon className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Dropdown style (for settings pages)
  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium">Theme</label>
      <div className="flex items-center gap-2">
        {[
          { value: "light", label: "Light", icon: Sun },
          { value: "system", label: "System", icon: Monitor },
          { value: "dark", label: "Dark", icon: Moon },
        ].map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all duration-200",
              theme === value
                ? "border-primary bg-primary/5 text-foreground"
                : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

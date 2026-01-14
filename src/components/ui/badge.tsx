import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  [
    "inline-flex items-center gap-1.5",
    "rounded-full border px-3 py-1",
    "text-xs font-medium tracking-tight",
    "transition-all duration-200",
    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "border-transparent bg-primary text-primary-foreground",
          "shadow-sm shadow-primary/20",
          "hover:bg-primary/90 hover:shadow-md",
        ].join(" "),
        secondary: [
          "border-transparent bg-secondary text-secondary-foreground",
          "hover:bg-secondary/80",
        ].join(" "),
        destructive: [
          "border-transparent bg-destructive text-destructive-foreground",
          "shadow-sm shadow-destructive/20",
          "hover:bg-destructive/90",
        ].join(" "),
        outline: [
          "border-border text-foreground",
          "hover:bg-muted",
        ].join(" "),
        success: [
          "border-transparent",
          "bg-success/15 text-[hsl(var(--success))]",
          "dark:bg-success/20 dark:text-[hsl(var(--success))]",
        ].join(" "),
        warning: [
          "border-transparent",
          "bg-warning/15 text-[hsl(var(--warning-foreground))]",
          "dark:bg-warning/20 dark:text-[hsl(var(--warning))]",
        ].join(" "),
        accent: [
          "border-transparent bg-accent text-accent-foreground",
          "shadow-sm shadow-accent/20",
          "hover:bg-accent/90",
        ].join(" "),
        glass: [
          "border-white/20 bg-black/40 text-white",
          "backdrop-blur-md shadow-lg",
        ].join(" "),
        // AI Summary badge - guaranteed contrast on any background
        aiSummary: [
          "border-0",
          "bg-black/70 text-white",
          "backdrop-blur-md shadow-lg",
          "[&_svg]:text-amber-400",
        ].join(" "),
        gradient: [
          "border-0",
          "bg-gradient-to-r from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))]",
          "text-white",
          "shadow-sm shadow-primary/25",
        ].join(" "),
      },
      size: {
        default: "px-3 py-1 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-4 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

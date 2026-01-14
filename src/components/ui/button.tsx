"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "text-sm font-semibold tracking-tight",
    "rounded-xl transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    "touch-manipulation select-none",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-primary text-primary-foreground",
          "shadow-md shadow-primary/20",
          "hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5",
          "active:translate-y-0 active:shadow-md",
        ].join(" "),
        gradient: [
          "bg-gradient-to-br from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))]",
          "text-white",
          "shadow-lg shadow-primary/30",
          "hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5",
          "active:translate-y-0 active:shadow-lg",
          "btn-glow",
        ].join(" "),
        destructive: [
          "bg-destructive text-destructive-foreground",
          "shadow-md shadow-destructive/20",
          "hover:bg-destructive/90 hover:shadow-lg hover:shadow-destructive/25",
        ].join(" "),
        outline: [
          "border-2 border-border bg-transparent",
          "hover:bg-muted hover:border-primary/50",
          "active:bg-muted/80",
        ].join(" "),
        secondary: [
          "bg-secondary text-secondary-foreground",
          "hover:bg-secondary/80",
          "active:bg-secondary/70",
        ].join(" "),
        ghost: [
          "hover:bg-muted hover:text-foreground",
          "active:bg-muted/80",
        ].join(" "),
        link: [
          "text-primary underline-offset-4",
          "hover:underline hover:text-primary/80",
        ].join(" "),
        accent: [
          "bg-accent text-accent-foreground",
          "shadow-md shadow-accent/20",
          "hover:bg-accent/90 hover:shadow-lg hover:shadow-accent/25 hover:-translate-y-0.5",
          "active:translate-y-0",
        ].join(" "),
        glass: [
          "glass text-foreground",
          "hover:bg-card/80",
          "active:bg-card/70",
        ].join(" "),
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-13 rounded-2xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-base font-bold",
        icon: "h-11 w-11",
        "icon-sm": "h-9 w-9 rounded-lg",
        "icon-lg": "h-13 w-13 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin -ml-1 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>{children}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

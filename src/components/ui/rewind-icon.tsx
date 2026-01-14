"use client";

import { cn } from "@/lib/utils/cn";

interface RewindIconProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function RewindIcon({ className, size = "md" }: RewindIconProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  return (
    <div
      className={cn(
        sizeClasses[size],
        "relative rounded-xl bg-gradient-to-br from-[hsl(172,66%,30%)] via-[hsl(172,60%,35%)] to-[hsl(172,55%,40%)]",
        "flex items-center justify-center overflow-hidden",
        "shadow-lg shadow-primary/25",
        className
      )}
    >
      {/* SVG Mark */}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        className={cn(
          size === "sm" ? "w-5 h-5" : size === "md" ? "w-6 h-6" : "w-7 h-7"
        )}
      >
        {/* Main flowing path */}
        <path
          d="M25 50 C25 30 45 20 65 20 C80 20 82 35 82 45 C82 55 72 60 60 60 L35 60"
          stroke="url(#icon-gradient)"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
        />
        {/* Rewind arrow */}
        <path
          d="M40 60 L25 45 L40 30"
          stroke="url(#icon-gradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Accent dot */}
        <circle cx="65" cy="38" r="5" fill="#fbbf24" />
        {/* Knowledge dot */}
        <circle cx="35" cy="25" r="3" fill="white" opacity="0.8" />

        {/* Lower flow */}
        <path
          d="M60 60 C75 60 78 72 78 80 C78 90 60 92 45 92 L30 92"
          stroke="url(#icon-gradient)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />
        <path
          d="M35 92 L22 80 L35 68"
          stroke="url(#icon-gradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.7"
        />

        <defs>
          <linearGradient id="icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5eead4" />
            <stop offset="100%" stopColor="#2dd4bf" />
          </linearGradient>
        </defs>
      </svg>

      {/* Glow effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent" />
    </div>
  );
}

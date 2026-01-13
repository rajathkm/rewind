"use client";

import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  SkipForward,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ProcessingStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "skipped"
  | "permanently_failed";

interface ProcessingStatusBadgeProps {
  status?: ProcessingStatus;
  retryCount?: number;
  showLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const statusConfig: Record<
  ProcessingStatus,
  {
    icon: typeof Clock;
    label: string;
    className: string;
  }
> = {
  pending: {
    icon: Clock,
    label: "Pending",
    className: "text-amber-600 border-amber-600/30",
  },
  processing: {
    icon: Loader2,
    label: "Processing",
    className: "text-blue-600 border-blue-600/30",
  },
  completed: {
    icon: CheckCircle2,
    label: "Completed",
    className: "text-green-600 border-green-600/30",
  },
  failed: {
    icon: AlertCircle,
    label: "Failed",
    className: "text-red-600 border-red-600/30",
  },
  skipped: {
    icon: SkipForward,
    label: "Skipped",
    className: "text-gray-500 border-gray-500/30",
  },
  permanently_failed: {
    icon: XCircle,
    label: "Failed",
    className: "text-red-700 border-red-700/30",
  },
};

export function ProcessingStatusBadge({
  status,
  retryCount,
  showLabel = false,
  size = "sm",
  className,
}: ProcessingStatusBadgeProps) {
  if (!status) return null;

  const config = statusConfig[status];
  if (!config) return null;

  const Icon = config.icon;
  const isAnimated = status === "processing";
  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs",
        config.className,
        size === "sm" && "px-1.5 py-0.5",
        className
      )}
    >
      <Icon className={cn(iconSize, isAnimated && "animate-spin", showLabel && "mr-1")} />
      {showLabel && (
        <span>
          {config.label}
          {status === "failed" && retryCount !== undefined && retryCount > 0 && (
            <span className="ml-1">({retryCount})</span>
          )}
        </span>
      )}
    </Badge>
  );
}

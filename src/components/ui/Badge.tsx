import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "settled";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  info: "bg-brand-50 text-brand-700 border-brand-200",
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
  settled: "bg-violet-50 text-violet-700 border-violet-200",
};

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "neutral",
  ...props
}) => {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
};

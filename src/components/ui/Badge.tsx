import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "info" | "purple" | "outline";
  size?: "sm" | "md";
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  size = "md",
  className = "",
}: BadgeProps) {
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs font-medium" : "px-2.5 py-1 text-xs font-semibold";

  let variantClasses = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";

  switch (variant) {
    case "success":
      variantClasses = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800";
      break;
    case "warning":
      variantClasses = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800";
      break;
    case "info":
      variantClasses = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800";
      break;
    case "purple":
      variantClasses = "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800";
      break;
    case "outline":
      variantClasses = "bg-transparent text-slate-600 border-slate-300 dark:text-slate-400 dark:border-slate-700";
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border ${sizeClasses} ${variantClasses} ${className}`}
    >
      {children}
    </span>
  );
}

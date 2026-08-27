import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  children,
  icon,
  fullWidth = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  let sizeClasses = "px-4 py-2 text-sm font-medium rounded-lg";
  if (size === "sm") {
    sizeClasses = "px-3 py-1.5 text-xs font-medium rounded-md";
  } else if (size === "lg") {
    sizeClasses = "px-5 py-2.5 text-base font-semibold rounded-lg";
  }

  let variantClasses = "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm focus:ring-2 focus:ring-blue-500 focus:ring-offset-2";

  switch (variant) {
    case "secondary":
      variantClasses = "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700";
      break;
    case "outline":
      variantClasses = "border border-slate-300 bg-transparent text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60";
      break;
    case "ghost":
      variantClasses = "bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800";
      break;
    case "danger":
      variantClasses = "bg-red-600 text-white hover:bg-red-700 active:bg-red-800";
      break;
  }

  const disabledClasses = disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer";
  const widthClasses = fullWidth ? "w-full" : "";

  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 transition-colors duration-150 outline-none ${sizeClasses} ${variantClasses} ${disabledClasses} ${widthClasses} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

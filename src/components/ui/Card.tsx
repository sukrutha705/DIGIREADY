import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

export function Card({ children, className = "", hoverable = false, ...props }: CardProps) {
  const hoverClasses = hoverable
    ? "transition-all duration-150 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700"
    : "";

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/60 ${hoverClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

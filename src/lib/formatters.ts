/**
 * DigiReady - UI Formatting & Masking Utilities
 */

export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) {
    return "Not specified";
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    return String(dateInput);
  }

  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Safely masks synthetic identifier attributes in the demonstration UI:
 * e.g., "SYNTH-SSLC-2022-8812" -> "SYNTH-••••-••••-8812"
 * "2006-05-15" -> "15 ••• 2006" or masked format
 */
export function maskIdentifier(value: string): string {
  if (!value || typeof value !== "string") {
    return "••••••••";
  }

  const trimmed = value.trim();
  if (trimmed.length <= 4) {
    return "••••" + trimmed;
  }

  const parts = trimmed.split(/[-_/ ]+/);
  if (parts.length > 1) {
    return parts
      .map((part, index) => {
        if (index === 0) return part;
        if (index === parts.length - 1) return part;
        return "•".repeat(Math.min(part.length, 4));
      })
      .join("-");
  }

  const visibleEnd = trimmed.slice(-4);
  return "•".repeat(Math.max(trimmed.length - 4, 4)) + visibleEnd;
}

export function formatCategoryName(category: string): string {
  if (!category) return "General";
  return category
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getSourceBadgeProps(source: string): { label: string; className: string } {
  const isIssued = source?.toUpperCase() === "ISSUED";
  if (isIssued) {
    return {
      label: "Issued Document",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    };
  }
  return {
    label: "Uploaded Document",
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  };
}

export function getCategoryColor(category: string): { bg: string; text: string; border: string; iconBg: string } {
  switch (category?.toUpperCase()) {
    case "EDUCATION":
      return {
        bg: "bg-indigo-50 dark:bg-indigo-950/30",
        text: "text-indigo-700 dark:text-indigo-300",
        border: "border-indigo-200 dark:border-indigo-800/60",
        iconBg: "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300",
      };
    case "IDENTITY":
      return {
        bg: "bg-blue-50 dark:bg-blue-950/30",
        text: "text-blue-700 dark:text-blue-300",
        border: "border-blue-200 dark:border-blue-800/60",
        iconBg: "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300",
      };
    case "SOCIAL_CERTIFICATE":
      return {
        bg: "bg-purple-50 dark:bg-purple-950/30",
        text: "text-purple-700 dark:text-purple-300",
        border: "border-purple-200 dark:border-purple-800/60",
        iconBg: "bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300",
      };
    case "FINANCIAL":
      return {
        bg: "bg-amber-50 dark:bg-amber-950/30",
        text: "text-amber-700 dark:text-amber-300",
        border: "border-amber-200 dark:border-amber-800/60",
        iconBg: "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300",
      };
    case "ADDRESS":
      return {
        bg: "bg-teal-50 dark:bg-teal-950/30",
        text: "text-teal-700 dark:text-teal-300",
        border: "border-teal-200 dark:border-teal-800/60",
        iconBg: "bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-300",
      };
    case "TRAVEL":
      return {
        bg: "bg-sky-50 dark:bg-sky-950/30",
        text: "text-sky-700 dark:text-sky-300",
        border: "border-sky-200 dark:border-sky-800/60",
        iconBg: "bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-300",
      };
    default:
      return {
        bg: "bg-slate-50 dark:bg-slate-900/40",
        text: "text-slate-700 dark:text-slate-300",
        border: "border-slate-200 dark:border-slate-800",
        iconBg: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
      };
  }
}

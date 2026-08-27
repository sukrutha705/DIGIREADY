import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { getCategoryColor } from "@/lib/formatters";
import { IconFolder, IconChevronRight } from "@/components/ui/Icons";
import type { CategorySummaryItem } from "@/server/vault";

interface CategoryGridProps {
  categories: CategorySummaryItem[];
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Document Categories
        </h2>
        <Link
          href="/documents"
          className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
        >
          View all <IconChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
        {categories.map((cat) => {
          const colors = getCategoryColor(cat.category);
          return (
            <Link key={cat.category} href={`/documents?category=${cat.category}`}>
              <Card hoverable className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colors.iconBg}`}>
                    <IconFolder className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {cat.displayName}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      {cat.count} {cat.count === 1 ? "document" : "documents"}
                    </span>
                  </div>
                </div>
                <IconChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

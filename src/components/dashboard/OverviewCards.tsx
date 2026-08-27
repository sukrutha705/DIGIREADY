import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { IconFolder, IconIssued, IconUpload, IconFileText } from "@/components/ui/Icons";

interface OverviewCardsProps {
  totalCount: number;
  issuedCount: number;
  uploadedCount: number;
  categoriesCount: number;
}

export function OverviewCards({
  totalCount,
  issuedCount,
  uploadedCount,
  categoriesCount,
}: OverviewCardsProps) {
  const cards = [
    {
      label: "Total Documents",
      count: totalCount,
      href: "/documents",
      icon: IconFolder,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/40",
      description: "In your digital vault",
    },
    {
      label: "Issued Documents",
      count: issuedCount,
      href: "/issued",
      icon: IconIssued,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
      description: "Directly verified records",
    },
    {
      label: "Uploaded Documents",
      count: uploadedCount,
      href: "/uploaded",
      icon: IconUpload,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/40",
      description: "Supporting certificates",
    },
    {
      label: "Categories",
      count: categoriesCount,
      href: "/documents",
      icon: IconFileText,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/40",
      description: "Identity, Education, etc.",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link key={card.label} href={card.href}>
            <Card hoverable className="h-full flex flex-col justify-between p-4.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {card.label}
                </span>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.bgColor} ${card.color}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {card.count}
                </span>
                <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                  {card.description}
                </p>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

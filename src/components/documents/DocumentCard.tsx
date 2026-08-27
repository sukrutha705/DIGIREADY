import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatCategoryName, getSourceBadgeProps } from "@/lib/formatters";
import { IconFileText, IconChevronRight, IconCheckCircle, IconAlertCircle, IconShieldCheck } from "@/components/ui/Icons";
import type { VaultDocumentDTO } from "@/server/vault";

interface DocumentCardProps {
  document: VaultDocumentDTO;
}

export function DocumentCard({ document }: DocumentCardProps) {
  const sourceBadge = getSourceBadgeProps(document.source);
  const hasUserCorrections = document.fields.some((f) => f.isUserCorrected);
  const isCheckComplete = document.fields.length >= 2;

  return (
    <Card hoverable className="p-5 flex flex-col justify-between h-full group">
      <div className="flex flex-col gap-3">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Badge variant="outline" size="sm">
            {formatCategoryName(document.category)}
          </Badge>
          <div className="flex items-center gap-1.5">
            {hasUserCorrections && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                User Corrected
              </span>
            )}
            <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${sourceBadge.className}`}>
              {document.source === "ISSUED" ? "Issued" : "Uploaded"}
            </span>
          </div>
        </div>

        {/* Document Title & Issuer */}
        <div className="flex items-start gap-3 mt-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <IconFileText className="h-5 w-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 transition-colors">
              {document.displayName}
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
              {document.issuer}
            </span>
          </div>
        </div>

        {/* DigiReady Status Badges */}
        <div className="flex items-center gap-2 pt-1 flex-wrap text-xs">
          <Badge variant={isCheckComplete ? "success" : "warning"} size="sm" className="gap-1">
            <IconShieldCheck className="w-3 h-3" />
            <span>{isCheckComplete ? "✓ DigiReady Check Complete" : "Needs Review"}</span>
          </Badge>
        </div>

        {/* Date & Validity Info */}
        <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
          <div>
            <span className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-semibold block">
              Issued On
            </span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {formatDate(document.issueDate)}
            </span>
          </div>
          {document.expiryDate ? (
            <div>
              <span className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-semibold block">
                Expires
              </span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {formatDate(document.expiryDate)}
              </span>
            </div>
          ) : (
            <div>
              <span className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-semibold block">
                Validity
              </span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Permanent
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <span className="text-[11px] font-medium text-slate-400">
          {document.fields.length} metadata fields
        </span>
        <Link
          href={`/documents/${document.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform"
        >
          <span>View Details</span>
          <IconChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </Card>
  );
}

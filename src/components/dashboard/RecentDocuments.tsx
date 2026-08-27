import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate, getSourceBadgeProps, formatCategoryName } from "@/lib/formatters";
import { IconFileText, IconChevronRight } from "@/components/ui/Icons";
import type { VaultDocumentDTO } from "@/server/vault";

interface RecentDocumentsProps {
  documents: VaultDocumentDTO[];
}

export function RecentDocuments({ documents }: RecentDocumentsProps) {
  if (!documents || documents.length === 0) {
    return (
      <Card className="p-6 text-center text-slate-500">
        <p className="text-sm">No documents in your vault yet.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Recent Documents
        </h2>
        <Link
          href="/documents"
          className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
        >
          View all <IconChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="flex flex-col gap-2.5">
        {documents.map((doc) => {
          const sourceBadge = getSourceBadgeProps(doc.source);
          return (
            <Link key={doc.id} href={`/documents/${doc.id}`}>
              <Card hoverable className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <IconFileText className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {doc.displayName}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>{doc.issuer}</span>
                      <span>•</span>
                      <span>{formatDate(doc.issueDate)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden sm:flex items-center gap-1.5">
                    <Badge variant="outline" size="sm">
                      {formatCategoryName(doc.category)}
                    </Badge>
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${sourceBadge.className}`}>
                      {doc.source === "ISSUED" ? "Issued" : "Uploaded"}
                    </span>
                  </div>
                  <IconChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { IconSparkles, IconCheckCircle } from "@/components/ui/Icons";

interface AttentionBannerProps {
  totalCount: number;
  issuedCount: number;
  uploadedCount: number;
}

export function AttentionBanner({
  totalCount,
  issuedCount,
  uploadedCount,
}: AttentionBannerProps) {
  return (
    <Card className="border-blue-200 bg-gradient-to-r from-blue-50/90 to-indigo-50/70 p-5 dark:border-blue-900/50 dark:from-blue-950/40 dark:to-indigo-950/30">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <IconCheckCircle className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Document Wallet Ready
            </h3>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
              You currently have <span className="font-semibold text-blue-700 dark:text-blue-300">{totalCount} documents</span> ({issuedCount} issued, {uploadedCount} uploaded) available in your vault.
            </p>
          </div>
        </div>

        <Link
          href="/documents"
          className="inline-flex items-center gap-1.5 shrink-0 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 shadow-xs"
        >
          <IconSparkles className="w-3.5 h-3.5" />
          <span>Browse Vault</span>
        </Link>
      </div>
    </Card>
  );
}

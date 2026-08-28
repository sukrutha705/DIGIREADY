"use client";

import React, { useState } from "react";
import type { ServiceEligibilityResult, EligibilityCriterion } from "@/server/eligibility/types";
import {
  IconCheckCircle as CheckCircle,
  IconAlertCircle as AlertTriangle,
  IconXCircle as XCircle,
  IconHelp as Info,
  IconShieldCheck as ShieldCheck,
  IconChevronRight as ChevronRight,
} from "@/components/ui/Icons";

interface EligibilityCardProps {
  eligibility: ServiceEligibilityResult;
  onUpdateProfile?: () => void;
}

export function EligibilityCard({ eligibility, onUpdateProfile }: EligibilityCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getStatusBadge = () => {
    switch (eligibility.overallStatus) {
      case "ELIGIBLE":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-3.5 h-3.5" />
            {eligibility.statusLabel}
          </span>
        );
      case "NOT_ELIGIBLE":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" />
            {eligibility.statusLabel}
          </span>
        );
      case "NEEDS_INFORMATION":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            {eligibility.statusLabel}
          </span>
        );
    }
  };

  const getCriterionIcon = (status: string) => {
    switch (status) {
      case "PASS":
        return <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />;
      case "FAIL":
        return <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />;
      case "NEEDS_INFORMATION":
      default:
        return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />;
    }
  };

  const getProvenanceBadge = (source?: string) => {
    switch (source) {
      case "EXTRACTED_FROM_DOC":
        return (
          <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
            Extracted from document
          </span>
        );
      case "USER_PROVIDED":
        return (
          <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
            Provided by you
          </span>
        );
      case "OFFICIAL_RECORD":
        return (
          <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            Confirmed by official record
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-500" />
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
              Statutory Eligibility Check
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Evaluated against official conducting authority guidelines
          </p>
        </div>
        {getStatusBadge()}
      </div>

      {/* Summary Explanation */}
      <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3.5 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
        {eligibility.summary}
      </div>

      {/* Criteria Breakdown */}
      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Evaluated Criteria ({eligibility.criteria.length})
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {eligibility.criteria.map((criterion) => (
            <div key={criterion.id} className="py-2.5 flex items-start gap-3">
              {getCriterionIcon(criterion.status)}
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                    {criterion.name}
                  </span>
                  {getProvenanceBadge(criterion.valueSource)}
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-normal">
                  {criterion.explanation}
                </p>
                {criterion.providedValue && (
                  <p className="text-[11px] text-zinc-500">
                    Recorded Value: <span className="font-medium text-zinc-700 dark:text-zinc-300">{String(criterion.providedValue)}</span>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action / Disclaimer */}
      <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span>Source: {eligibility.sourceReference}</span>
        </div>

        {eligibility.needsInformation && onUpdateProfile && (
          <button
            onClick={onUpdateProfile}
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Provide missing information
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

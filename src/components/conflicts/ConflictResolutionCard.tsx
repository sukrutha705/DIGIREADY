"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  IconAlertCircle,
  IconShieldCheck,
  IconFileText,
  IconChevronRight,
  IconLock,
} from "@/components/ui/Icons";
import type { ConsistencyAssessment, FieldConsistencyComparison } from "@/server/consistency/types";
import type { ConflictGuidance } from "@/server/conflicts/types";
import { ConflictGuidanceModal } from "./ConflictGuidanceModal";
import { UploadModal } from "@/components/documents/UploadModal";
import { useRouter } from "next/navigation";

interface ConflictResolutionCardProps {
  consistency: ConsistencyAssessment;
  onUploadSuccess?: () => void;
}

export function ConflictResolutionCard({
  consistency,
  onUploadSuccess,
}: ConflictResolutionCardProps) {
  const router = useRouter();
  const { comparisons, conflicts, hasConflicts } = consistency;
  const [activeGuidanceModal, setActiveGuidanceModal] = useState<ConflictGuidance | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [targetUploadType, setTargetUploadType] = useState<string>("");

  const handleOpenUpload = (docTypeKey?: string) => {
    setTargetUploadType(docTypeKey || "");
    setIsUploadModalOpen(true);
  };

  if (!hasConflicts && comparisons.length === 0) {
    return null;
  }

  return (
    <>
      {/* Guidance Modal */}
      {activeGuidanceModal && (
        <ConflictGuidanceModal
          isOpen={!!activeGuidanceModal}
          onClose={() => setActiveGuidanceModal(null)}
          guidance={activeGuidanceModal}
          onUploadUpdatedDoc={() => handleOpenUpload(activeGuidanceModal.affectedDocuments[0]?.documentTypeKey)}
        />
      )}

      {/* Upload Modal for Corrected Document */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          if (onUploadSuccess) onUploadSuccess();
          else router.refresh();
        }}
        preselectedDocumentType={targetUploadType}
        onSuccess={() => {
          if (onUploadSuccess) onUploadSuccess();
          else router.refresh();
        }}
      />

      <Card className="p-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Cross-Document Identity Consistency
              </h2>
              <Badge
                variant={hasConflicts ? "warning" : "success"}
                size="sm"
              >
                {hasConflicts
                  ? `${conflicts.length} Official Conflict Requires Correction`
                  : "All Fields Match (CONSISTENT)"}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Deterministic verification of common identity attributes across your available vault documents.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
              <IconShieldCheck className="w-3.5 h-3.5" />
              {consistency.matchCount} Consistent
            </span>
            {hasConflicts && (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                <IconAlertCircle className="w-3.5 h-3.5" />
                {consistency.conflictCount} Mismatches
              </span>
            )}
          </div>
        </div>

        {/* Prominent Warning Banner if conflicts exist */}
        {hasConflicts && (
          <div className="my-4 rounded-xl border border-amber-300 bg-amber-50/80 p-4 text-xs dark:border-amber-900/60 dark:bg-amber-950/30">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white">
                <IconAlertCircle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  ⚠ Identity information conflict detected
                </h3>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  Your documents contain different identity information. DigiReady cannot change the information on an official document. You should correct the information through the appropriate issuing authority before continuing with an application.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Comparisons & Conflict Guidance Cards */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80 mt-2">
          {comparisons.map((comp) => {
            const isMismatch = comp.status === "POTENTIAL_MISMATCH";
            const isMatch = comp.status === "MATCH";
            const isInsufficient = comp.status === "INSUFFICIENT_DATA";

            return (
              <div
                key={comp.fieldKey}
                className={`py-4 transition-colors ${
                  isMismatch
                    ? "bg-amber-50/30 -mx-6 px-6 border-l-4 border-amber-500 dark:bg-amber-950/20"
                    : ""
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {comp.fieldLabel} {isMismatch ? "Differs" : ""}
                    </span>
                    {isMismatch && (
                      <Badge variant="warning" size="sm" className="gap-1">
                        <IconAlertCircle className="w-3 h-3" />
                        OFFICIAL_CORRECTION_REQUIRED
                      </Badge>
                    )}
                    {isMatch && (
                      <Badge variant="success" size="sm" className="gap-1">
                        <IconShieldCheck className="w-3 h-3" />
                        CONSISTENT
                      </Badge>
                    )}
                    {isInsufficient && (
                      <Badge variant="outline" size="sm">
                        No Records
                      </Badge>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {comp.entries.length} document{comp.entries.length === 1 ? "" : "s"} evaluated
                  </span>
                </div>

                {/* Side-by-side Document Field Comparison Box */}
                {comp.entries.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 mt-3">
                    {comp.entries.map((entry, idx) => (
                      <div
                        key={`${entry.documentId}-${idx}`}
                        className={`rounded-xl border p-3 ${
                          isMismatch
                            ? "border-amber-200 bg-white dark:border-amber-900/60 dark:bg-slate-900"
                            : "border-slate-200/80 bg-white/70 dark:border-slate-800 dark:bg-slate-900/60"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                          <span className="truncate">{entry.documentDisplayName}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono break-all">
                          {entry.rawValue}
                        </p>
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <Link
                            href={`/documents/${entry.documentId}`}
                            className="text-[11px] font-semibold text-blue-600 hover:underline dark:text-blue-400"
                          >
                            Inspect Document →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Mismatch Official Resolution Action Block */}
                {isMismatch && comp.guidance && (
                  <div className="mt-3 rounded-xl bg-amber-100/60 p-3.5 dark:bg-amber-900/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                          Recommended Authority:
                        </span>
                        <Badge variant="outline" size="sm" className="bg-white/80 dark:bg-slate-800">
                          {comp.guidance.recommendedAuthority.shortName}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-amber-900 dark:text-amber-200 font-medium">
                        DigiReady cannot modify official documents. Review the official correction process.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setActiveGuidanceModal(comp.guidance!)}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs"
                      >
                        View Correction Steps →
                      </Button>
                    </div>
                  </div>
                )}

                {/* Explanation for Matches */}
                {isMatch && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5">
                    {comp.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Disclaimers & Advice Note */}
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400 mt-4">
          <div className="flex items-start gap-2.5">
            <IconShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              DigiReady detects cross-document discrepancies to prevent rejection during official application processing. Stored document images remain unchanged in private storage. DigiReady does not alter official government records.
            </p>
          </div>
        </div>
      </Card>
    </>
  );
}

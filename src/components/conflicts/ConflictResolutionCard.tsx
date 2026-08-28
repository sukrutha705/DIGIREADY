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
import type { ConflictGuidance, ConflictIssue, ConflictSeverity, ConflictIssueStatus } from "@/server/conflicts/types";
import { GOVERNMENT_AUTHORITIES } from "@/server/authorities";
import { ConflictGuidanceModal } from "./ConflictGuidanceModal";
import { ConflictIssueCard } from "./ConflictIssueCard";
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

  // Convert conflicts to rich ConflictIssue domain objects for full location-aware resolution
  const conflictIssues: ConflictIssue[] = conflicts.map((comp) => {
    const authority = comp.guidance?.recommendedAuthority || GOVERNMENT_AUTHORITIES.UIDAI;
    const severity: ConflictSeverity = comp.severity === "CRITICAL" ? "BLOCKING" : "WARNING";
    const status: ConflictIssueStatus = "GUIDANCE_AVAILABLE";

    return {
      id: `issue-${comp.fieldKey}`,
      documentA: comp.guidance?.affectedDocuments[0] || {
        documentId: comp.entries[0]?.documentId || "doc-1",
        documentDisplayName: comp.entries[0]?.documentDisplayName || "Document 1",
        documentTypeKey: comp.entries[0]?.documentTypeKey || "UNKNOWN",
        fieldName: comp.fieldKey,
        value: comp.entries[0]?.rawValue || comp.distinctValues[0] || "",
        issuer: "Issuing Authority",
      },
      documentB: comp.guidance?.affectedDocuments[1] || {
        documentId: comp.entries[1]?.documentId || "doc-2",
        documentDisplayName: comp.entries[1]?.documentDisplayName || "Document 2",
        documentTypeKey: comp.entries[1]?.documentTypeKey || "UNKNOWN",
        fieldName: comp.fieldKey,
        value: comp.entries[1]?.rawValue || comp.distinctValues[1] || "",
        issuer: "Issuing Authority",
      },
      field: comp.fieldKey,
      fieldLabel: comp.fieldLabel || comp.fieldKey,
      valueA: comp.entries[0]?.rawValue || comp.distinctValues[0] || "",
      valueB: comp.entries[1]?.rawValue || comp.distinctValues[1] || "",
      severity,
      status,
      explanation: comp.explanation || "Identity values differ across documents.",
      whyItMatters: comp.guidance?.whyCorrectionMayBeRequired || "Identity mismatches prevent official verification.",
      resolutionPlan: {
        authority,
        authorityType: authority.jurisdiction,
        reason: comp.explanation,
        officialPortal: authority.portalName,
        officialInstructionsUrl: authority.officialUrl,
        centreRequired: true,
        correctionMethod: "In-person visit to an authorized official centre or online demographic update.",
        requiredSupportingDocuments: comp.guidance?.requiredDocuments || [],
        numberedSteps: comp.guidance?.numberedSteps || [],
        nextVerificationAction: "Re-upload the corrected official document once issued.",
      },
      authority,
      centreRequired: true,
      userCity: "Bengaluru",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

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

      <div className="space-y-4">
        {/* If conflicts exist, render rich Location-Aware ConflictIssueCard for each blocking mismatch */}
        {hasConflicts && conflictIssues.length > 0 && (
          <div className="space-y-4">
            {conflictIssues.map((issue) => (
              <ConflictIssueCard
                key={issue.id}
                issue={issue}
                onUploadCorrectedDoc={(docType) => handleOpenUpload(docType)}
                onRecheck={() => {
                  if (onUploadSuccess) onUploadSuccess();
                  else router.refresh();
                }}
              />
            ))}
          </div>
        )}

        {/* Detailed Consistency Assessment Summary Card */}
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

          {/* Comparisons List */}
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

                  {/* Mismatch Action */}
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
      </div>
    </>
  );
}

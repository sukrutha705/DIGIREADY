"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  IconCheckCircle,
  IconAlertCircle,
  IconShieldCheck,
  IconHelp,
  IconChevronRight,
  IconClose,
  IconLock,
  IconFileText,
} from "@/components/ui/Icons";
import { ConflictCard } from "@/components/consistency/ConflictCard";
import { UploadModal } from "@/components/documents/UploadModal";
import { useRouter } from "next/navigation";
import type { ApplicationJourney, JourneyDocument } from "@/server/journey/types";
import type { DocumentGuidance } from "@/server/guidance/types";

interface JourneyPageClientActionsProps {
  journey: ApplicationJourney;
}

export function JourneyPageClientActions({ journey }: JourneyPageClientActionsProps) {
  const router = useRouter();
  const [activeGuidance, setActiveGuidance] = useState<DocumentGuidance | null>(null);
  const [isLoadingGuidance, setIsLoadingGuidance] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadPreselectType, setUploadPreselectType] = useState<string>("");
  const [uploadPreselectName, setUploadPreselectName] = useState<string>("");

  const handleOpenUpload = (docType?: string, docName?: string) => {
    setUploadPreselectType(docType || "");
    setUploadPreselectName(docName || "");
    setIsUploadModalOpen(true);
  };

  const getDocStatusBadge = (doc: JourneyDocument) => {
    switch (doc.status) {
      case "CONFLICT":
        return <Badge variant="warning" size="sm" className="gap-1"><IconAlertCircle className="w-3 h-3" /> Identity Mismatch</Badge>;
      case "VERIFIED":
        return <Badge variant="success" size="sm" className="gap-1"><IconShieldCheck className="w-3 h-3" /> Metadata Checked</Badge>;
      case "NEEDS_REVIEW":
        return <Badge variant="warning" size="sm" className="gap-1"><IconAlertCircle className="w-3 h-3" /> Needs Review</Badge>;
      case "AVAILABLE":
        return <Badge variant="info" size="sm">Available</Badge>;
      case "MISSING":
      default:
        return <Badge variant="warning" size="sm" className="gap-1"><IconAlertCircle className="w-3 h-3" /> Missing</Badge>;
    }
  };

  const handleOpenGuidance = async (documentType: string) => {
    setIsLoadingGuidance(true);
    try {
      const res = await fetch(`/api/documents/guidance/${encodeURIComponent(documentType)}`);
      if (res.ok) {
        const data = await res.json();
        setActiveGuidance(data.guidance || data);
      }
    } catch (err) {
      console.error("Guidance fetch error:", err);
    } finally {
      setIsLoadingGuidance(false);
    }
  };

  return (
    <>
      {/* Ready to Apply Notification Card (When all checks pass and no conflicts exist) */}
      {journey.status === "READY_TO_APPLY" && (
        <Card className="p-6 border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
                <IconCheckCircle className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-emerald-950 dark:text-emerald-100">
                    Ready to Apply for {journey.serviceName}
                  </h2>
                  <Badge variant="success" size="sm">Preparation Complete</Badge>
                </div>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1 leading-relaxed">
                  All {journey.requiredCount} required documents are available in your vault, metadata checks have passed, and no identity conflicts were detected.
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 italic">
                  Note: DigiReady is a preparation tool and does not submit the application. Proceed to the official portal to complete your filing.
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => alert("DigiReady does not submit live applications. You are ready to apply on the official examination portal.")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shrink-0 self-start sm:self-auto text-xs"
            >
              Application Guidelines →
            </Button>
          </div>
        </Card>
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          router.refresh();
        }}
        preselectedDocumentType={uploadPreselectType}
        preselectedDocumentName={uploadPreselectName}
        onSuccess={() => router.refresh()}
      />

      {/* Required Documents Checklist Card */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Required Documents Checklist
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review, verify, and resolve issues for each document required for the {journey.serviceName} application.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenUpload()}
              className="text-xs font-semibold"
            >
              + Upload Document
            </Button>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg">
              {journey.availableCount} of {journey.requiredCount} Required Ready
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 dark:divide-slate-800">
          {journey.readiness.documents.map((req) => {
            const isMissing = req.status === "MISSING";
            const docObj =
              journey.verifiedDocuments.find((d) => d.documentType === req.documentType) ||
              journey.documentsNeedingReview.find((d) => d.documentType === req.documentType) ||
              journey.missingDocuments.find((d) => d.documentType === req.documentType);

            return (
              <div
                key={req.documentType}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 text-xs"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                      {req.displayName}
                    </span>
                    {docObj ? getDocStatusBadge(docObj) : (
                      isMissing ? (
                        <Badge variant="warning" size="sm">Missing</Badge>
                      ) : (
                        <Badge variant="success" size="sm">Available</Badge>
                      )
                    )}
                  </div>
                  <span className="text-slate-500 text-[11px]">
                    {req.required ? "Mandatory requirement" : "Optional supporting document"}
                    {req.matchedDocumentName ? ` • In Vault as: "${req.matchedDocumentName}"` : ""}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                  {isMissing ? (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenUpload(req.documentType, req.displayName)}
                        className="gap-1.5 text-xs font-semibold shadow-xs"
                      >
                        <IconFileText className="w-3.5 h-3.5" />
                        <span>Upload Document</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenGuidance(req.documentType)}
                        className="gap-1.5 text-xs text-amber-700 border-amber-200 hover:bg-amber-50 dark:border-amber-900/60 dark:text-amber-300 dark:hover:bg-amber-950/40"
                      >
                        <IconHelp className="w-3.5 h-3.5" />
                        <span>Get Guidance</span>
                      </Button>
                    </>
                  ) : docObj?.status === "NEEDS_REVIEW" && req.documentId ? (
                    <Link href={`/documents/${req.documentId}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs text-blue-700 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/40"
                      >
                        <IconShieldCheck className="w-3.5 h-3.5" />
                        <span>Verify Metadata</span>
                      </Button>
                    </Link>
                  ) : req.documentId ? (
                    <Link href={`/documents/${req.documentId}`}>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                        <span>View Document</span>
                        <IconChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Cross-Document Consistency Assessment Component */}
      {journey.consistency && (
        <ConflictCard consistency={journey.consistency} />
      )}

      {/* Structured Guidance Modal */}
      {activeGuidance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                  <IconHelp className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Missing Document Guidance
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {activeGuidance.displayName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveGuidance(null)}
                aria-label="Close guidance dialog"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>

            {/* WHAT IT IS */}
            <div className="space-y-1 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                What It Is
              </span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {activeGuidance.description}
              </p>
            </div>

            {/* WHY YOU MAY NEED IT */}
            <div className="space-y-1 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Why You May Need It
              </span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                Required for {journey.serviceName} application processing and eligibility verification.
              </p>
            </div>

            {/* RECOMMENDED NEXT STEPS */}
            <div className="space-y-1.5 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Recommended Next Steps
              </span>
              <div className="flex flex-col gap-1.5 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                {activeGuidance.nextSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-slate-800 dark:text-slate-200">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-snug">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* OFFICIAL PROCESS NOTE */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 leading-relaxed">
              ℹ️ <span className="font-semibold text-slate-700 dark:text-slate-300">Official Process Note:</span> {activeGuidance.authorityNote || "Issued by competent state/local authority. DigiReady provides structured guidance to assist your preparation."}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setActiveGuidance(null)}>
                Back to Application Journey
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

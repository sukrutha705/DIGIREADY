"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  IconCheckCircle,
  IconAlertCircle,
  IconLock,
  IconShieldCheck,
  IconFileText,
  IconHelp,
  IconChevronRight,
  IconSparkles,
} from "@/components/ui/Icons";
import type { ApplicationJourney, JourneyAction, JourneyDocument } from "@/server/journey/types";

interface ApplicationJourneyCardProps {
  journey: ApplicationJourney;
  onActionClick?: (action: JourneyAction) => void;
  onQueryClick?: (query: string) => void;
}

export function ApplicationJourneyCard({
  journey,
  onActionClick,
  onQueryClick,
}: ApplicationJourneyCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "READY_TO_APPLY":
        return <Badge variant="success" size="sm">Ready to Apply</Badge>;
      case "NEEDS_ATTENTION":
        return <Badge variant="warning" size="sm">Needs Attention</Badge>;
      case "READY_FOR_VERIFICATION":
        return <Badge variant="warning" size="sm">Needs Review</Badge>;
      case "MISSING_DOCUMENTS":
      default:
        return <Badge variant="warning" size="sm">Missing Documents</Badge>;
    }
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

  const handleAction = (action: JourneyAction) => {
    if (onActionClick) {
      onActionClick(action);
      return;
    }

    if (onQueryClick) {
      switch (action.type) {
        case "GUIDANCE":
          onQueryClick(`How do I get an ${action.documentType?.toLowerCase().replace(/_/g, " ")}?`);
          break;
        case "VERIFY":
          onQueryClick(`Verify my ${action.documentType?.toLowerCase().replace(/_/g, " ")}`);
          break;
        case "CONFLICT":
          onQueryClick(`Do my documents have any conflicts?`);
          break;
        case "REFRESH":
          onQueryClick(`I want to apply for ${journey.serviceName}`);
          break;
      }
    }
  };

  // 6 Stages definition
  const stages = [
    { label: "1. Requirements", state: "done" },
    { label: "2. Inventory", state: journey.availableCount > 0 ? "done" : "current" },
    { label: "3. Missing Docs", state: journey.missingCount === 0 ? "done" : "warning" },
    { label: "4. Checks", state: journey.documentsNeedingReview.length === 0 ? "done" : "current" },
    { label: "5. Consistency", state: journey.consistency?.hasConflicts ? "warning" : "done" },
    { label: "6. Ready to Apply", state: journey.status === "READY_TO_APPLY" ? "done" : "upcoming" },
  ];

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-blue-200 bg-white p-4 shadow-sm dark:border-blue-900/60 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <IconFileText className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
              Application Preparation Journey
            </span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {journey.serviceName}
            </h3>
          </div>
        </div>

        {getStatusBadge(journey.status)}
      </div>

      {/* 6-Stage Progress Stepper */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 py-1">
        {stages.map((stage, idx) => {
          let bgClass = "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
          if (stage.state === "done") {
            bgClass = "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50";
          } else if (stage.state === "warning") {
            bgClass = "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50";
          } else if (stage.state === "current") {
            bgClass = "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50 font-bold";
          }

          return (
            <div
              key={idx}
              className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-center text-[10px] ${bgClass}`}
            >
              <span className="font-semibold leading-tight">{stage.label}</span>
            </div>
          );
        })}
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-800/40">
          <span className="text-[10px] font-semibold text-slate-400 uppercase">Documents</span>
          <p className="font-bold text-slate-900 dark:text-white mt-0.5">
            {journey.availableCount} / {journey.requiredCount} Available
          </p>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-800/40">
          <span className="text-[10px] font-semibold text-slate-400 uppercase">Missing</span>
          <p className="font-bold text-amber-600 dark:text-amber-400 mt-0.5">
            {journey.missingCount} Missing
          </p>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-800/40">
          <span className="text-[10px] font-semibold text-slate-400 uppercase">Checks</span>
          <p className="font-bold text-blue-600 dark:text-blue-400 mt-0.5">
            {journey.verifiedDocuments.length} Complete
          </p>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-800/40">
          <span className="text-[10px] font-semibold text-slate-400 uppercase">Consistency</span>
          <p className={`font-bold mt-0.5 ${journey.consistency?.hasConflicts ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
            {journey.consistency?.hasConflicts ? `${journey.consistency.conflictCount} Conflict` : "No Conflicts"}
          </p>
        </div>
      </div>

      {/* Document Requirements Checklist */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Document Checklist
        </span>
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
          {journey.readiness.documents.map((docReq) => {
            const isMissing = docReq.status === "MISSING";
            const isVerified = journey.verifiedDocuments.some(
              (vd) => vd.documentType === docReq.documentType
            );
            const needsReview = journey.documentsNeedingReview.some(
              (nr) => nr.documentType === docReq.documentType
            );
            const hasConflict = journey.consistency?.conflicts.some((c) =>
              c.entries.some((e) => e.documentTypeKey === docReq.documentType)
            );

            let docStatus: JourneyDocument = {
              documentType: docReq.documentType,
              displayName: docReq.displayName,
              required: docReq.required,
              status: isMissing ? "MISSING" : hasConflict ? "CONFLICT" : isVerified ? "VERIFIED" : "NEEDS_REVIEW",
            };

            return (
              <div
                key={docReq.documentType}
                className="flex items-center justify-between p-2.5 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {docReq.displayName}
                  </span>
                  {docReq.required && (
                    <span className="text-[10px] text-slate-400">(Required)</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {getDocStatusBadge(docStatus)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Contextual Next Actions */}
      {journey.nextActions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {journey.nextActions.map((action) => (
            <Button
              key={action.id}
              variant={action.type === "REFRESH" ? "outline" : "primary"}
              size="sm"
              onClick={() => handleAction(action)}
              className="text-xs"
            >
              {action.label}
            </Button>
          ))}

          <Link href={`/journey/${journey.serviceId}`} className="ml-auto">
            <Button variant="outline" size="sm" className="text-xs gap-1">
              <span>Open Journey Page</span>
              <IconChevronRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* Non-submission limitation note */}
      <p className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-1">
        {journey.limitationNote}
      </p>
    </div>
  );
}

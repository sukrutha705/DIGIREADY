"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  IconFileText,
  IconCheckCircle,
  IconAlertCircle,
  IconShieldCheck,
  IconChevronRight,
} from "@/components/ui/Icons";
import { UploadModal } from "@/components/documents/UploadModal";
import { useRouter } from "next/navigation";
import type { ApplicationJourney } from "@/server/journey/types";

interface DashboardJourneyCardProps {
  journey: ApplicationJourney | null;
}

export function DashboardJourneyCard({ journey }: DashboardJourneyCardProps) {
  const router = useRouter();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  if (!journey) {
    return (
      <Card className="p-5 border-blue-100 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 dark:border-blue-900/40 dark:from-slate-900 dark:to-blue-950/20">
        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => {
            setIsUploadModalOpen(false);
            router.refresh();
          }}
          onSuccess={() => router.refresh()}
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <IconFileText className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Application Readiness
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                Prepare for Public Services &amp; Exams
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                Check whether your vault documents meet eligibility criteria, verify metadata, and detect identity conflicts before applying.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUploadModalOpen(true)}
              className="text-xs font-semibold"
            >
              + Upload Document
            </Button>
            <Link href="/journey/kcet">
              <Button variant="primary" size="sm" className="gap-1.5 shrink-0 text-xs font-semibold">
                <span>Start Preparation</span>
                <IconChevronRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "READY_TO_APPLY":
        return <Badge variant="success" size="sm">Ready to Apply</Badge>;
      case "NEEDS_ATTENTION":
        return <Badge variant="warning" size="sm">Needs Attention</Badge>;
      case "READY_FOR_VERIFICATION":
        return <Badge variant="warning" size="sm">Needs Verification</Badge>;
      case "MISSING_DOCUMENTS":
      default:
        return <Badge variant="warning" size="sm">Missing Documents</Badge>;
    }
  };

  const hasConflicts = journey.consistency?.hasConflicts ?? false;
  const conflictCount = journey.consistency?.conflictCount ?? 0;

  return (
    <Card className="p-5 border-blue-200/80 bg-gradient-to-br from-blue-50/60 via-white to-slate-50 dark:border-blue-900/50 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/20 shadow-xs">
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          router.refresh();
        }}
        onSuccess={() => router.refresh()}
      />
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <IconFileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Active Application Preparation
                </span>
                {getStatusBadge(journey.status)}
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {journey.serviceName} Readiness
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUploadModalOpen(true)}
              className="text-xs font-semibold"
            >
              + Upload Document
            </Button>
            <Link href={`/journey/${journey.serviceId.toLowerCase()}`}>
              <Button variant="primary" size="sm" className="gap-1.5 text-xs font-semibold shadow-xs">
                <span>Continue Preparation</span>
                <IconChevronRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Readiness Overview Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800/80 dark:bg-slate-800/50">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Document Inventory
            </span>
            <div className="flex items-center gap-1.5 mt-1 font-bold text-slate-900 dark:text-white text-sm">
              <span>{journey.availableCount} / {journey.requiredCount}</span>
              <span className="text-[11px] font-normal text-slate-500">Available</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800/80 dark:bg-slate-800/50">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Missing Required
            </span>
            <div className="flex items-center gap-1.5 mt-1 font-bold text-sm">
              {journey.missingCount > 0 ? (
                <>
                  <IconAlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="text-amber-600 dark:text-amber-400">{journey.missingCount} Missing</span>
                </>
              ) : (
                <>
                  <IconCheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-emerald-600 dark:text-emerald-400">All Present</span>
                </>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800/80 dark:bg-slate-800/50">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Metadata Checks
            </span>
            <div className="flex items-center gap-1.5 mt-1 font-bold text-slate-900 dark:text-white text-sm">
              <IconShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>{journey.verifiedDocuments.length} Checked</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800/80 dark:bg-slate-800/50">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Identity Consistency
            </span>
            <div className="flex items-center gap-1.5 mt-1 font-bold text-sm">
              {hasConflicts ? (
                <>
                  <IconAlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="text-amber-600 dark:text-amber-400">{conflictCount} Mismatch</span>
                </>
              ) : (
                <>
                  <IconCheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-emerald-600 dark:text-emerald-400">CONSISTENT</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Conflict Alert Banner with Direct Link */}
        {hasConflicts && (
          <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3 text-xs dark:border-amber-900/60 dark:bg-amber-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <IconAlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-bold text-amber-900 dark:text-amber-200">
                ⚠ {conflictCount} information conflict{conflictCount > 1 ? "s" : ""} detected in your documents.
              </span>
            </div>
            <Link
              href={`/journey/${journey.serviceId.toLowerCase()}`}
              className="inline-flex items-center gap-1 font-semibold text-amber-900 hover:underline dark:text-amber-200 text-xs shrink-0"
            >
              <span>View Conflict Guidance →</span>
            </Link>
          </div>
        )}

        {/* Quick Switcher / Other Applications */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
          <span>Explore Other Applications:</span>
          <div className="flex flex-wrap gap-2">
            <Link href="/journey/scholarship" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
              Scholarship
            </Link>
            <span>•</span>
            <Link href="/journey/epfo" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
              EPFO PF Transfer
            </Link>
            <span>•</span>
            <Link href="/journey/passport" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
              Passport
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}

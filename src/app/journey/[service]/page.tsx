import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  IconFileText,
  IconChevronLeft,
  IconChevronRight,
  IconCheckCircle,
  IconAlertCircle,
  IconShieldCheck,
  IconHelp,
  IconSparkles,
} from "@/components/ui/Icons";
import { getDemoUser } from "@/server/vault";
import { getApplicationJourney } from "@/server/journey/service";
import { JourneyPageClientActions } from "./JourneyClient";

export const dynamic = "force-dynamic";

interface JourneyPageProps {
  params: Promise<{ service: string }>;
}

export default async function ApplicationJourneyPage({ params }: JourneyPageProps) {
  const { service } = await params;
  const demoUser = await getDemoUser();
  const journey = await getApplicationJourney(demoUser.id, service);

  if (!journey) {
    return (
      <AppShell userDisplayName={demoUser.displayName}>
        <div className="flex flex-col gap-6 max-w-3xl mx-auto py-8">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
            >
              <IconChevronLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Link>
          </div>

          <Card className="p-8 text-center flex flex-col items-center gap-3 border-amber-200 bg-amber-50/50 dark:border-amber-900/60 dark:bg-slate-900">
            <IconAlertCircle className="w-8 h-8 text-amber-600" />
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              Service Requirements Not Configured
            </h1>
            <p className="text-xs text-slate-500 max-w-md">
              We couldn&apos;t find application requirements configured for &ldquo;{service}&rdquo;. You can explore requirements for other public services below:
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              <Link href="/journey/kcet">
                <Button variant="outline" size="sm">KCET</Button>
              </Link>
              <Link href="/journey/scholarship">
                <Button variant="outline" size="sm">Scholarship</Button>
              </Link>
              <Link href="/journey/epfo">
                <Button variant="outline" size="sm">EPFO</Button>
              </Link>
              <Link href="/journey/passport">
                <Button variant="outline" size="sm">Passport</Button>
              </Link>
            </div>
          </Card>
        </div>
      </AppShell>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "READY_TO_APPLY":
        return <Badge variant="success" size="md">Ready to Apply</Badge>;
      case "NEEDS_ATTENTION":
        return <Badge variant="warning" size="md">Needs Attention</Badge>;
      case "READY_FOR_VERIFICATION":
        return <Badge variant="warning" size="md">Needs Verification</Badge>;
      case "MISSING_DOCUMENTS":
      default:
        return <Badge variant="warning" size="md">Missing Documents</Badge>;
    }
  };

  return (
    <AppShell userDisplayName={demoUser.displayName}>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        {/* Back Navigation */}
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
          >
            <IconChevronLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* Journey Header Card */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
                <IconFileText className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Application Preparation Journey
                  </span>
                  {getStatusBadge(journey.status)}
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {journey.serviceName}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                  {journey.readiness.description || "End-to-end document readiness verification, metadata checking, and cross-document identity consistency."}
                </p>
              </div>
            </div>
          </div>

          {/* Stepper Progress Bar (6 Preparation Stages) */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
              Preparation Progress &amp; Stages
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
              {/* Step 1: Requirements */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
                  <IconCheckCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>1. Requirements</span>
                </div>
                <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium truncate">
                  {journey.requiredCount} Required
                </span>
              </div>

              {/* Step 2: Documents Inventory */}
              <div className={`rounded-xl border p-3 flex flex-col gap-1 ${
                journey.availableCount >= journey.requiredCount
                  ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                  : "border-amber-200 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20"
              }`}>
                <div className={`flex items-center gap-1.5 font-bold text-[11px] ${
                  journey.availableCount >= journey.requiredCount
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-amber-700 dark:text-amber-300"
                }`}>
                  {journey.availableCount >= journey.requiredCount ? (
                    <IconCheckCircle className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <IconAlertCircle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>2. Inventory</span>
                </div>
                <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                  {journey.availableCount} / {journey.requiredCount} Available
                </span>
              </div>

              {/* Step 3: Missing Documents */}
              <div className={`rounded-xl border p-3 flex flex-col gap-1 ${
                journey.missingCount === 0
                  ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                  : "border-amber-200 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20"
              }`}>
                <div className={`flex items-center gap-1.5 font-bold text-[11px] ${
                  journey.missingCount === 0
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-amber-700 dark:text-amber-300"
                }`}>
                  {journey.missingCount === 0 ? (
                    <IconCheckCircle className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <IconAlertCircle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>3. Missing Docs</span>
                </div>
                <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                  {journey.missingCount === 0 ? "None Missing" : `${journey.missingCount} Missing`}
                </span>
              </div>

              {/* Step 4: Metadata Checks */}
              <div className={`rounded-xl border p-3 flex flex-col gap-1 ${
                journey.documentsNeedingReview.length === 0 && journey.availableCount > 0
                  ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                  : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40"
              }`}>
                <div className={`flex items-center gap-1.5 font-bold text-[11px] ${
                  journey.documentsNeedingReview.length === 0 && journey.availableCount > 0
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-slate-600 dark:text-slate-400"
                }`}>
                  {journey.documentsNeedingReview.length === 0 && journey.availableCount > 0 ? (
                    <IconCheckCircle className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 flex items-center justify-center font-bold text-[10px] text-slate-400">○</span>
                  )}
                  <span>4. Document Checks</span>
                </div>
                <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                  {journey.documentsNeedingReview.length === 0 ? "Complete" : `${journey.documentsNeedingReview.length} Pending`}
                </span>
              </div>

              {/* Step 5: Consistency */}
              <div className={`rounded-xl border p-3 flex flex-col gap-1 ${
                !journey.consistency?.hasConflicts
                  ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                  : "border-amber-200 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20"
              }`}>
                <div className={`flex items-center gap-1.5 font-bold text-[11px] ${
                  !journey.consistency?.hasConflicts
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-amber-700 dark:text-amber-300"
                }`}>
                  {!journey.consistency?.hasConflicts ? (
                    <IconCheckCircle className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <IconAlertCircle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>5. Consistency</span>
                </div>
                <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                  {!journey.consistency?.hasConflicts ? "No Conflicts" : `${journey.consistency.conflictCount} Conflict`}
                </span>
              </div>

              {/* Step 6: Ready to Apply */}
              <div className={`rounded-xl border p-3 flex flex-col gap-1 ${
                journey.status === "READY_TO_APPLY"
                  ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                  : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40"
              }`}>
                <div className={`flex items-center gap-1.5 font-bold text-[11px] ${
                  journey.status === "READY_TO_APPLY"
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-slate-600 dark:text-slate-400"
                }`}>
                  {journey.status === "READY_TO_APPLY" ? (
                    <IconCheckCircle className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 flex items-center justify-center font-bold text-[10px] text-slate-400">○</span>
                  )}
                  <span>6. Ready to Apply</span>
                </div>
                <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                  {journey.status === "READY_TO_APPLY" ? "Ready" : "In Progress"}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Document Requirements Checklist & Interactive Actions */}
        <JourneyPageClientActions journey={journey} />

        {/* Prototype Safeguard Banner */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
          <div className="flex items-start gap-3">
            <IconShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                DigiReady Preparation &amp; Non-Submission Notice
              </span>
              <p className="mt-0.5 leading-relaxed text-[11px]">
                {journey.limitationNote}
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

import React from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  IconFileText,
  IconCheckCircle,
  IconAlertCircle,
  IconShieldCheck,
  IconChevronRight,
  IconSparkles,
} from "@/components/ui/Icons";
import { getDemoUser } from "@/server/vault";
import { getApplicationJourney } from "@/server/journey/service";
import { DemoResetButton, DemoUploadAction } from "./DemoClient";

export const dynamic = "force-dynamic";

export default async function DemoPresentationPage() {
  const demoUser = await getDemoUser();
  const journey = await getApplicationJourney(demoUser.id, "KCET");

  return (
    <AppShell userDisplayName={demoUser.displayName}>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto py-2">
        {/* Header & Reset Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-black tracking-widest uppercase text-blue-600 dark:text-blue-400">
                DIGIREADY
              </span>
              <Badge variant="purple" size="sm">DEMO MODE</Badge>
              <Badge variant="outline" size="sm">Preparation Layer</Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              From documents to application readiness.
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Know what you need. Check what you have. Detect cross-document conflicts. Fix issues. Know when you&apos;re ready to apply.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
            <DemoResetButton />
            <DemoUploadAction />
            <Link href="/journey/kcet">
              <Button variant="primary" size="sm" className="gap-1.5 text-xs font-semibold">
                <span>Open Journey</span>
                <IconChevronRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* 6-Stage Core Storyline Presentation Cards */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              6-Stage Application Readiness Storyline
            </h2>
            <span className="text-[11px] text-slate-500">KCET Application Scenario</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* Step 1 */}
            <Card className="p-4 flex flex-col justify-between gap-3 border-blue-100 bg-blue-50/20 dark:border-blue-900/40 dark:bg-slate-900">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Stage 1
                  </span>
                  <Badge variant="info" size="sm">Requirements</Badge>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  1. Know What You Need
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  KCET requires 4 documents: Government ID, 10th Marks Card, 12th Marks Card, and Income Certificate.
                </p>
              </div>
              <Link href="/journey/kcet" className="text-[11px] font-semibold text-blue-600 hover:underline">
                Inspect Requirements →
              </Link>
            </Card>

            {/* Step 2 */}
            <Card className="p-4 flex flex-col justify-between gap-3 border-emerald-100 bg-emerald-50/20 dark:border-emerald-900/40 dark:bg-slate-900">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Stage 2
                  </span>
                  <Badge variant="success" size="sm">Vault Inventory</Badge>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  2. Know What You Have
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Citizen vault contains 3 of 4 required documents (Aadhaar, 10th Marks Card, and 12th Marks Card).
                </p>
              </div>
              <Link href="/documents" className="text-[11px] font-semibold text-emerald-600 hover:underline">
                View Vault Documents →
              </Link>
            </Card>

            {/* Step 3 */}
            <Card className="p-4 flex flex-col justify-between gap-3 border-amber-100 bg-amber-50/20 dark:border-amber-900/40 dark:bg-slate-900">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Stage 3
                  </span>
                  <Badge variant="warning" size="sm">Missing Guidance</Badge>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  3. Detect What&apos;s Missing
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Income Certificate is missing. DigiReady surfaces clear step-by-step guidance without fabricating government procedures.
                </p>
              </div>
              <Link href="/journey/kcet" className="text-[11px] font-semibold text-amber-700 hover:underline">
                View Guidance Steps →
              </Link>
            </Card>

            {/* Step 4 */}
            <Card className="p-4 flex flex-col justify-between gap-3 border-blue-100 bg-blue-50/20 dark:border-blue-900/40 dark:bg-slate-900">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Stage 4
                  </span>
                  <Badge variant="success" size="sm">Metadata Checks</Badge>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  4. Check Document Information
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Evaluates metadata completeness against schema rules. Clearly marks documents as &ldquo;Ready for Review&rdquo;.
                </p>
              </div>
              <Link href="/documents" className="text-[11px] font-semibold text-blue-600 hover:underline">
                Inspect Metadata Checks →
              </Link>
            </Card>

            {/* Step 5 */}
            <Card className="p-4 flex flex-col justify-between gap-3 border-amber-100 bg-amber-50/20 dark:border-amber-900/40 dark:bg-slate-900">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Stage 5
                  </span>
                  <Badge variant="warning" size="sm">Consistency Engine</Badge>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  5. Detect Cross-Doc Conflicts
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Compares identity attributes (Name, DOB, Parent Name, Gender, Address) across documents to catch discrepancies early.
                </p>
              </div>
              <Link href="/journey/kcet" className="text-[11px] font-semibold text-amber-700 hover:underline">
                Inspect Consistency →
              </Link>
            </Card>

            {/* Step 6 */}
            <Card className="p-4 flex flex-col justify-between gap-3 border-emerald-100 bg-emerald-50/20 dark:border-emerald-900/40 dark:bg-slate-900">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Stage 6
                  </span>
                  <Badge variant="success" size="sm">Application Readiness</Badge>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  6. Ready to Apply
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Final state is &ldquo;Ready to Apply&rdquo; with clear prototype non-submission boundaries before applying on the official portal.
                </p>
              </div>
              <Link href="/journey/kcet" className="text-[11px] font-semibold text-emerald-700 hover:underline">
                View Final Readiness →
              </Link>
            </Card>
          </div>
        </div>

        {/* Current Dynamic Live Status Overview */}
        {journey && (
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Live Demonstration State
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  {journey.serviceName} Preparation Status
                </h2>
              </div>
              <Badge variant={journey.status === "READY_TO_APPLY" ? "success" : "warning"} size="md">
                {journey.status.replace(/_/g, " ")}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Documents</span>
                <p className="font-bold text-slate-900 dark:text-white text-sm mt-1">
                  {journey.availableCount} / {journey.requiredCount} Available
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Missing</span>
                <p className="font-bold text-amber-600 dark:text-amber-400 text-sm mt-1">
                  {journey.missingCount} Required Missing
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Metadata Checks</span>
                <p className="font-bold text-blue-600 dark:text-blue-400 text-sm mt-1">
                  {journey.verifiedDocuments.length} Complete
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Consistency</span>
                <p className={`font-bold text-sm mt-1 ${journey.consistency?.hasConflicts ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {journey.consistency?.hasConflicts ? `${journey.consistency.conflictCount} Conflict` : "No Conflicts"}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Prototype Safeguard Banner */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
          <div className="flex items-start gap-3">
            <IconShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Prototype Boundary &amp; Non-Submission Notice
              </span>
              <p className="mt-0.5 leading-relaxed text-[11px]">
                This prototype prepares your documents, checks metadata, and detects conflicts before application submission. It does not submit an application to a government portal.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

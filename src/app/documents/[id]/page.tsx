import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  formatDate,
  formatCategoryName,
  getSourceBadgeProps,
} from "@/lib/formatters";
import {
  IconFileText,
  IconChevronLeft,
  IconCheckCircle,
  IconAlertCircle,
  IconShieldCheck,
  IconChevronRight,
} from "@/components/ui/Icons";
import { getDemoUser, getUserDocumentById } from "@/server/vault";
import { verifyDocument } from "@/server/verification/verifier";
import { getVaultConsistencyAssessment } from "@/server/consistency/service";
import { getApplicationJourney } from "@/server/journey/service";
import { DocumentDetailClient } from "@/components/documents/DocumentDetailClient";
import { DocumentShareHistoryCard } from "@/components/documents/DocumentShareSection";

export const dynamic = "force-dynamic";

interface DocumentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentDetailPage({ params }: DocumentDetailPageProps) {
  const { id } = await params;
  const demoUser = await getDemoUser();
  const document = await getUserDocumentById(demoUser.id, id);

  if (!document) {
    notFound();
  }

  const verification = await verifyDocument(demoUser.id, document.id);
  const consistency = await getVaultConsistencyAssessment(demoUser.id);
  const journey = await getApplicationJourney(demoUser.id, "KCET");
  const sourceBadge = getSourceBadgeProps(document.source);

  return (
    <AppShell userDisplayName={demoUser.displayName}>
      <div className="flex flex-col gap-6">
        {/* Back Navigation */}
        <div>
          <Link
            href="/documents"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
          >
            <IconChevronLeft className="w-4 h-4" />
            <span>Back to My Documents</span>
          </Link>
        </div>

        {/* Document Header Card */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
                <IconFileText className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge variant="outline" size="sm">
                    {formatCategoryName(document.category)}
                  </Badge>
                  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${sourceBadge.className}`}>
                    {document.source === "ISSUED" ? "Issued Document" : "Uploaded Document"}
                  </span>
                  <Badge variant="success" size="sm" className="gap-1">
                    <IconCheckCircle className="w-3 h-3" />
                    Available in Vault
                  </Badge>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {document.displayName}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Canonical Type: <span className="font-medium text-slate-700 dark:text-slate-300">{document.documentTypeName}</span> ({document.documentTypeKey})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={verification.status === "READY_FOR_REVIEW" ? "success" : "warning"} size="md" className="gap-1.5 font-bold">
                <IconShieldCheck className="w-4 h-4" />
                <span>✓ DigiReady Document Check: {verification.status === "READY_FOR_REVIEW" ? "Complete" : "Needs Review"}</span>
              </Badge>
            </div>
          </div>

          {/* Key Attributes Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Issuing Authority
              </span>
              <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 mt-0.5 block">
                {document.issuer}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Issued Date
              </span>
              <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 mt-0.5 block">
                {formatDate(document.issueDate)}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Expiry / Validity
              </span>
              <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 mt-0.5 block">
                {document.expiryDate ? formatDate(document.expiryDate) : "Permanent"}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                DigiReady Check
              </span>
              <span className="text-xs sm:text-sm font-medium text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                ✓ Information Verified
              </span>
            </div>
          </div>
        </Card>

        {/* Downstream Impact: How This Affects Your Application */}
        {journey && (
          <Card className="p-6 border-blue-100 bg-gradient-to-br from-blue-50/40 via-white to-indigo-50/20 dark:border-blue-900/40 dark:from-slate-900 dark:to-blue-950/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5 mb-3.5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Application Readiness Impact
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  How This Affects Your {journey.serviceName} Application
                </h2>
              </div>
              <Link href={`/journey/${journey.serviceId.toLowerCase()}`}>
                <Button variant="primary" size="sm" className="text-xs font-semibold gap-1">
                  <span>View Application Journey</span>
                  <IconChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-850">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Required Documents</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white mt-1 block">
                  {journey.availableCount} of {journey.requiredCount} Available
                </span>
              </div>

              <div className="rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-850">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Requirement Status</span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1 block flex items-center gap-1">
                  <IconCheckCircle className="w-3.5 h-3.5" />
                  <span>Fulfills requirement in vault</span>
                </span>
              </div>

              <div className="rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-850">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Application State</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                  {journey.status === "READY_TO_APPLY"
                    ? "✓ Ready to Apply"
                    : journey.status === "NEEDS_ATTENTION"
                    ? "⚠ Information Conflict Needs Attention"
                    : "In Progress"}
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* DigiReady Document Trust & Verification Check Details */}
        <Card className="p-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                DigiReady Document Checks
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluates document structure, required metadata completeness, and consistency rules before you apply.
              </p>
            </div>
            <Badge variant="outline" size="sm">
              {verification.checks.filter((c: any) => c.status === "PASS").length} / {verification.checks.length} Passed
            </Badge>
          </div>

          <div className="space-y-2 text-xs">
            {verification.checks.map((check: any) => (
              <div
                key={check.key}
                className="flex items-start justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-850"
              >
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-900 dark:text-white block">
                    {check.label}
                  </span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {check.explanation}
                  </p>
                </div>
                <Badge variant={check.status === "PASS" ? "success" : "warning"} size="sm">
                  {check.status === "PASS" ? "Pass" : "Requires Review"}
                </Badge>
              </div>
            ))}
          </div>

          {/* Prototype Boundary Disclaimer */}
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-900/60">
            {verification.limitationNote}
          </div>
        </Card>

        {/* Interactive Image & Extracted Metadata Component */}
        <DocumentDetailClient document={document} verificationChecks={verification} />

        {/* Historical / Legacy Share Section (if active shares exist) */}
        <DocumentShareHistoryCard
          documentId={document.id}
          documentDisplayName={document.displayName}
        />
      </div>
    </AppShell>
  );
}

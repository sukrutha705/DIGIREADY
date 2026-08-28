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
  IconPlus,
  IconTrash,
  IconCalendar as Calendar,
  IconSparkles as Sparkles,
} from "@/components/ui/Icons";
import { UploadModal } from "@/components/documents/UploadModal";
import { useRouter } from "next/navigation";
import type { ApplicationJourney } from "@/server/journey/types";
import type { UserActiveServiceDTO } from "@/types/service";

interface DashboardJourneyCardProps {
  journey: ApplicationJourney | null;
  activePreparations?: UserActiveServiceDTO[];
  userId?: string;
}

export function DashboardJourneyCard({
  journey,
  activePreparations = [],
  userId,
}: DashboardJourneyCardProps) {
  const router = useRouter();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemovePreparation = async (e: React.MouseEvent, prepId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setRemovingId(prepId);
    try {
      const res = await fetch(`/api/services/active/${prepId}${userId ? `?userId=${userId}` : ""}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to remove active preparation:", err);
    } finally {
      setRemovingId(null);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "READY_TO_APPLY":
        return <Badge variant="success" size="sm">Ready to Apply</Badge>;
      case "NOT_ELIGIBLE":
        return <Badge variant="warning" size="sm">Not Eligible</Badge>;
      case "NEEDS_INFORMATION":
        return <Badge variant="warning" size="sm">More Info Needed</Badge>;
      case "APPLICATION_WINDOW_CLOSED":
        return <Badge variant="outline" size="sm">Window Closed</Badge>;
      case "NEEDS_ATTENTION":
        return <Badge variant="warning" size="sm">Needs Attention</Badge>;
      case "READY_FOR_VERIFICATION":
        return <Badge variant="warning" size="sm">Needs Verification</Badge>;
      case "MISSING_DOCUMENTS":
      default:
        return <Badge variant="warning" size="sm">Missing Documents</Badge>;
    }
  };

  const hasConflicts = journey?.consistency?.hasConflicts ?? false;
  const conflictCount = journey?.consistency?.conflictCount ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          router.refresh();
        }}
        onSuccess={() => router.refresh()}
      />

      {/* Primary Active Journey Card */}
      {journey ? (
        <Card className="p-5 border-indigo-200/80 bg-gradient-to-br from-indigo-50/60 via-white to-slate-50 dark:border-indigo-900/50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20 shadow-xs">
          <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
                  <IconFileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Primary Application Readiness
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
                <Link href={`/journey/${(journey.slug || journey.serviceId).toLowerCase()}`}>
                  <Button variant="primary" size="sm" className="gap-1.5 text-xs font-semibold shadow-xs">
                    <span>Continue Preparation</span>
                    <IconChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Readiness Overview Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {/* Metric 1: Eligibility */}
              <div className="rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800/80 dark:bg-slate-800/50">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Eligibility Status
                </span>
                <div className="flex items-center gap-1.5 mt-1 font-bold text-sm">
                  {journey.eligibility?.overallStatus === "ELIGIBLE" ? (
                    <>
                      <IconCheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="text-emerald-600 dark:text-emerald-400">Eligible</span>
                    </>
                  ) : journey.eligibility?.overallStatus === "NOT_ELIGIBLE" ? (
                    <>
                      <IconAlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span className="text-rose-600 dark:text-rose-400">Not Eligible</span>
                    </>
                  ) : (
                    <>
                      <IconAlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="text-amber-600 dark:text-amber-400">Info Needed</span>
                    </>
                  )}
                </div>
              </div>

              {/* Metric 2: Document Inventory */}
              <div className="rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800/80 dark:bg-slate-800/50">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Document Inventory
                </span>
                <div className="flex items-center gap-1.5 mt-1 font-bold text-slate-900 dark:text-white text-sm">
                  <span>{journey.availableCount} / {journey.requiredCount}</span>
                  <span className="text-[11px] font-normal text-slate-500">Present</span>
                </div>
              </div>

              {/* Metric 3: Identity Consistency */}
              <div className="rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800/80 dark:bg-slate-800/50">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Identity Consistency
                </span>
                <div className="flex items-center gap-1.5 mt-1 font-bold text-sm">
                  {hasConflicts ? (
                    <>
                      <IconAlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span className="text-rose-600 dark:text-rose-400">{conflictCount} Mismatch</span>
                    </>
                  ) : (
                    <>
                      <IconCheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="text-emerald-600 dark:text-emerald-400">Consistent</span>
                    </>
                  )}
                </div>
              </div>

              {/* Metric 4: Application Window */}
              <div className="rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800/80 dark:bg-slate-800/50">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Application Window
                </span>
                <div className="flex items-center gap-1.5 mt-1 font-bold text-slate-900 dark:text-white text-sm">
                  {journey.applicationWindow?.status === "OPEN" ? (
                    <>
                      <IconCheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="text-emerald-600 dark:text-emerald-400 truncate">Open</span>
                    </>
                  ) : journey.applicationWindow?.status === "CLOSED" ? (
                    <>
                      <IconAlertCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="text-zinc-500 truncate">Closed</span>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="text-blue-600 dark:text-blue-400 truncate">Scheduled</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Conflict Alert Banner with Direct Link */}
            {hasConflicts && (
              <div className="rounded-xl border border-rose-300 bg-rose-50/80 p-3 text-xs dark:border-rose-900/60 dark:bg-rose-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <IconAlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-bold text-rose-900 dark:text-rose-200">
                    ⚠ {conflictCount} identity conflict{conflictCount > 1 ? "s" : ""} detected across your official records.
                  </span>
                </div>
                <Link
                  href={`/journey/${(journey.slug || journey.serviceId).toLowerCase()}#conflicts`}
                  className="inline-flex items-center gap-1 font-semibold text-rose-900 hover:underline dark:text-rose-200 text-xs shrink-0"
                >
                  <span>View Official Correction Guidance →</span>
                </Link>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card className="p-5 border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/30 dark:border-indigo-900/40 dark:from-slate-900 dark:to-indigo-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
                <IconFileText className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
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
              <Link href="/services">
                <Button variant="primary" size="sm" className="gap-1.5 shrink-0 text-xs font-semibold">
                  <IconPlus className="w-3.5 h-3.5" />
                  <span>Start New Application</span>
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Active Application Preparations Grid */}
      <div className="mt-2">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Your Application Preparations ({activePreparations.length})
            </span>
          </div>
          <Link href="/services">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 py-1 h-7">
              <IconPlus className="w-3.5 h-3.5 text-indigo-600" />
              <span>Explore &amp; Add Services</span>
            </Button>
          </Link>
        </div>

        {activePreparations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500 dark:border-slate-800">
            No active preparations yet. Explore the{" "}
            <Link href="/services" className="text-indigo-600 underline font-semibold">
              Universal Service Registry
            </Link>{" "}
            to start tracking readiness for exams and government services.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activePreparations.map((prep) => {
              const summary = prep.readinessSummary;
              const isReady = summary?.ready;

              return (
                <div
                  key={prep.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs transition-all hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {prep.category.replace(/_/g, " ")}
                      </span>
                      {isReady ? (
                        <Badge variant="success" size="sm" className="text-[10px] py-0 px-1.5">
                          Ready to Apply
                        </Badge>
                      ) : summary && summary.missingCount > 0 ? (
                        <Badge variant="warning" size="sm" className="text-[10px] py-0 px-1.5">
                          {summary.missingCount} Missing
                        </Badge>
                      ) : (
                        <Badge variant="warning" size="sm" className="text-[10px] py-0 px-1.5">
                          Review Needed
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                      {prep.serviceName}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {prep.authority || "Government Authority"}
                    </p>

                    {summary && (
                      <div className="mt-2.5 flex items-center justify-between text-xs rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-slate-800/60">
                        <span className="text-[11px] text-slate-500 font-medium">Vault Documents</span>
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                          {summary.availableCount} / {summary.requiredCount} Present
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <Link
                      href={`/journey/${prep.slug}`}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 inline-flex items-center gap-1"
                    >
                      <span>Continue Preparation</span>
                      <IconChevronRight className="w-3 h-3" />
                    </Link>

                    <button
                      onClick={(e) => handleRemovePreparation(e, prep.id)}
                      disabled={removingId === prep.id}
                      className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                      title="Remove from active preparations"
                    >
                      <IconTrash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

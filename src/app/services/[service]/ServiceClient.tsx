"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ServiceRequirement } from "@/server/services/types";
import type { ServiceEligibilityRule } from "@/server/eligibility/types";
import type { ApplicationWindowInfo } from "@/server/application-window/types";
import {
  IconChevronLeft as ArrowLeft,
  IconShieldCheck as ShieldCheck,
  IconCalendar as Calendar,
  IconFileText as FileText,
  IconExternalLink as ExternalLink,
  IconCheckCircle as CheckCircle,
  IconClock as Clock,
  IconSparkles as Sparkles,
  IconHelp as Info,
  IconBuilding as Building,
  IconMapPin as MapPin,
  IconBookmarkPlus as BookmarkPlus,
  IconArrowRight as ArrowRight,
} from "@/components/ui/Icons";

interface ServiceClientProps {
  service: ServiceRequirement;
  eligibilityRule: ServiceEligibilityRule;
  applicationWindow: ApplicationWindowInfo;
}

export function ServiceClient({
  service,
  eligibilityRule,
  applicationWindow,
}: ServiceClientProps) {
  const router = useRouter();
  const [addingToDashboard, setAddingToDashboard] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAddToDashboard = async () => {
    try {
      setAddingToDashboard(true);
      const res = await fetch("/api/services/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: service.slug || service.serviceId }),
      });
      if (res.ok) {
        setAdded(true);
      }
    } catch {
      // safe error
    } finally {
      setAddingToDashboard(false);
    }
  };

  const getCategoryBadge = (cat?: string) => {
    switch (cat) {
      case "EXAMINATION":
        return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
      case "RECRUITMENT":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "SCHOLARSHIP":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "GOVERNMENT_SCHEME":
        return "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20";
      case "CERTIFICATE":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20";
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/services" className="hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Service Discovery
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-100 font-medium truncate">{service.serviceName}</span>
      </div>

      {/* Main Header */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getCategoryBadge(
                  service.category
                )}`}
              >
                {service.category || "SERVICE"}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3" />
                Verified Official
              </span>
            </div>

            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {service.serviceName}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-600 dark:text-zinc-400">
              {service.authority && (
                <div className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{service.authority}</span>
                </div>
              )}
              {service.jurisdiction && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{service.jurisdiction}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleAddToDashboard}
              disabled={addingToDashboard || added}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-medium border border-zinc-200 dark:border-zinc-700 transition-colors disabled:opacity-50"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>{added ? "Added to Dashboard" : "+ Add to Dashboard"}</span>
            </button>

            <Link
              href={`/journey/${encodeURIComponent(service.slug || service.serviceId)}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Check My Readiness</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {service.description && (
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed pt-2 border-t border-zinc-100 dark:border-zinc-800">
            {service.description}
          </p>
        )}
      </div>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Statutory Eligibility */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Statutory Eligibility Criteria
            </h2>
          </div>

          <div className="space-y-2.5 text-xs">
            {eligibilityRule.minEducationQualification && (
              <div className="flex items-start gap-2">
                <span className="font-semibold text-zinc-500 min-w-24">Education:</span>
                <span className="text-zinc-800 dark:text-zinc-200 font-medium">
                  {eligibilityRule.minEducationQualification.replace(/_/g, " ")}
                  {eligibilityRule.requiredStreams && ` (${eligibilityRule.requiredStreams.join(", ")})`}
                </span>
              </div>
            )}

            {(eligibilityRule.minAge || eligibilityRule.maxAge) && (
              <div className="flex items-start gap-2">
                <span className="font-semibold text-zinc-500 min-w-24">Age Limits:</span>
                <span className="text-zinc-800 dark:text-zinc-200 font-medium">
                  Min {eligibilityRule.minAge ?? 0} to Max {eligibilityRule.maxAge ?? "No limit"} years
                  {eligibilityRule.ageReferenceDate && ` (as of ${eligibilityRule.ageReferenceDate})`}
                </span>
              </div>
            )}

            {eligibilityRule.requiredDomicile && (
              <div className="flex items-start gap-2">
                <span className="font-semibold text-zinc-500 min-w-24">Domicile:</span>
                <span className="text-zinc-800 dark:text-zinc-200 font-medium">
                  {eligibilityRule.requiredDomicile}
                </span>
              </div>
            )}

            {eligibilityRule.acceptedNationalities && (
              <div className="flex items-start gap-2">
                <span className="font-semibold text-zinc-500 min-w-24">Citizenship:</span>
                <span className="text-zinc-800 dark:text-zinc-200 font-medium">
                  {eligibilityRule.acceptedNationalities.join(", ")}
                </span>
              </div>
            )}

            {eligibilityRule.customConditionSummary && (
              <div className="bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-lg text-zinc-600 dark:text-zinc-400 leading-normal">
                {eligibilityRule.customConditionSummary}
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Application Window & Timeline */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <Calendar className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Application Window & Schedule
            </h2>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-500">Status:</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {applicationWindow.statusLabel}
              </span>
            </div>

            {applicationWindow.applicationEnd && (
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-500">Registration Deadline:</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {new Date(applicationWindow.applicationEnd).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}

            {applicationWindow.examDate && (
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-500">Exam Date:</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {new Date(applicationWindow.examDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}

            {applicationWindow.notes && (
              <div className="bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-lg text-zinc-600 dark:text-zinc-400 leading-normal">
                {applicationWindow.notes}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Required Documents Section */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Required Documents Checklist ({service.requiredDocuments.length})
            </h2>
          </div>
          <span className="text-xs text-zinc-500">
            {service.requiredDocuments.filter((d) => d.required).length} Mandatory Documents
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {service.requiredDocuments.map((doc, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800/60"
            >
              <CheckCircle
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  doc.required ? "text-indigo-500" : "text-zinc-400"
                }`}
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {doc.displayName}
                  </span>
                  <span
                    className={`text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded ${
                      doc.required
                        ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                        : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                    }`}
                  >
                    {doc.required ? "Mandatory" : "Optional"}
                  </span>
                </div>
                {doc.notes && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {doc.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Official Links & Prototype Disclaimer */}
      <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
            <Info className="w-4 h-4 text-zinc-400 shrink-0" />
            <span>Official Authority Portals:</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {service.officialWebsite && (
              <a
                href={service.officialWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <span>Authority Website</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {service.officialApplicationUrl && (
              <a
                href={service.officialApplicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                <span>Live Application Portal</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed border-t border-zinc-200/60 dark:border-zinc-800/60 pt-3">
          {service.prototypeNotice ||
            "DigiReady helps citizens prepare for applications by checking available requirements, documents, eligibility information, and consistency. It does not submit applications or guarantee government approval. Always verify current requirements and deadlines with the relevant official authority."}
        </p>
      </div>
    </div>
  );
}

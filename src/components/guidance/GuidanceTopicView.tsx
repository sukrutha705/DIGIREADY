"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  IconAlertCircle,
  IconCheckCircle,
  IconShieldCheck,
  IconBuilding,
  IconMapPin,
  IconExternalLink,
  IconClock,
  IconUpload,
  IconSearch,
  IconChevronLeft,
  IconFileText,
} from "@/components/ui/Icons";
import { UploadModal } from "@/components/documents/UploadModal";
import { useRouter } from "next/navigation";
import type { GuidanceTopicDetail } from "@/server/guidance/service";
import type { CorrectionCentreResult } from "@/server/centres/types";

interface GuidanceTopicViewProps {
  topic: GuidanceTopicDetail;
}

export function GuidanceTopicView({ topic }: GuidanceTopicViewProps) {
  const router = useRouter();
  const [cityInput, setCityInput] = useState<string>(
    topic.centreLookup.normalizedCity || ""
  );
  const [centreData, setCentreData] = useState<CorrectionCentreResult>(
    topic.centreLookup
  );
  const [isSearchingCentre, setIsSearchingCentre] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isRechecking, setIsRechecking] = useState(false);

  const handleSearchCentres = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = cityInput.trim();
    if (!trimmed) return;

    setIsSearchingCentre(true);
    try {
      const res = await fetch(
        `/api/centres?authority=${encodeURIComponent(
          topic.authority.id
        )}&city=${encodeURIComponent(trimmed)}`
      );
      if (res.ok) {
        const data = await res.json();
        setCentreData(data);
      }
    } catch {
      // safe error
    } finally {
      setIsSearchingCentre(false);
    }
  };

  const handleRecheck = async () => {
    setIsRechecking(true);
    try {
      await fetch("/api/consistency");
      router.refresh();
    } catch {
      // safe error
    } finally {
      setIsRechecking(false);
    }
  };

  const getSeverityBadge = () => {
    switch (topic.severity) {
      case "BLOCKING":
        return (
          <Badge variant="warning" size="md" className="gap-1 font-bold">
            <IconAlertCircle className="w-3.5 h-3.5" /> BLOCKING ISSUE
          </Badge>
        );
      case "WARNING":
        return (
          <Badge variant="warning" size="md" className="gap-1 font-semibold">
            <IconAlertCircle className="w-3.5 h-3.5" /> NEEDS ATTENTION
          </Badge>
        );
      case "INFO":
      default:
        return (
          <Badge variant="info" size="md" className="gap-1 font-medium">
            <IconShieldCheck className="w-3.5 h-3.5" /> OFFICIAL GUIDANCE
          </Badge>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto py-2">
      {/* Top Breadcrumb / Back Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/guidance"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
        >
          <IconChevronLeft className="w-4 h-4" />
          <span>Back to Guidance Center</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/services"
            className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Explore Services
          </Link>
          <span className="text-zinc-300 dark:text-zinc-700">•</span>
          <Link
            href="/dashboard"
            className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Dashboard
          </Link>
        </div>
      </div>

      {/* HEADER */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-xs font-black tracking-wider uppercase text-blue-600 dark:text-blue-400">
            Official Guidance Center
          </span>
          {getSeverityBadge()}
          <Badge variant="outline" size="sm">
            {topic.correctionMethod} Channel
          </Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Resolve an Issue
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Understand what&apos;s wrong, follow the official correction process, and recheck your documents when you&apos;re done.
        </p>

        {/* Standard DigiReady Disclaimer */}
        <div className="mt-3.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 flex items-start gap-2.5">
          <IconShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <span>
            DigiReady helps citizens prepare for applications by checking available requirements, documents, eligibility information, and consistency. It does not submit applications or guarantee government approval. Always verify current requirements and deadlines with the relevant official authority.
          </span>
        </div>
      </div>

      {/* SECTION 1 — ISSUE SUMMARY */}
      <Card className="p-6">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Section 1
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Issue Summary
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {topic.title}
          </span>
        </div>

        {topic.documentA && topic.documentB && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {topic.documentA.name}
              </span>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                &ldquo;{topic.documentA.value}&rdquo;
              </p>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Issuer: {topic.documentA.issuer}
              </span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {topic.documentB.name}
              </span>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                &ldquo;{topic.documentB.value}&rdquo;
              </p>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Issuer: {topic.documentB.issuer}
              </span>
            </div>
          </div>
        )}

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {topic.explanation}
        </p>
      </Card>

      {/* SECTION 2 — WHY THIS MATTERS */}
      <Card className="p-6 border-amber-100 bg-amber-50/20 dark:border-amber-900/30 dark:bg-slate-900">
        <div className="flex items-center gap-2 mb-2">
          <IconAlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Section 2: Why This Matters
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-6">
          {topic.whyItMatters}
        </p>
      </Card>

      {/* SECTION 3 — WHAT YOU SHOULD DO */}
      <Card className="p-6">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Section 3
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              What You Should Do
            </h2>
          </div>
        </div>

        <div className="space-y-2">
          {topic.whatYouShouldDo.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 rounded-lg bg-slate-50/70 p-2.5 text-xs text-slate-700 dark:bg-slate-800/40 dark:text-slate-300"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {idx + 1}
              </span>
              <span className="leading-relaxed mt-0.5">{item}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* SECTION 4 — OFFICIAL AUTHORITY */}
      <Card className="p-6">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Section 4
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Responsible Official Authority
            </h2>
          </div>
          <Badge variant="info" size="sm">
            {topic.authority.shortName}
          </Badge>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <IconBuilding className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {topic.authority.name}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Jurisdiction: {topic.authority.jurisdiction} • Channel: {topic.correctionMethod}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              Portal: {topic.authority.portalName}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {topic.authority.officialUrl && (
              <a
                href={topic.authority.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
              >
                <span>Open Official Portal</span>
                <IconExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 italic leading-relaxed">
          {topic.authority.disclaimer}
        </p>
      </Card>

      {/* SECTION 5 — STEP-BY-STEP GUIDANCE */}
      <Card className="p-6">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Section 5
          </span>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Step-by-Step Official Correction Process
          </h2>
        </div>

        <div className="space-y-3.5">
          {topic.stepByStep.map((step) => (
            <div
              key={step.number}
              className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-800/20 flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-700 text-xs font-bold dark:bg-slate-800 dark:text-slate-300">
                    {step.number}
                  </span>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    {step.title}
                  </h3>
                </div>
                {step.appointmentRequired && (
                  <Badge variant="outline" size="sm" className="gap-1 text-[10px]">
                    <IconClock className="w-3 h-3" /> Appointment May Be Required
                  </Badge>
                )}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-7">
                {step.explanation}
              </p>

              {step.officialLink && (
                <div className="pl-7 pt-1">
                  <a
                    href={step.officialLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline dark:text-blue-400"
                  >
                    <span>Official portal link</span>
                    <IconExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* SECTION 6 — REQUIRED SUPPORTING DOCUMENTS */}
      <Card className="p-6">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Section 6
          </span>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Required Supporting Proofs Checklist
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Prepare these documents before submitting your correction request or visiting a centre.
          </p>
        </div>

        <div className="space-y-2">
          {topic.requiredDocuments.map((doc, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50/60 p-2.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300"
            >
              <IconCheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{doc}</span>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 italic">
          Requirements may vary based on the specific correction category. Always verify acceptable document lists on the official authority portal.
        </p>
      </Card>

      {/* SECTION 7 — FIND A CORRECTION CENTRE */}
      <Card className="p-6">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Section 7
          </span>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Find an Official Correction Facility
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Locate authorized official centres in your city. DigiReady only collects your city name.
          </p>
        </div>

        {/* City Input Form */}
        <form onSubmit={handleSearchCentres} className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <IconMapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              placeholder="Which city are you in? (e.g. Bengaluru, Delhi, Mumbai)"
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSearchingCentre}
            className="gap-1.5 text-xs font-semibold shrink-0"
          >
            <IconSearch className="w-3.5 h-3.5" />
            <span>{isSearchingCentre ? "Searching..." : "Find Centres"}</span>
          </Button>
        </form>

        {/* Privacy Note */}
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4 italic">
          {centreData.privacyNote ||
            "We only need your city. DigiReady does not need your GPS location or exact address."}
        </p>

        {/* Results */}
        {centreData.isVerifiedAvailable && centreData.verifiedCentres.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Verified official centres in {centreData.normalizedCity}:
              </span>
              <Badge variant="success" size="sm">
                {centreData.verifiedCentres.length} Verified Facilities
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {centreData.verifiedCentres.map((centre) => (
                <div
                  key={centre.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-800/30 flex flex-col justify-between gap-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-bold text-slate-900 dark:text-white">
                        {centre.centreName}
                      </h4>
                      <Badge variant="success" size="sm" className="text-[10px]">
                        Verified
                      </Badge>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                      {centre.address}
                    </p>
                    <span className="text-[10px] text-slate-400 block">
                      Services: {centre.serviceTypesSupported.join(", ")}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400">
                      Source: {centre.officialSource}
                    </span>
                    {centre.appointmentUrl && (
                      <a
                        href={centre.appointmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline dark:text-blue-400"
                      >
                        <span>Book Slot</span>
                        <IconExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Safe Fallback */
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-xs dark:border-amber-900/60 dark:bg-slate-900 flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
              <IconAlertCircle className="w-4 h-4 shrink-0" />
              <span>
                {centreData.safeFallbackMessage ||
                  `Verified centre directory is currently unavailable for ${cityInput || "this city"}.`}
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              Use the official statutory portal locator to find authorized enrollment and correction centres across India without relying on unverified directories.
            </p>
            <div className="pt-1">
              <a
                href={centreData.officialLocatorUrl || topic.authority.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
              >
                <span>Open Official Authority Locator</span>
                <IconExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}
      </Card>

      {/* SECTION 8 — AFTER CORRECTION */}
      <Card className="p-6">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Section 8
          </span>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            After Official Correction Lifecycle
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Follow the completion steps to re-evaluate your application readiness in DigiReady.
          </p>
        </div>

        {/* 7-Step Lifecycle Visual Pipeline */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5 text-[10px] text-center font-bold mb-5">
          {topic.afterCorrectionLifecycle.steps.map((step, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 truncate"
            >
              {step}
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
          {topic.afterCorrectionLifecycle.recheckActionNote}
        </p>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsUploadModalOpen(true)}
            className="gap-1.5 text-xs font-semibold"
          >
            <IconUpload className="w-3.5 h-3.5" />
            <span>Upload Corrected Document</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={isRechecking}
            onClick={handleRecheck}
            className="gap-1.5 text-xs font-semibold"
          >
            <IconCheckCircle className="w-3.5 h-3.5" />
            <span>{isRechecking ? "Rechecking..." : "Recheck Documents"}</span>
          </Button>
        </div>
      </Card>

      {/* Upload Modal for Re-Upload */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          router.refresh();
        }}
        preselectedDocumentName={topic.documentA?.name || topic.title}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}

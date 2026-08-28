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
  IconFileText,
  IconExternalLink,
  IconChevronRight,
  IconMapPin,
  IconBuilding,
  IconSearch,
  IconClock,
  IconHelp,
} from "@/components/ui/Icons";
import type { ConflictIssue } from "@/server/conflicts/types";
import type { CorrectionCentre, CorrectionCentreResult } from "@/server/centres/types";

interface ConflictIssueCardProps {
  issue: ConflictIssue;
  onUploadCorrectedDoc?: (docTypeKey: string) => void;
  onRecheck?: () => void;
}

export function ConflictIssueCard({
  issue,
  onUploadCorrectedDoc,
  onRecheck,
}: ConflictIssueCardProps) {
  const [cityInput, setCityInput] = useState<string>(issue.userCity || "Bengaluru");
  const [centreResult, setCentreResult] = useState<CorrectionCentreResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  const handleSearchCentres = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cityInput.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/centres?authority=${encodeURIComponent(issue.authority.id)}&city=${encodeURIComponent(
          cityInput.trim()
        )}`
      );
      if (res.ok) {
        const data: CorrectionCentreResult = await res.json();
        setCentreResult(data);
      }
    } catch (err) {
      console.error("Failed to fetch correction centres", err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Card className="overflow-hidden border-amber-200/80 bg-amber-50/20 dark:border-amber-900/40 dark:bg-amber-950/10 p-5 sm:p-6 transition-all shadow-sm">
      {/* 1. Header & Severity Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 dark:border-amber-800/40 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
            <IconAlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                {issue.severity === "BLOCKING" ? "BLOCKING ISSUE" : "WARNING ISSUE"}
              </span>
              <Badge variant={issue.severity === "BLOCKING" ? "warning" : "default"} size="sm">
                {issue.fieldLabel} Mismatch
              </Badge>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
              {issue.fieldLabel} Conflict Detected Across Documents
            </h3>
          </div>
        </div>

        {issue.severity === "BLOCKING" && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-800/60">
            Blocks Application Readiness
          </span>
        )}
      </div>

      {/* 2. Side-by-Side Document Comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
        <div className="rounded-xl border border-slate-200/80 bg-white/80 dark:border-slate-800 dark:bg-slate-900/60 p-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            <IconFileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{issue.documentA.documentDisplayName}</span>
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-white break-words">
            "{issue.valueA || issue.documentA.value}"
          </p>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
            Extracted from official document image
          </span>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white/80 dark:border-slate-800 dark:bg-slate-900/60 p-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            <IconFileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{issue.documentB.documentDisplayName}</span>
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-white break-words">
            "{issue.valueB || issue.documentB.value}"
          </p>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
            Extracted from official document image
          </span>
        </div>
      </div>

      {/* 3. Why This Matters & What To Do */}
      <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
        <div className="rounded-xl bg-amber-100/40 dark:bg-amber-900/20 p-3 border border-amber-200/40 dark:border-amber-800/30">
          <span className="font-bold text-amber-900 dark:text-amber-200 block mb-0.5">
            Why This Matters
          </span>
          <p className="text-amber-800 dark:text-amber-300/90">
            {issue.whyItMatters ||
              "These documents contain different identity information and may cause verification flags or rejection during official examination/scheme verification."}
          </p>
        </div>

        <div className="rounded-xl bg-slate-100/60 dark:bg-slate-800/40 p-3 border border-slate-200/60 dark:border-slate-700/40">
          <span className="font-bold text-slate-900 dark:text-white block mb-0.5">
            What You Should Do
          </span>
          <p className="text-slate-600 dark:text-slate-400">
            DigiReady detected this conflict but cannot determine which official record should be changed. You should review your records and correct the appropriate official document through its statutory issuing authority.
          </p>
        </div>
      </div>

      {/* 4. Recommended Statutory Authority */}
      <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/50 dark:bg-slate-900/40 rounded-xl p-3.5 border">
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Recommended Issuing Authority
          </span>
          <span className="text-sm font-bold text-slate-900 dark:text-white block">
            {issue.authority.name}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {issue.authority.portalName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {issue.authority.officialUrl && (
            <a
              href={issue.authority.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
            >
              <span>Official Portal</span>
              <IconExternalLink className="w-3 h-3" />
            </a>
          )}
          <Link
            href={`/guidance/${issue.field === "name" ? "name-mismatch" : issue.field === "dateOfBirth" ? "dob-mismatch" : issue.field === "parentName" ? "parent-name-mismatch" : issue.field === "address" ? "address-mismatch" : "name-mismatch"}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900 transition"
          >
            <span>Guidance Center</span>
            <IconChevronRight className="w-3 h-3" />
          </Link>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowSteps(!showSteps)}
            className="text-xs"
          >
            {showSteps ? "Hide Steps" : "View Correction Steps"}
          </Button>
        </div>
      </div>

      {/* Expandable Correction Steps */}
      {showSteps && issue.resolutionPlan && (
        <div className="mt-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs animate-in fade-in duration-200 space-y-3">
          <span className="font-bold text-slate-900 dark:text-white block">
            Official Correction Process Steps:
          </span>
          <ol className="list-decimal pl-4 space-y-1.5 text-slate-600 dark:text-slate-300">
            {issue.resolutionPlan.numberedSteps.map((step, idx) => (
              <li key={idx} className="pl-1">
                {step}
              </li>
            ))}
          </ol>

          {issue.resolutionPlan.requiredSupportingDocuments &&
            issue.resolutionPlan.requiredSupportingDocuments.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Supporting Documents You May Need:
                </span>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-500 dark:text-slate-400">
                  {issue.resolutionPlan.requiredSupportingDocuments.map((doc, idx) => (
                    <li key={idx}>
                      {typeof doc === "string" ? doc : (doc as any).documentName}
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      )}

      {/* 5. Location-Aware Official Centre Finder */}
      <div className="mt-5 rounded-xl border border-blue-200/80 bg-blue-50/40 dark:border-blue-900/40 dark:bg-blue-950/20 p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-2">
          <IconBuilding className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Find an Official Correction Centre
          </h4>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
          Need help locating an official centre? Tell us your city to view verified correction facilities.
        </p>

        {/* City Input Form */}
        <form onSubmit={handleSearchCentres} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <IconMapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              placeholder="Which city are you in? (e.g. Bengaluru, Mysuru, Delhi)"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={isSearching || !cityInput.trim()}
            className="text-xs font-semibold px-4"
          >
            {isSearching ? "Searching..." : "Find Correction Centres"}
          </Button>
        </form>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
          <IconHelp className="w-3 h-3 text-slate-400" />
          <span>We only need your city. DigiReady does not need your GPS location or exact address.</span>
        </p>

        {/* Centre Results */}
        {centreResult && (
          <div className="mt-4 pt-3 border-t border-blue-200/60 dark:border-blue-800/40 space-y-3 animate-in fade-in duration-200">
            {centreResult.isVerifiedAvailable && centreResult.verifiedCentres.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Verified Official Centres in {centreResult.normalizedCity}:
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <IconShieldCheck className="w-3.5 h-3.5" />
                    Verified Official Source ({centreResult.authorityName})
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {centreResult.verifiedCentres.map((centre) => (
                    <div
                      key={centre.id}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-xs space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-xs">
                          {centre.centreName}
                        </span>
                        <Badge variant="success" size="sm" className="text-[10px]">
                          Officially Verified
                        </Badge>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                        {centre.address} {centre.pincode && `- ${centre.pincode}`}
                      </p>
                      {centre.workingHours && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <IconClock className="w-3 h-3 text-slate-400" />
                          <span>{centre.workingHours}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <span className="text-slate-400">
                          Supported: {centre.serviceTypesSupported.slice(0, 3).join(", ")}
                        </span>
                        {centre.appointmentUrl ? (
                          <a
                            href={centre.appointmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                          >
                            <span>Book Official Appointment</span>
                            <IconExternalLink className="w-3 h-3" />
                          </a>
                        ) : centre.officialWebsite ? (
                          <a
                            href={centre.officialWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                          >
                            <span>Official Portal</span>
                            <IconExternalLink className="w-3 h-3" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 text-xs space-y-2">
                <p className="text-amber-800 dark:text-amber-300">
                  {centreResult.safeFallbackMessage ||
                    `Official centre information could not be verified for ${centreResult.normalizedCity}. For safety, DigiReady won't guess or recommend an unverified centre.`}
                </p>
                <a
                  href={centreResult.officialLocatorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 transition"
                >
                  <span>Open {centreResult.officialPortalName}</span>
                  <IconExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. Action Buttons: Upload Corrected Document / Recheck */}
      <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          Once you obtain the updated official document, upload it to clear this conflict.
        </span>

        <div className="flex items-center gap-2">
          {onUploadCorrectedDoc && (
            <Button
              size="sm"
              onClick={() => onUploadCorrectedDoc(issue.documentA.documentTypeKey)}
              className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Upload Corrected Document
            </Button>
          )}
          {onRecheck && (
            <Button size="sm" variant="outline" onClick={onRecheck} className="text-xs">
              Recheck After Correction
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

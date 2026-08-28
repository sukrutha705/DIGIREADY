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
  IconFileText,
} from "@/components/ui/Icons";
import { ConflictCard } from "@/components/consistency/ConflictCard";
import { UploadModal } from "@/components/documents/UploadModal";
import { EligibilityCard } from "@/components/eligibility/EligibilityCard";
import { ApplicationWindowCard } from "@/components/application-window/ApplicationWindowCard";
import { ReadinessBlockersCard } from "@/components/journey/ReadinessBlockersCard";
import { useRouter } from "next/navigation";
import type { ApplicationJourney, JourneyDocument } from "@/server/journey/types";
import type { DocumentGuidance } from "@/server/guidance/types";
import { getCanonicalDocumentSlug } from "@/server/guidance/slugs";

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

  // Profile modal state for providing missing eligibility attributes
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    dateOfBirth: "",
    gender: "Female",
    domicileState: "Karnataka",
    category: "General",
    educationQualification: "12TH_PASS",
    annualFamilyIncome: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      if (res.ok) {
        setIsProfileModalOpen(false);
        router.refresh();
      }
    } catch {
      // safe error
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Primary Readiness Blockers / Ready To Apply Card */}
      <ReadinessBlockersCard
        blockers={journey.blockers || []}
        isReady={journey.status === "READY_TO_APPLY"}
        serviceName={journey.serviceName}
        officialApplicationUrl={journey.officialApplicationUrl}
        officialWebsite={journey.officialWebsite}
        onActionClick={(blocker) => {
          if (blocker.category === "DOCUMENT_MISSING" && blocker.documentType) {
            handleOpenUpload(blocker.documentType);
          } else if (blocker.category === "ELIGIBILITY") {
            setIsProfileModalOpen(true);
          }
        }}
      />

      {/* 2. Statutory Eligibility Card */}
      {journey.eligibility && (
        <div id="eligibility">
          <EligibilityCard
            eligibility={journey.eligibility}
            onUpdateProfile={() => setIsProfileModalOpen(true)}
          />
        </div>
      )}

      {/* 3. Application Window Card */}
      {journey.applicationWindow && (
        <div id="window">
          <ApplicationWindowCard windowInfo={journey.applicationWindow} />
        </div>
      )}

      {/* 4. Required Documents Checklist Card */}
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
                      <Link href={`/guidance/${getCanonicalDocumentSlug(req.documentType)}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs text-amber-700 border-amber-200 hover:bg-amber-50 dark:border-amber-900/60 dark:text-amber-300 dark:hover:bg-amber-950/40"
                        >
                          <IconHelp className="w-3.5 h-3.5" />
                          <span>Get Guidance</span>
                        </Button>
                      </Link>
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

      {/* 5. Cross-Document Consistency & Official Correction Guidance */}
      {journey.consistency && (
        <div id="conflicts">
          <ConflictCard consistency={journey.consistency} />
        </div>
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

      {/* Missing Document Guidance Modal */}
      {activeGuidance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto flex flex-col gap-4">
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
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                <span className="font-bold text-slate-900 dark:text-white text-xs">
                  What is this document?
                </span>
                <p className="mt-1 text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                  {activeGuidance.description}
                </p>
              </div>

              {activeGuidance.authorityNote && (
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Issuing Authority:
                  </span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {activeGuidance.authorityNote}
                  </span>
                </div>
              )}

              {activeGuidance.nextSteps && activeGuidance.nextSteps.length > 0 && (
                <div className="flex flex-col gap-2 pt-1">
                  <span className="font-bold text-slate-900 dark:text-white">
                    How to obtain this document:
                  </span>
                  <ol className="list-decimal pl-4 space-y-1.5 text-slate-600 dark:text-slate-300">
                    {activeGuidance.nextSteps.map((step: string, idx: number) => (
                      <li key={idx} className="pl-1">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveGuidance(null)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const type = activeGuidance.documentType;
                  const name = activeGuidance.displayName;
                  setActiveGuidance(null);
                  handleOpenUpload(type, name);
                }}
                className="gap-1.5"
              >
                <IconFileText className="w-3.5 h-3.5" />
                <span>Upload Document</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Information Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Provide Eligibility Information
                </h3>
                <p className="text-xs text-zinc-500">
                  Enter information needed to evaluate statutory eligibility
                </p>
              </div>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <IconClose className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={profileForm.dateOfBirth}
                  onChange={(e) => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs"
                />
              </div>

              <div>
                <label className="font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                  Education Qualification
                </label>
                <select
                  value={profileForm.educationQualification}
                  onChange={(e) => setProfileForm({ ...profileForm, educationQualification: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs"
                >
                  <option value="10TH_PASS">10th Standard / SSLC</option>
                  <option value="12TH_PASS">12th Standard / PUC / 10+2</option>
                  <option value="GRADUATE">Bachelor&apos;s Degree / Graduate</option>
                  <option value="POST_GRADUATE">Master&apos;s Degree / Post-Graduate</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                  State of Domicile
                </label>
                <input
                  type="text"
                  value={profileForm.domicileState}
                  onChange={(e) => setProfileForm({ ...profileForm, domicileState: e.target.value })}
                  placeholder="e.g. Karnataka"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs"
                />
              </div>

              <div>
                <label className="font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                  Social Category
                </label>
                <select
                  value={profileForm.category}
                  onChange={(e) => setProfileForm({ ...profileForm, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs"
                >
                  <option value="General">General / Unreserved</option>
                  <option value="OBC">OBC (Other Backward Classes)</option>
                  <option value="SC">SC (Scheduled Castes)</option>
                  <option value="ST">ST (Scheduled Tribes)</option>
                  <option value="EWS">EWS (Economically Weaker Section)</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                  Annual Family Income (₹)
                </label>
                <input
                  type="number"
                  value={profileForm.annualFamilyIncome}
                  onChange={(e) => setProfileForm({ ...profileForm, annualFamilyIncome: e.target.value })}
                  placeholder="e.g. 150000"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsProfileModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={savingProfile}
                >
                  {savingProfile ? "Saving..." : "Save Information"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

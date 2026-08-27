"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  IconSparkles,
  IconClose,
  IconSend,
  IconCheckCircle,
  IconAlertCircle,
  IconChevronRight,
  IconHelp,
  IconShieldCheck,
  IconLock,
} from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { AssistantIntent } from "@/server/assistant/types";
import type { ServiceReadiness } from "@/server/services/types";
import type { DocumentGuidance } from "@/server/guidance/types";
import type { DocumentVerification } from "@/server/verification/types";
import type { SharePreviewDTO, DocumentShareRecord } from "@/server/sharing/types";
import type { ApplicationJourney } from "@/server/journey/types";
import { ApplicationJourneyCard } from "@/components/journey/ApplicationJourneyCard";

import { ConflictCard } from "@/components/consistency/ConflictCard";
import type { ConsistencyAssessment } from "@/server/consistency/types";

const INITIAL_SUGGESTIONS = [
  "I want to apply for KCET",
  "What documents do I need?",
  "Check my documents",
  "Do I have all the required documents?",
  "Is there any conflict in my documents?",
  "Why is my document not verified?",
  "What am I missing?",
  "Upload a document",
];

interface AssistantMessageState {
  query: string;
  intent: AssistantIntent;
  friendlyResponse: string;
  suggestions?: string[];
  readiness?: ServiceReadiness | null;
  guidance?: DocumentGuidance | null;
  verification?: DocumentVerification | null;
  sharePreview?: SharePreviewDTO | null;
  journey?: ApplicationJourney | null;
  consistency?: ConsistencyAssessment | null;
}

export function FloatingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<AssistantMessageState | null>(null);

  // Sharing state in assistant
  const [assistantSelectedFieldIds, setAssistantSelectedFieldIds] = useState<string[]>([]);
  const [assistantConsentGiven, setAssistantConsentGiven] = useState(false);
  const [isSubmittingShare, setIsSubmittingShare] = useState(false);
  const [activeShareResult, setActiveShareResult] = useState<DocumentShareRecord | null>(null);
  const [isRevokingShare, setIsRevokingShare] = useState(false);

  // Keyboard accessibility: Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const processQuery = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setAssistantConsentGiven(false);
    setActiveShareResult(null);
    try {
      const res = await fetch("/api/assistant/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentResult({
          query: trimmed,
          intent: data.intent,
          friendlyResponse: data.friendlyResponse,
          suggestions: data.suggestions,
          readiness: data.readiness,
          guidance: data.guidance,
          verification: data.verification,
          sharePreview: data.sharePreview,
          journey: data.journey,
          consistency: data.consistency,
        });

        if (data.sharePreview) {
          setAssistantSelectedFieldIds(data.sharePreview.defaultFieldIds || []);
        }
      } else {
        setCurrentResult({
          query: trimmed,
          intent: {
            intent: "GENERAL_HELP",
            confidence: 1.0,
            originalMessage: trimmed,
          },
          friendlyResponse: "I couldn't complete that request right now. Please try asking again or select one of the suggested options below.",
          suggestions: ["I want to apply for KCET", "Check my documents", "Do my documents have any conflicts?"],
        });
      }
    } catch (err) {
      console.error("Assistant query error:", err);
      setCurrentResult({
        query: trimmed,
        intent: {
          intent: "GENERAL_HELP",
          confidence: 1.0,
          originalMessage: trimmed,
        },
        friendlyResponse: "I couldn't complete that request right now. Please try again.",
        suggestions: ["I want to apply for KCET", "Check my documents", "Where is my Aadhaar?"],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssistantCreateShare = async () => {
    if (!currentResult?.sharePreview || !assistantConsentGiven || isSubmittingShare) return;

    setIsSubmittingShare(true);
    try {
      const res = await fetch(`/api/documents/${currentResult.sharePreview.documentId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName: currentResult.sharePreview.suggestedRecipient || "Designated Verifier",
          purpose: currentResult.sharePreview.suggestedPurpose || "Application Verification",
          includedFieldIds: assistantSelectedFieldIds,
          consent: true,
        }),
      });

      if (res.ok) {
        const data: DocumentShareRecord = await res.json();
        setActiveShareResult(data);
      }
    } catch (err) {
      console.error("Assistant share creation error:", err);
    } finally {
      setIsSubmittingShare(false);
    }
  };

  const handleAssistantRevokeShare = async () => {
    if (!activeShareResult || isRevokingShare) return;

    setIsRevokingShare(true);
    try {
      const res = await fetch(`/api/shares/${activeShareResult.id}/revoke`, {
        method: "POST",
      });

      if (res.ok) {
        const updated: DocumentShareRecord = await res.json();
        setActiveShareResult(updated);
      }
    } catch (err) {
      console.error("Assistant revoke error:", err);
    } finally {
      setIsRevokingShare(false);
    }
  };

  const handleSelectChip = (chip: string) => {
    setInputValue(chip);
    processQuery(chip);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    const msg = inputValue;
    setInputValue("");
    processQuery(msg);
  };

  const formatIntentLabel = (intent: string) => {
    return intent
      .toLowerCase()
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case "READY_FOR_REVIEW":
        return <Badge variant="success" size="sm">Ready for Review</Badge>;
      case "NEEDS_REVIEW":
        return <Badge variant="warning" size="sm">Needs Review</Badge>;
      case "DOCUMENT_NOT_FOUND":
        return <Badge variant="default" size="sm">Not Found</Badge>;
      case "UNSUPPORTED_DOCUMENT":
      default:
        return <Badge variant="info" size="sm">Unsupported</Badge>;
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle DigiReady Assistant"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-700 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/30"
      >
        {isOpen ? (
          <IconClose className="h-6 w-6" />
        ) : (
          <IconSparkles className="h-6 w-6" />
        )}
      </button>

      {/* Assistant Flyout Dialog */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="DigiReady Assistant"
          className="fixed bottom-24 right-6 z-50 w-[92vw] max-w-[440px] rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden flex flex-col transition-all duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                <IconSparkles className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    DigiReady Assistant
                  </span>
                  <Badge variant="purple" size="sm">
                    Verification
                  </Badge>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Readiness, guidance & verification
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                setCurrentResult(null);
              }}
              aria-label="Close assistant"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <IconClose className="h-4 w-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex flex-col gap-3.5 p-4 max-h-[380px] overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <span className="text-xs text-slate-500">Checking document information...</span>
              </div>
            ) : currentResult ? (
              <div className="flex flex-col gap-3">
                {/* User Message Bubble */}
                <div className="self-end rounded-2xl rounded-tr-xs bg-blue-600 px-3.5 py-2 text-xs text-white max-w-[85%] shadow-xs">
                  {currentResult.query}
                </div>

                {/* Assistant Response Bubble */}
                <div className="self-start rounded-2xl rounded-tl-xs bg-slate-100 dark:bg-slate-800/80 p-3.5 text-xs text-slate-800 dark:text-slate-200 max-w-[95%] space-y-2.5">
                  {/* Intent & Entity Pill */}
                  <div className="flex flex-wrap items-center gap-1.5 pb-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <Badge variant="info" size="sm">
                      {formatIntentLabel(currentResult.intent.intent)}
                    </Badge>
                    {currentResult.intent.service && (
                      <Badge variant="purple" size="sm">
                        {currentResult.intent.service}
                      </Badge>
                    )}
                    {currentResult.intent.document && (
                      <Badge variant="success" size="sm">
                        {currentResult.intent.document}
                      </Badge>
                    )}
                  </div>

                  {/* Friendly Natural Language Message */}
                  <p className="leading-relaxed text-xs whitespace-pre-line">
                    {currentResult.friendlyResponse.replace(/\*\*(.*?)\*\*/g, "$1")}
                  </p>

                  {/* Application Journey Card (Phase 7.6) */}
                  {currentResult.journey ? (
                    <ApplicationJourneyCard
                      journey={currentResult.journey}
                      onQueryClick={(query) => processQuery(query)}
                    />
                  ) : currentResult.readiness ? (
                    /* Fallback Readiness Result Card */
                    <div className="mt-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs dark:border-slate-700 dark:bg-slate-900 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {currentResult.readiness.serviceName}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                            {currentResult.readiness.availableCount} / {currentResult.readiness.requiredCount} required documents available
                          </span>
                        </div>
                        <Badge
                          variant={currentResult.readiness.ready ? "success" : "warning"}
                          size="sm"
                        >
                          {currentResult.readiness.ready ? "Ready" : "Incomplete"}
                        </Badge>
                      </div>

                      {/* Documents Checklist */}
                      <div className="flex flex-col gap-1.5">
                        {currentResult.readiness.documents.map((doc) => {
                          const isAvailable = doc.status === "AVAILABLE";
                          return (
                            <div
                              key={doc.documentType}
                              className="flex items-center justify-between text-[11px] py-1 px-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/50 gap-2"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                {isAvailable ? (
                                  <IconCheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                ) : (
                                  <IconAlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                )}
                                <span
                                  className={`truncate ${
                                    isAvailable
                                      ? "text-slate-700 dark:text-slate-300 font-medium"
                                      : "text-slate-900 dark:text-slate-100 font-semibold"
                                  }`}
                                >
                                  {doc.displayName}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span
                                  className={`text-[10px] font-semibold ${
                                    isAvailable
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-amber-600 dark:text-amber-400"
                                  }`}
                                >
                                  {isAvailable ? "Available" : "Missing"}
                                </span>
                                {!isAvailable && (
                                  <button
                                    type="button"
                                    onClick={() => processQuery(`I need ${doc.displayName}`)}
                                    className="text-[10px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline"
                                  >
                                    Get Help
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                        <Link
                          href="/documents"
                          onClick={() => setIsOpen(false)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          <span>Manage Documents</span>
                          <IconChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ) : null}

                  {/* Guidance Result Card */}
                  {currentResult.guidance && (
                    <div className="mt-2.5 rounded-xl border border-blue-200 bg-white p-3.5 shadow-2xs dark:border-blue-900/60 dark:bg-slate-900 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <div className="flex items-center gap-1.5">
                          <IconHelp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {currentResult.guidance.displayName} Guidance
                          </span>
                        </div>
                        <Badge variant="info" size="sm">
                          Resolution Steps
                        </Badge>
                      </div>

                      <div className="flex flex-col gap-2 text-[11px]">
                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                            What it is:
                          </span>
                          <p className="text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                            {currentResult.guidance.description}
                          </p>
                        </div>

                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                            Why it is needed:
                          </span>
                          <p className="text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                            {currentResult.guidance.purpose}
                          </p>
                        </div>

                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                            Recommended Next Steps:
                          </span>
                          <ol className="list-decimal list-inside space-y-1 mt-1 text-slate-600 dark:text-slate-400">
                            {currentResult.guidance.nextSteps.map((step, idx) => (
                              <li key={idx} className="leading-relaxed">
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>

                        <div className="rounded-lg bg-slate-50 p-2 text-[10px] text-slate-500 dark:bg-slate-800/60 dark:text-slate-400 mt-1 italic">
                          ℹ️ {currentResult.guidance.authorityNote}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Verification Result Card */}
                  {currentResult.verification && (
                    <div className="mt-2.5 rounded-xl border border-emerald-200 bg-white p-3.5 shadow-2xs dark:border-emerald-900/60 dark:bg-slate-900 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <div className="flex items-center gap-1.5">
                          <IconShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {currentResult.verification.displayName}
                          </span>
                        </div>
                        {getVerificationBadge(currentResult.verification.status)}
                      </div>

                      {/* Checks Breakdown */}
                      <div className="flex flex-col gap-1.5 text-[11px]">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Metadata Checks
                        </span>
                        {currentResult.verification.checks.map((check) => {
                          const isPass = check.status === "PASS";
                          return (
                            <div
                              key={check.key}
                              className="flex items-start gap-1.5 py-1 px-1.5 rounded-md bg-slate-50 dark:bg-slate-800/40"
                            >
                              {isPass ? (
                                <IconCheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                              ) : (
                                <IconAlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                              )}
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {check.label}
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                  {check.explanation}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Limitation Banner */}
                      <div className="rounded-lg border border-slate-200/80 bg-slate-50 p-2 text-[10px] text-slate-500 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-400 leading-relaxed">
                        ℹ️ <span className="font-medium">Notice:</span> {currentResult.verification.limitationNote}
                      </div>

                      {/* Link to Document Detail if available */}
                      {currentResult.verification.documentId && (
                        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                          <Link
                            href={`/documents/${currentResult.verification.documentId}`}
                            onClick={() => setIsOpen(false)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          >
                            <span>View Full Metadata</span>
                            <IconChevronRight className="w-3 h-3" />
                          </Link>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cross-Document Consistency / Conflicts */}
                  {currentResult.consistency && (
                    <div className="mt-2.5">
                      <ConflictCard consistency={currentResult.consistency} />
                    </div>
                  )}

                  {/* Share Preview & Active Share Card */}
                  {currentResult.sharePreview && (
                    <>
                      {activeShareResult ? (
                        /* Active Share Result in Assistant */
                        <div className="mt-2.5 rounded-xl border border-emerald-200 bg-white p-3.5 shadow-2xs dark:border-emerald-900/60 dark:bg-slate-900 flex flex-col gap-2.5">
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                            <div className="flex items-center gap-1.5">
                              <IconCheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                Document Shared
                              </span>
                            </div>
                            <Badge variant={activeShareResult.status === "ACTIVE" ? "success" : "warning"} size="sm">
                              {activeShareResult.status === "ACTIVE" ? "Active" : "Revoked"}
                            </Badge>
                          </div>

                          <div className="space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
                            <div><span className="text-slate-500">Document:</span> <span className="font-semibold text-slate-800 dark:text-slate-200">{activeShareResult.documentDisplayName}</span></div>
                            <div><span className="text-slate-500">Shared with:</span> <span className="font-semibold text-slate-800 dark:text-slate-200">{activeShareResult.recipientName}</span></div>
                            <div><span className="text-slate-500">Purpose:</span> <span className="font-medium text-slate-700 dark:text-slate-300">{activeShareResult.purpose}</span></div>
                            <div><span className="text-slate-500">Permission:</span> <span className="font-medium text-slate-700 dark:text-slate-300">View only</span></div>
                            <div><span className="text-slate-500">Expires:</span> <span className="font-medium text-slate-700 dark:text-slate-300">{new Date(activeShareResult.expiresAt).toLocaleDateString()}</span></div>
                            <div><span className="text-slate-500">Share ID:</span> <span className="font-mono text-slate-700 dark:text-slate-300">{`SHR-${activeShareResult.shareToken.slice(-8)}`}</span></div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                            <Link
                              href={`/documents/${activeShareResult.documentId}`}
                              onClick={() => setIsOpen(false)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            >
                              <span>View Document</span>
                              <IconChevronRight className="w-3 h-3" />
                            </Link>
                            {activeShareResult.status === "ACTIVE" && (
                              <button
                                type="button"
                                disabled={isRevokingShare}
                                onClick={handleAssistantRevokeShare}
                                className="rounded-md px-2 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                              >
                                {isRevokingShare ? "Revoking..." : "Revoke Access"}
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* Share Preview & Consent in Assistant */
                        <div className="mt-2.5 rounded-xl border border-blue-200 bg-white p-3.5 shadow-2xs dark:border-blue-900/60 dark:bg-slate-900 flex flex-col gap-2.5">
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                            <div className="flex items-center gap-1.5">
                              <IconLock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                Secure Document Share
                              </span>
                            </div>
                            <Badge variant="info" size="sm">Consent Required</Badge>
                          </div>

                          <div className="space-y-1.5 text-[11px]">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {currentResult.sharePreview.documentDisplayName}
                            </div>
                            <div>
                              <span className="text-slate-500">Recipient:</span>{" "}
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {currentResult.sharePreview.suggestedRecipient || "Designated Verifier"}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500">Purpose:</span>{" "}
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {currentResult.sharePreview.suggestedPurpose || "Application Verification"}
                              </span>
                            </div>

                            {/* Scoped attributes list */}
                            <div className="pt-1">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                                Shared Attributes
                              </span>
                              <div className="flex flex-col gap-1 max-h-28 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-800/40">
                                {currentResult.sharePreview.availableFields.map((field) => (
                                  <label key={field.id} className="flex items-center justify-between text-[10px] cursor-pointer">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <input
                                        type="checkbox"
                                        checked={assistantSelectedFieldIds.includes(field.id)}
                                        onChange={() => {
                                          setAssistantSelectedFieldIds((prev) =>
                                            prev.includes(field.id)
                                              ? prev.filter((id) => id !== field.id)
                                              : [...prev, field.id]
                                          );
                                        }}
                                        className="h-3 w-3 rounded text-blue-600"
                                      />
                                      <span className="capitalize text-slate-700 dark:text-slate-300 truncate">
                                        {field.fieldName.replace(/([A-Z])/g, " $1")}
                                      </span>
                                    </div>
                                    <span className="font-mono text-slate-500 dark:text-slate-400 truncate max-w-[100px]">
                                      {field.displayValue}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            <div className="text-[10px] text-slate-500 flex justify-between pt-1">
                              <span>Permission: View only</span>
                              <span>Expires: 7 days</span>
                            </div>

                            {/* Explicit Consent Checkbox */}
                            <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-2 text-[10px] dark:border-amber-900/60 dark:bg-amber-950/30">
                              <label className="flex items-start gap-1.5 cursor-pointer text-slate-800 dark:text-slate-200">
                                <input
                                  type="checkbox"
                                  checked={assistantConsentGiven}
                                  onChange={(e) => setAssistantConsentGiven(e.target.checked)}
                                  className="mt-0.5 h-3.5 w-3.5 rounded text-blue-600"
                                />
                                <span>
                                  I agree to share these selected document attributes.
                                </span>
                              </label>
                            </div>

                            {/* Buttons */}
                            <div className="flex justify-end gap-2 pt-1.5">
                              <button
                                type="button"
                                disabled={!assistantConsentGiven || isSubmittingShare || assistantSelectedFieldIds.length === 0}
                                onClick={handleAssistantCreateShare}
                                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                              >
                                {isSubmittingShare ? "Sharing..." : "I Agree & Share"}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Follow-up Suggestion Chips */}
                {currentResult.suggestions && currentResult.suggestions.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Suggested actions:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {currentResult.suggestions.map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => handleSelectChip(sug)}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-800 text-left"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentResult(null)}
                  className="self-start text-xs mt-1"
                >
                  Ask another question
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Ask me about your documents, applications, verification, or secure sharing.
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Select a suggested inquiry or type below:
                  </p>
                </div>

                {/* Suggestion Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {INITIAL_SUGGESTIONS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleSelectChip(chip)}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-300 text-left"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Footer Input */}
          <form onSubmit={handleSubmit} className="border-t border-slate-100 p-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
                placeholder="e.g. Can I verify my 12th marks card..."
                className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900 disabled:opacity-50"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!inputValue.trim() || isLoading}
                className="shrink-0 px-3"
              >
                <IconSend className="h-3.5 w-3.5" />
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

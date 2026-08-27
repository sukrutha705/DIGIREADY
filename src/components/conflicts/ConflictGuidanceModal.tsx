"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  IconAlertCircle,
  IconShieldCheck,
  IconFileText,
  IconChevronRight,
  IconLock,
} from "@/components/ui/Icons";
import type { ConflictGuidance } from "@/server/conflicts/types";

interface ConflictGuidanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  guidance: ConflictGuidance | null;
  onUploadUpdatedDoc?: () => void;
}

export function ConflictGuidanceModal({
  isOpen,
  onClose,
  guidance,
  onUploadUpdatedDoc,
}: ConflictGuidanceModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !guidance) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-guidance-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-6 py-4 backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
              <IconAlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Official Conflict Guidance
                </span>
                <Badge variant="warning" size="sm">
                  OFFICIAL CORRECTION REQUIRED
                </Badge>
              </div>
              <h2 id="conflict-guidance-title" className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {guidance.title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close guidance dialog"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 text-xs text-slate-700 dark:text-slate-300">
          {/* 1. What happened? */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/30 space-y-2">
            <h3 className="text-xs font-bold text-amber-950 dark:text-amber-200 uppercase tracking-wider">
              1. What happened?
            </h3>
            <p className="leading-relaxed text-amber-900 dark:text-amber-300">
              {guidance.explanation}
            </p>
          </div>

          {/* 2. Which documents are affected? */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              2. Affected Documents &amp; Values
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {guidance.affectedDocuments.map((doc, idx) => (
                <div
                  key={`${doc.documentId}-${idx}`}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-850 space-y-1.5"
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    <IconFileText className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{doc.documentDisplayName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      Extracted {guidance.fieldLabel}:
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono block mt-0.5">
                      {doc.value}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block pt-1 border-t border-slate-100 dark:border-slate-800">
                    Issuer: {doc.issuer}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 italic">
              Note: DigiReady does not decide which document is legally correct. Review which document contains the outdated or incorrect entry.
            </p>
          </div>

          {/* 3. Why does it matter? */}
          <div className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              3. Why does it matter?
            </h3>
            <p className="leading-relaxed text-[11px] text-slate-600 dark:text-slate-400">
              {guidance.whyCorrectionMayBeRequired}
            </p>
          </div>

          {/* 4. Who should I contact? (Official Authority) */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              4. Who should I contact?
            </h3>
            <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 dark:border-blue-900/50 dark:bg-slate-800/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-blue-950 dark:text-blue-200">
                  {guidance.recommendedAuthority.name}
                </span>
                <Badge variant="outline" size="sm">
                  {guidance.recommendedAuthority.shortName}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {guidance.recommendedAuthority.officialProcessNote}
              </p>
              {guidance.recommendedAuthority.officialUrl ? (
                <div className="pt-1">
                  <a
                    href={guidance.recommendedAuthority.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline dark:text-blue-400 text-xs"
                  >
                    <span>Visit Official Portal ({guidance.recommendedAuthority.portalName})</span>
                    <IconChevronRight className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic pt-1">
                  Visit the official authority portal or institutional office to confirm the current procedure.
                </p>
              )}
            </div>
          </div>

          {/* 5. What should I do? (Numbered Steps) */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              5. Official Correction Steps
            </h3>
            <ol className="space-y-2 list-decimal list-inside bg-slate-50/70 dark:bg-slate-850 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] leading-relaxed">
              {guidance.numberedSteps.map((step, idx) => (
                <li key={idx} className="text-slate-700 dark:text-slate-300 font-medium">
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* 6. What should I keep ready? (Required Documents) */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              6. What should I keep ready?
            </h3>
            <ul className="space-y-1.5 list-disc list-inside rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-850 text-[11px] text-slate-600 dark:text-slate-400">
              {guidance.requiredDocuments.map((doc, idx) => (
                <li key={idx}>
                  <span>{doc}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 7. Important Disclaimers & After Correction */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 space-y-2">
            <div className="flex items-start gap-2">
              <IconShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  DigiReady does not change government records
                </p>
                <p className="leading-relaxed mt-0.5">
                  Requirements and procedures may change. Confirm the current process through the official authority channel. DigiReady is a document preparation tool and cannot alter official government databases.
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                After official correction:
              </span>
              <p className="mt-0.5">
                {guidance.recheckAfterCorrection}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 z-10 flex items-center justify-between border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/95">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Back to Application Journey
          </Button>

          {onUploadUpdatedDoc && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                onUploadUpdatedDoc();
              }}
              className="text-xs font-semibold gap-1.5"
            >
              <span>+ Upload Corrected Document</span>
              <IconChevronRight className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

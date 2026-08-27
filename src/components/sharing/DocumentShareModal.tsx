"use client";

import React, { useState, useEffect } from "react";
import {
  IconClose,
  IconLock,
  IconCheckCircle,
  IconAlertCircle,
  IconShare,
} from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { SharePreviewDTO, DocumentShareRecord } from "@/server/sharing/types";

interface DocumentShareModalProps {
  documentId: string;
  documentDisplayName: string;
  isOpen: boolean;
  onClose: () => void;
  onShareCreated?: (share: DocumentShareRecord) => void;
  initialRecipient?: string;
  initialPurpose?: string;
}

export function DocumentShareModal({
  documentId,
  documentDisplayName,
  isOpen,
  onClose,
  onShareCreated,
  initialRecipient = "",
  initialPurpose = "",
}: DocumentShareModalProps) {
  const [preview, setPreview] = useState<SharePreviewDTO | null>(null);
  const [recipient, setRecipient] = useState(initialRecipient);
  const [purpose, setPurpose] = useState(initialPurpose);
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([]);
  const [consentGiven, setConsentGiven] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdShare, setCreatedShare] = useState<DocumentShareRecord | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setCreatedShare(null);
      setConsentGiven(false);
      setError(null);
      return;
    }

    const fetchPreview = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/documents/${documentId}/share/preview`);
        if (res.ok) {
          const data: SharePreviewDTO = await res.json();
          setPreview(data);
          setSelectedFieldIds(data.defaultFieldIds);
          if (!recipient && data.suggestedRecipient) {
            setRecipient(data.suggestedRecipient);
          }
          if (!purpose && data.suggestedPurpose) {
            setPurpose(data.suggestedPurpose);
          }
        } else {
          setError("Failed to load document preview attributes.");
        }
      } catch (err) {
        setError("Network error loading share preview.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreview();
  }, [isOpen, documentId]);

  if (!isOpen) return null;

  const handleToggleField = (fieldId: string) => {
    setSelectedFieldIds((prev) =>
      prev.includes(fieldId) ? prev.filter((id) => id !== fieldId) : [...prev, fieldId]
    );
  };

  const handleSelectAll = () => {
    if (!preview) return;
    if (selectedFieldIds.length === preview.availableFields.length) {
      setSelectedFieldIds([]);
    } else {
      setSelectedFieldIds(preview.availableFields.map((f) => f.id));
    }
  };

  const handleCreateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentGiven || isSubmitting) return;

    if (!recipient.trim()) {
      setError("Please specify a recipient name.");
      return;
    }
    if (!purpose.trim()) {
      setError("Please specify the purpose of sharing.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/documents/${documentId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName: recipient.trim(),
          purpose: purpose.trim(),
          includedFieldIds: selectedFieldIds,
          consent: true,
        }),
      });

      if (res.ok) {
        const share: DocumentShareRecord = await res.json();
        setCreatedShare(share);
        if (onShareCreated) {
          onShareCreated(share);
        }
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to create share grant.");
      }
    } catch (err) {
      setError("Network error creating share grant.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const maskShareToken = (token: string) => {
    if (!token) return "SHR-••••••••";
    return `SHR-${token.slice(-8)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <IconShare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Secure Document Share
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {documentDisplayName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close share dialog"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span className="text-xs text-slate-500">Preparing sharing preview...</span>
          </div>
        ) : createdShare ? (
          /* Active Share Confirmation View */
          <div className="flex flex-col gap-4 py-4">
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/40">
              <IconCheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  Document Shared Successfully
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                  A controlled, view-only permission grant has been generated.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-500">Document</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{createdShare.documentDisplayName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-500">Shared with</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{createdShare.recipientName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-500">Purpose</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{createdShare.purpose}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-500">Permission</span>
                <Badge variant="info" size="sm">View only</Badge>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-500">Expires</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {new Date(createdShare.expiresAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Share Reference</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  {maskShareToken(createdShare.shareToken)}
                </span>
              </div>
            </div>

            <div className="rounded-lg bg-slate-100 p-2.5 text-[11px] text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
              ℹ️ {createdShare.limitationNote}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="primary" size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          /* Share Configuration & Consent Form */
          <form onSubmit={handleCreateShare} className="flex flex-col gap-4 py-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                <IconAlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Recipient Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Recipient / Authority <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="e.g. Admissions Office, Scholarship Authority"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* Purpose Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Sharing Purpose <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. KCET admission verification, eligibility review"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* Attribute Scoping Section */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select Attributes to Share
                </label>
                {preview && preview.availableFields.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    {selectedFieldIds.length === preview.availableFields.length
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                )}
              </div>

              {preview && preview.availableFields.length > 0 ? (
                <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100 dark:border-slate-800 dark:divide-slate-800">
                  {preview.availableFields.map((field) => {
                    const isChecked = selectedFieldIds.includes(field.id);
                    return (
                      <label
                        key={field.id}
                        className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleField(field.id)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700"
                          />
                          <span className="font-medium text-slate-800 dark:text-slate-200 capitalize truncate">
                            {field.fieldName.replace(/([A-Z])/g, " $1")}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                          {field.displayValue}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No specific metadata fields available to scope.</p>
              )}
            </div>

            {/* Policy & Permissions Overview */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-slate-500">Access Permission</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">View-only (no raw download)</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-slate-500">Validity</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">7 days (revocable anytime)</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <IconLock className="w-3 h-3 shrink-0" />
                <span>{preview?.limitationNote || "Controlled prototype sharing grant."}</span>
              </div>
            </div>

            {/* Explicit Consent Checkbox */}
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 dark:border-amber-900/60 dark:bg-amber-950/30">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-800 dark:text-slate-200 leading-snug">
                <input
                  type="checkbox"
                  required
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-amber-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium">
                  I explicitly authorize sharing the selected document attributes with the recipient for the stated purpose.
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!consentGiven || isSubmitting || selectedFieldIds.length === 0}
                className="gap-1.5"
              >
                <IconLock className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "Creating Share..." : "I Agree & Share"}</span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

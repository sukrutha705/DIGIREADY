"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  IconCheckCircle,
  IconAlertCircle,
  IconShieldCheck,
  IconFileText,
  IconChevronRight,
  IconLock,
} from "@/components/ui/Icons";
import type { ExtractedField, ProcessUploadResult } from "@/server/documents/extraction/types";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: ProcessUploadResult) => void;
  preselectedDocumentType?: string;
  preselectedDocumentName?: string;
}

const DOCUMENT_TYPE_OPTIONS = [
  { key: "INCOME_CERTIFICATE", label: "Income Certificate" },
  { key: "SECONDARY_MARKS_CARD", label: "10th / SSLC Marks Card" },
  { key: "HIGHER_SECONDARY_MARKS_CARD", label: "12th / 2nd PUC Marks Card" },
  { key: "GOVERNMENT_IDENTITY_PROOF", label: "Government ID / Aadhaar" },
  { key: "CASTE_CERTIFICATE", label: "Caste / Category Certificate" },
  { key: "STUDY_CERTIFICATE", label: "Study Certificate (7 Years)" },
  { key: "PASSPORT", label: "Passport" },
];

export function UploadModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedDocumentType,
  preselectedDocumentName,
}: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [documentTypeOverride, setDocumentTypeOverride] = useState<string>(preselectedDocumentType || "");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<ProcessUploadResult | null>(null);
  const [duplicatePrompt, setDuplicatePrompt] = useState<any | null>(null);
  const [lowConfidencePrompt, setLowConfidencePrompt] = useState<boolean>(false);

  // Field editing state on result
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [isSavingCorrections, setIsSavingCorrections] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isProcessing) {
        resetModal();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isProcessing]);

  if (!isOpen) return null;

  const handleFileSelect = (selectedFile: File) => {
    setErrorMessage(null);
    setLowConfidencePrompt(false);
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(selectedFile.type)) {
      setErrorMessage("Unsupported file format. Please choose a JPEG, PNG, or WEBP image.");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setErrorMessage("File size exceeds the 10 MB limit.");
      return;
    }

    setFile(selectedFile);
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const executeUpload = async (
    duplicateResolution?: "keep_both" | "replace_existing",
    explicitTypeOverride?: string
  ) => {
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setDuplicatePrompt(null);
    setLowConfidencePrompt(false);
    setCurrentStepIndex(1); // 1: Uploading

    try {
      const formData = new FormData();
      formData.append("file", file);
      const chosenType = explicitTypeOverride || documentTypeOverride;
      if (chosenType) {
        formData.append("documentTypeOverride", chosenType);
      }
      if (duplicateResolution) {
        formData.append("duplicateResolution", duplicateResolution);
      }

      // Step progression simulation for realistic citizen feedback
      setTimeout(() => setCurrentStepIndex(2), 250); // Detect
      setTimeout(() => setCurrentStepIndex(3), 500); // Extract
      setTimeout(() => setCurrentStepIndex(4), 800); // Check
      setTimeout(() => setCurrentStepIndex(5), 1000); // Consistency

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data: ProcessUploadResult = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Upload failed. Please try again.");
        setIsProcessing(false);
        return;
      }

      if (data.duplicateDetected && data.existingDocument) {
        setDuplicatePrompt(data.existingDocument);
        setIsProcessing(false);
        return;
      }

      // Low confidence detection check
      if (
        data.document?.documentTypeKey === "UNKNOWN" ||
        data.document?.extractionStatus === "NEEDS_REVIEW" ||
        data.extraction?.status === "NEEDS_REVIEW"
      ) {
        if (!chosenType) {
          setLowConfidencePrompt(true);
          setIsProcessing(false);
          return;
        }
      }

      setUploadResult(data);
      if (data.document?.fields) {
        const initialEdits: Record<string, string> = {};
        data.document.fields.forEach((f) => {
          initialEdits[f.fieldName] = f.value || f.normalizedValue;
        });
        setEditedFields(initialEdits);
      }

      if (onSuccess) {
        onSuccess(data);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setErrorMessage("An unexpected network error occurred.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveCorrections = async () => {
    if (!uploadResult?.document?.id) return;
    setIsSavingCorrections(true);
    setSaveSuccessNotice(false);

    try {
      const corrections = Object.entries(editedFields).map(([fieldName, correctedValue]) => ({
        fieldName,
        correctedValue,
      }));

      const res = await fetch(`/api/documents/${uploadResult.document.id}/metadata`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ corrections }),
      });

      if (res.ok) {
        const updatedData = await res.json();
        setSaveSuccessNotice(true);
        if (onSuccess && uploadResult) {
          onSuccess({
            ...uploadResult,
            consistency: updatedData.consistency,
            journey: updatedData.journey,
          });
        }
      }
    } catch (err) {
      console.error("Failed to save corrections:", err);
    } finally {
      setIsSavingCorrections(false);
    }
  };

  const resetModal = () => {
    setFile(null);
    setPreviewUrl(null);
    setIsProcessing(false);
    setCurrentStepIndex(0);
    setErrorMessage(null);
    setUploadResult(null);
    setDuplicatePrompt(null);
    setLowConfidencePrompt(false);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <IconFileText className="w-5 h-5" />
            </div>
            <div>
              <h2 id="upload-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                {uploadResult ? "Document Uploaded & Checked" : "Upload Document Image"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {uploadResult
                  ? "Information extracted and verified against your vault."
                  : preselectedDocumentName
                  ? `Upload your ${preselectedDocumentName}`
                  : "DigiReady extracts metadata, checks consistency, and updates application readiness."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetModal}
            aria-label="Close upload dialog"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Error Message */}
          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50/60 p-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300 flex items-center gap-2">
              <IconAlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Low-Confidence Document Type Selector Fallback (Requirement 7) */}
          {lowConfidencePrompt && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/50 dark:bg-amber-950/30 space-y-3">
              <div className="flex items-center gap-2">
                <IconAlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  We couldn&apos;t confidently identify this document
                </h3>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                Please select the canonical document type so DigiReady can extract the correct fields:
              </p>
              <select
                value={documentTypeOverride}
                onChange={(e) => setDocumentTypeOverride(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="">Select document type...</option>
                {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLowConfidencePrompt(false)}
                  className="text-xs"
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!documentTypeOverride}
                  onClick={() => executeUpload(undefined, documentTypeOverride)}
                  className="text-xs font-semibold"
                >
                  Continue Verification →
                </Button>
              </div>
            </div>
          )}

          {/* Duplicate Resolution Modal */}
          {duplicatePrompt && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/30 space-y-3">
              <div className="flex items-center gap-2">
                <IconAlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  A similar document already exists in your vault
                </h3>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                You already have a <strong>{duplicatePrompt.displayName}</strong> uploaded on{" "}
                {new Date(duplicatePrompt.createdAt).toLocaleDateString()}. What would you like to do?
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => executeUpload("keep_both")}
                  className="text-xs"
                >
                  Keep Both
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => executeUpload("replace_existing")}
                  className="text-xs font-semibold"
                >
                  Replace Existing
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDuplicatePrompt(null)}
                  className="text-xs text-slate-500"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Processing Stepper (5 Stages) */}
          {isProcessing && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-4 dark:border-blue-900/40 dark:bg-slate-800/40 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-blue-600 animate-ping" />
                DigiReady is checking your document...
              </h3>
              <div className="space-y-2 text-xs">
                <div className={`flex items-center gap-2 ${currentStepIndex >= 1 ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-400"}`}>
                  <IconCheckCircle className="w-3.5 h-3.5" />
                  <span>1. Image uploaded securely</span>
                </div>
                <div className={`flex items-center gap-2 ${currentStepIndex >= 2 ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-400"}`}>
                  <IconCheckCircle className="w-3.5 h-3.5" />
                  <span>2. Document type detected</span>
                </div>
                <div className={`flex items-center gap-2 ${currentStepIndex >= 3 ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-400"}`}>
                  <IconCheckCircle className="w-3.5 h-3.5" />
                  <span>3. Extracting relevant information</span>
                </div>
                <div className={`flex items-center gap-2 ${currentStepIndex >= 4 ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-400"}`}>
                  <IconCheckCircle className="w-3.5 h-3.5" />
                  <span>4. Running document completeness checks</span>
                </div>
                <div className={`flex items-center gap-2 ${currentStepIndex >= 5 ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-400"}`}>
                  <IconCheckCircle className="w-3.5 h-3.5" />
                  <span>5. Checking consistency with other vault documents</span>
                </div>
              </div>
            </div>
          )}

          {/* Success View (Step 4 & 5: Review and Result) */}
          {uploadResult && uploadResult.document ? (
            <div className="space-y-4">
              {/* Document Overview */}
              <div className="flex items-start justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex gap-3">
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Uploaded Document Preview"
                      className="h-16 w-16 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                    />
                  )}
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      Document Added to Vault
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {uploadResult.document.displayName}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Issued by {uploadResult.document.issuer} • Confidence: {Math.round((uploadResult.document.extractionConfidence || uploadResult.extraction?.confidence || 0.9) * 100)}%
                    </p>
                  </div>
                </div>
                <Badge variant="success" size="sm">
                  ✓ DigiReady Check Complete
                </Badge>
              </div>

              {/* Consistency / Conflict Alert */}
              {uploadResult.consistency?.hasConflicts ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <IconAlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Information Conflict Detected</span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                    Some information differs from other documents in your vault. You can review and correct extracted fields below before applying.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200 flex items-center gap-2">
                  <IconCheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>All extracted identity fields are consistent with your vault documents.</span>
                </div>
              )}

              {/* Extracted Fields Editor */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-3 bg-white dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Extracted Information
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Review and edit if needed
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {uploadResult.document.fields.map((field) => (
                    <div key={field.fieldName} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-50 dark:border-slate-800/50 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                          {field.fieldName.replace(/([A-Z])/g, " $1")}
                        </span>
                        <span className="text-[9px] px-1 rounded bg-slate-100 text-slate-500 dark:bg-slate-800">
                          {field.isUserCorrected ? "User corrected" : "Extracted"}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={editedFields[field.fieldName] ?? (field.value || field.normalizedValue)}
                        onChange={(e) =>
                          setEditedFields((prev) => ({
                            ...prev,
                            [field.fieldName]: e.target.value,
                          }))
                        }
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 max-w-[220px] font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>

                {saveSuccessNotice && (
                  <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    ✓ Metadata updated. Original document image remains unchanged.
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isSavingCorrections}
                    onClick={handleSaveCorrections}
                    className="text-xs"
                  >
                    {isSavingCorrections ? "Saving..." : "Save Corrections"}
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400">
                  Original image preserved unchanged in private storage.
                </span>
                <Button variant="primary" size="sm" onClick={resetModal} className="text-xs font-semibold">
                  Done
                </Button>
              </div>
            </div>
          ) : (
            /* Upload Initial Form (Step 1 & 2: Select & Preview) */
            !isProcessing && !duplicatePrompt && !lowConfidencePrompt && (
              <div className="space-y-4">
                {/* File Dropzone */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 p-6 text-center hover:border-blue-400 hover:bg-blue-50/20 dark:border-slate-800 dark:hover:border-blue-600 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                  />
                  {previewUrl ? (
                    <div className="flex flex-col items-center gap-2">
                      <img
                        src={previewUrl}
                        alt="Selected Preview"
                        className="max-h-36 max-w-full rounded-lg object-contain border border-slate-200 dark:border-slate-700 shadow-xs"
                      />
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {file?.name} ({(file!.size / 1024).toFixed(1)} KB)
                      </span>
                      <span className="text-[11px] text-blue-600 hover:underline">
                        Click to choose a different image
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                        <IconFileText className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Click to choose or drag &amp; drop document image
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Supported: JPEG, PNG, WEBP • Maximum: 10 MB
                      </p>
                    </div>
                  )}
                </div>

                {/* Document Type Selector (Optional Override) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Document Type (Auto-detected if not specified):
                  </label>
                  <select
                    value={documentTypeOverride}
                    onChange={(e) => setDocumentTypeOverride(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Auto-detect from image</option>
                    {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button variant="outline" size="sm" onClick={resetModal} className="text-xs">
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!file}
                    onClick={() => executeUpload()}
                    className="text-xs font-semibold gap-1.5 shadow-xs"
                  >
                    <span>Upload &amp; Check</span>
                    <IconChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  IconCheckCircle,
  IconAlertCircle,
  IconFileText,
  IconShieldCheck,
} from "@/components/ui/Icons";
import type { ProcessUploadResult } from "@/server/documents/extraction/types";

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
  const [selectedTypeOverride, setSelectedTypeOverride] = useState<string>("");
  const [showTypeSelector, setShowTypeSelector] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>("uploading");
  const [ocrTimedOut, setOcrTimedOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<ProcessUploadResult | null>(null);
  const [duplicatePrompt, setDuplicatePrompt] = useState<any | null>(null);
  const [unknownDocumentPrompt, setUnknownDocumentPrompt] = useState<boolean>(false);

  // Field editing state on result
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [isSavingCorrections, setIsSavingCorrections] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const currentAbortController = useRef<AbortController | null>(null);

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
    setUnknownDocumentPrompt(false);
    setOcrTimedOut(false);
    setShowTypeSelector(false);
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

  const resetModal = () => {
    if (currentAbortController.current) {
      currentAbortController.current.abort();
      currentAbortController.current = null;
    }
    setFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedTypeOverride("");
    setShowTypeSelector(false);
    setIsProcessing(false);
    setProcessingStage("selected");
    setOcrTimedOut(false);
    setErrorMessage(null);
    setUploadResult(null);
    setDuplicatePrompt(null);
    setUnknownDocumentPrompt(false);
    setEditedFields({});
    setSaveSuccessNotice(false);
    onClose();
  };

  const PROCESSING_STAGES: Record<string, { label: string; index: number }> = {
    selected:    { label: "Image selected", index: 1 },
    uploading:   { label: "Image uploaded securely", index: 2 },
    reading:     { label: "Reading document text via local OCR...", index: 3 },
    detecting:   { label: "Checking document evidence...", index: 4 },
    extracting:  { label: "Extracting verified fields...", index: 5 },
    done:        { label: "Document check complete", index: 6 },
  };

  const executeUpload = async (
    duplicateResolution?: "keep_both" | "replace_existing",
    explicitTypeOverride?: string
  ) => {
    // Prevent duplicate simultaneous submissions
    if (!file || isProcessing) return;

    setIsProcessing(true);
    setOcrTimedOut(false);
    setErrorMessage(null);
    setDuplicatePrompt(null);
    setUnknownDocumentPrompt(false);
    setProcessingStage("uploading");

    const abortController = new AbortController();
    currentAbortController.current = abortController;
    const timeoutId = setTimeout(() => abortController.abort(), 35_000);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Only send documentTypeOverride if user explicitly selected it from the prompt/dropdown
      if (explicitTypeOverride) {
        formData.append("documentTypeOverride", explicitTypeOverride);
      }

      if (duplicateResolution) {
        formData.append("duplicateResolution", duplicateResolution);
      }

      setProcessingStage("reading");

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      setProcessingStage("detecting");
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

      // Check if OCR timed out
      if ((data.extraction as any)?.ocrTimedOut) {
        setOcrTimedOut(true);
        setIsProcessing(false);
        return;
      }

      setProcessingStage("done");

      // Check for UNKNOWN or insufficient document evidence
      const isUnknown =
        data.document?.documentTypeKey === "UNKNOWN" ||
        (data.extraction?.status === "NEEDS_REVIEW" &&
          (!data.document?.fields ||
            data.document.fields.filter((f) => f.status === "FOUND").length === 0));

      if (isUnknown && !explicitTypeOverride) {
        // OUTCOME A: Unknown / Random Image
        setUnknownDocumentPrompt(true);
        setUploadResult(data);
        setIsProcessing(false);
        return;
      }

      // OUTCOME B or C: Document recognized or manually confirmed
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
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err?.name === "AbortError") {
        setOcrTimedOut(true);
        console.warn("[UploadModal] Frontend upload request timed out or cancelled.");
      } else {
        console.error("Upload error:", err);
        setErrorMessage("An unexpected network error occurred.");
      }
    } finally {
      currentAbortController.current = null;
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

  const isOutcomeA =
    unknownDocumentPrompt ||
    (uploadResult?.document?.documentTypeKey === "UNKNOWN" && !selectedTypeOverride);

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
                {uploadResult && !isOutcomeA
                  ? "Document Uploaded & Checked"
                  : isOutcomeA
                  ? "Document Unidentified"
                  : preselectedDocumentName
                  ? `Upload ${preselectedDocumentName}`
                  : "Upload Document Image"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isOutcomeA
                  ? "DigiReady could not find document evidence in this image."
                  : uploadResult
                  ? "Information extracted and verified against your vault."
                  : preselectedDocumentName
                  ? `Upload a clear photo or scan of your ${preselectedDocumentName}`
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

          {/* OCR Timeout State */}
          {ocrTimedOut && (
            <div className="rounded-xl border border-orange-200 bg-orange-50/80 p-4 dark:border-orange-900/50 dark:bg-orange-950/30 space-y-3">
              <div className="flex items-center gap-2">
                <IconAlertCircle className="w-4 h-4 text-orange-600 shrink-0" />
                <h3 className="text-xs font-bold text-orange-900 dark:text-orange-200">
                  We couldn&apos;t finish reading this image
                </h3>
              </div>
              <p className="text-xs text-orange-800 dark:text-orange-300 leading-relaxed">
                Document reading took longer than expected. This can occur with blurry, dark, or extremely large images.
                Please upload a clearer or smaller scan.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setOcrTimedOut(false);
                    setFile(null);
                    setPreviewUrl(null);
                  }}
                  className="text-xs font-semibold"
                >
                  Upload Clearer Image
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setOcrTimedOut(false);
                    if (file) executeUpload();
                  }}
                  className="text-xs"
                >
                  Try Again
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

          {/* OUTCOME A: Unknown / Random Image (Insufficient Evidence) */}
          {isOutcomeA && !isProcessing && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/50 dark:bg-amber-950/30 space-y-3">
              <div className="flex items-center gap-2">
                <IconAlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Couldn&apos;t identify this as a supported document
                  </h3>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                    We couldn&apos;t find enough document evidence in this image. DigiReady requires visible text from a supported Indian government or examination document.
                  </p>
                </div>
              </div>

              {previewUrl && (
                <div className="flex items-center gap-3 p-2 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-amber-200/60 dark:border-amber-900/40">
                  <img
                    src={previewUrl}
                    alt="Uploaded image"
                    className="h-12 w-12 object-cover rounded-md border border-slate-200 dark:border-slate-700"
                  />
                  <div className="text-xs space-y-0.5">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      {file?.name || "Uploaded Image"}
                    </span>
                    <span className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                      Status: Unidentified • No metadata extracted
                    </span>
                  </div>
                </div>
              )}

              {/* Optional Manual Document Type Selector */}
              {showTypeSelector ? (
                <div className="pt-2 space-y-2 border-t border-amber-200/80 dark:border-amber-900/40">
                  <label className="text-xs font-semibold text-amber-900 dark:text-amber-200 block">
                    Select the document type manually:
                  </label>
                  <select
                    value={selectedTypeOverride}
                    onChange={(e) => setSelectedTypeOverride(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <option value="">Choose document type...</option>
                    {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 italic">
                    Note: Manual selection will only extract fields supported by readable text in the image. Missing fields remain unconfirmed.
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTypeSelector(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!selectedTypeOverride}
                      onClick={() => executeUpload(undefined, selectedTypeOverride)}
                      className="text-xs font-semibold"
                    >
                      Continue with Selected Type →
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTypeSelector(true)}
                    className="text-xs"
                  >
                    Choose Document Type
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setFile(null);
                      setPreviewUrl(null);
                      setUnknownDocumentPrompt(false);
                      setUploadResult(null);
                    }}
                    className="text-xs font-semibold"
                  >
                    Upload Clearer Image
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Honest Processing Stages */}
          {isProcessing && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-4 dark:border-blue-900/40 dark:bg-slate-800/40 space-y-3">
              <div className="flex items-center gap-3 pb-2 border-b border-blue-100 dark:border-blue-900/40">
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Document preview"
                    className="h-14 w-14 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shrink-0 bg-white"
                  />
                )}
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-blue-600 animate-ping" />
                    Checking document image...
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {file?.name} • Processing locally in your browser
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                {([
                  { key: "selected",   label: "Image selected" },
                  { key: "uploading",  label: "Image uploaded securely" },
                  { key: "reading",    label: "Reading document text via local OCR..." },
                  { key: "detecting",  label: "Checking document evidence..." },
                  { key: "extracting", label: "Extracting verified fields..." },
                ] as const).map(({ key, label }) => {
                  const currentIdx = PROCESSING_STAGES[processingStage]?.index ?? 2;
                  const stageIdx   = PROCESSING_STAGES[key]?.index ?? 99;
                  const isDone     = stageIdx < currentIdx;
                  const isActive   = stageIdx === currentIdx;
                  return (
                    <div
                      key={key}
                      className={`flex items-center gap-2 transition-colors ${
                        isDone
                          ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                          : isActive
                          ? "text-blue-600 dark:text-blue-400 font-semibold"
                          : "text-slate-400"
                      }`}
                    >
                      {isDone ? (
                        <IconCheckCircle className="w-3.5 h-3.5 shrink-0" />
                      ) : isActive ? (
                        <span className="inline-block h-3 w-3 shrink-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                      ) : (
                        <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-slate-300 dark:border-slate-600" />
                      )}
                      <span>{label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between pt-1">
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  DigiReady reads your document locally — no image data is sent to external servers.
                </p>
                <Button variant="outline" size="sm" onClick={resetModal} className="text-xs">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* OUTCOME B & C: Document Recognized / Extracted View */}
          {uploadResult && uploadResult.document && !isOutcomeA && !isProcessing && (
            <div className="space-y-4">
              {/* Document Overview Card */}
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
                      Issued by {uploadResult.document.issuer} • Confidence: {Math.round((uploadResult.document.extractionConfidence || uploadResult.extraction?.confidence || 0.0) * 100)}%
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    uploadResult.document.extractionStatus === "NEEDS_REVIEW" ||
                    uploadResult.extraction?.status === "NEEDS_REVIEW"
                      ? "warning"
                      : "success"
                  }
                  size="sm"
                >
                  {uploadResult.document.extractionStatus === "NEEDS_REVIEW" ||
                  uploadResult.extraction?.status === "NEEDS_REVIEW"
                    ? "⚠ Needs Review"
                    : "✓ DigiReady Document Check Complete"}
                </Badge>
              </div>

              {/* Warnings / Guidance Alert if any */}
              {uploadResult.extraction?.warnings && uploadResult.extraction.warnings.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <IconAlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Extraction Notice</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-amber-800 dark:text-amber-300 space-y-0.5">
                    {uploadResult.extraction.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

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
              {uploadResult.document.fields && uploadResult.document.fields.length > 0 && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-3 bg-white dark:bg-slate-900">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Extracted Information
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Review and correct if needed
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {uploadResult.document.fields.map((field) => (
                      <div key={field.fieldName} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-50 dark:border-slate-800/50 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                            {field.fieldName.replace(/([A-Z])/g, " $1")}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                              field.isUserCorrected
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                : field.status === "FOUND" && field.value
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            }`}
                          >
                            {field.isUserCorrected
                              ? "User corrected"
                              : field.status === "FOUND" && field.value
                              ? "✓ Found"
                              : "Not detected"}
                          </span>
                        </div>
                        <input
                          type="text"
                          value={editedFields[field.fieldName] ?? (field.value || field.normalizedValue)}
                          placeholder="Not detected — enter if visible on document..."
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
              )}

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
          )}

          {/* Upload Initial Form (Step 1 & 2: Select & Preview) */}
          {!uploadResult && !isProcessing && !duplicatePrompt && !isOutcomeA && !ocrTimedOut && (
            <div className="space-y-4">
              {/* File Dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center hover:border-blue-400 hover:bg-blue-50/30 dark:border-slate-800 dark:bg-slate-850 dark:hover:border-blue-500 cursor-pointer transition-colors"
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
                  <div className="space-y-3 w-full flex flex-col items-center">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-semibold">
                      <IconCheckCircle className="w-3.5 h-3.5" />
                      <span>✓ Image selected</span>
                    </div>
                    <div className="relative max-h-48 max-w-xs rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                      <img
                        src={previewUrl}
                        alt="Selected document"
                        className="max-h-48 w-auto object-contain"
                      />
                    </div>
                    <div className="text-xs space-y-0.5">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                        {file?.name}
                      </span>
                      <span className="text-slate-400">
                        {file ? `${(file.size / 1024).toFixed(1)} KB` : ""} • Click or drop to change image
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 py-4">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                      <IconFileText className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                        Choose an image file
                      </span>
                      <span className="text-xs text-slate-500"> or drag and drop</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Supports JPEG, PNG, WEBP (up to 10 MB). English document text is read locally via OCR.
                    </p>
                  </div>
                )}
              </div>

              {/* Upload Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button variant="outline" size="sm" onClick={resetModal} className="text-xs">
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!file || isProcessing}
                  onClick={() => executeUpload()}
                  className="text-xs font-semibold"
                >
                  {isProcessing ? "Reading Document..." : "Upload & Read Document →"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

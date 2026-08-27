"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  IconCheckCircle,
  IconAlertCircle,
  IconShieldCheck,
  IconFileText,
  IconLock,
} from "@/components/ui/Icons";
import type { VaultDocumentDTO } from "@/server/vault";

interface DocumentDetailClientProps {
  document: VaultDocumentDTO;
  verificationChecks?: any;
}

export function DocumentDetailClient({
  document,
  verificationChecks,
}: DocumentDetailClientProps) {
  const [fields, setFields] = useState(document.fields);
  const [isEditing, setIsEditing] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    document.fields.forEach((f) => {
      initial[f.fieldName] = f.normalizedValue;
    });
    return initial;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const handleSaveCorrections = async () => {
    setIsSaving(true);
    setSaveNotice(null);
    try {
      const corrections = Object.entries(editedValues).map(([fieldName, correctedValue]) => ({
        fieldName,
        correctedValue,
      }));

      const res = await fetch(`/api/documents/${document.id}/metadata`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ corrections }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.document?.fields) {
          setFields(data.document.fields);
        }
        setSaveNotice("Extracted metadata updated. Original document image remains unchanged.");
        setIsEditing(false);
      } else {
        setSaveNotice("Failed to update metadata. Please check the values.");
      }
    } catch (err) {
      console.error("Save error:", err);
      setSaveNotice("An unexpected error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Original Uploaded Document Image View */}
      {document.imageStorageKey ? (
        <Card className="p-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Original Uploaded Document
                </h2>
                <Badge variant="outline" size="sm">
                  Stored unchanged
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Format: {document.mimeType || "image"} ({document.fileSize ? `${(document.fileSize / 1024).toFixed(1)} KB` : ""}) • Kept securely in private storage.
              </p>
            </div>
            <Badge variant="outline" size="sm" className="gap-1">
              <IconLock className="w-3 h-3 text-slate-400" />
              Private Storage
            </Badge>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative max-h-72 max-w-sm rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <img
                src={`/api/documents/${document.id}/image`}
                alt={document.displayName}
                className="max-h-72 w-auto object-contain"
              />
            </div>
            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400 max-w-md">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Image Preservation Guarantee
              </p>
              <p className="leading-relaxed text-[11px]">
                The original document image is preserved unchanged exactly as uploaded. Any metadata corrections made below update DigiReady&apos;s extracted metadata only and do not alter this original document image or change official government records.
              </p>
              <a
                href={`/api/documents/${document.id}/image`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline dark:text-blue-400 pt-1"
              >
                Open Full Size Image ↗
              </a>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-5 border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <IconFileText className="w-4 h-4 text-slate-400" />
              <span>Digital Issued Document record (issued by {document.issuer})</span>
            </div>
            <Badge variant="outline" size="sm">
              Vault Record
            </Badge>
          </div>
        </Card>
      )}

      {/* 2. Extracted Metadata & Extraction Error Correction Editor */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Extracted Document Metadata
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review extracted fields used for verification. You can fix extraction/OCR mistakes here.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="text-xs font-semibold"
              >
                Correct Extracted Fields
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isSaving}
                  onClick={handleSaveCorrections}
                  className="text-xs font-semibold"
                >
                  {isSaving ? "Saving..." : "Save Extraction Correction"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Edit mode distinction note */}
        {isEditing && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <IconAlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Correction to DigiReady&apos;s extracted metadata</span>
            </div>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              This changes DigiReady&apos;s extracted metadata only. It does not change the original document image or alter official government records. If your official document contains an error, follow the issuing authority&apos;s official correction process.
            </p>
          </div>
        )}

        {saveNotice && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <IconCheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Metadata Updated</span>
            </div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
              Original document image remains unchanged. Cross-document consistency has been re-evaluated.
            </p>
          </div>
        )}

        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {fields.map((field) => {
            const isUserCorrected = !!field.isUserCorrected;
            const rawExtracted = field.rawExtractedValue;

            return (
              <div
                key={field.id}
                className="grid grid-cols-1 sm:grid-cols-3 py-3.5 text-xs gap-2 sm:gap-4 items-center"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                      {field.fieldName.replace(/([A-Z])/g, " $1")}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                        isUserCorrected
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                      }`}
                    >
                      {isUserCorrected ? "Correction in DigiReady" : "Extracted"}
                    </span>
                  </div>
                  {rawExtracted && isUserCorrected && (
                    <span className="text-[10px] text-slate-400">
                      Original extraction: {rawExtracted}
                    </span>
                  )}
                </div>

                <div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedValues[field.fieldName] ?? field.normalizedValue}
                      onChange={(e) =>
                        setEditedValues((prev) => ({
                          ...prev,
                          [field.fieldName]: e.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 font-mono focus:border-blue-500 focus:outline-none"
                    />
                  ) : (
                    <div className="flex flex-col">
                      <span className="font-mono text-slate-900 dark:text-slate-100 font-bold">
                        {field.normalizedValue}
                      </span>
                      {isUserCorrected && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                          Active metadata for DigiReady checks
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-right hidden sm:block">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {field.semanticRole ?? field.fieldType}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

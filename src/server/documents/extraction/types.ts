/**
 * DigiReady - Document Image Extraction Domain Contracts
 * Phase 8: Document Image Upload, Extraction & Verification
 */

export type ExtractionStatus = "SUCCESS" | "NEEDS_REVIEW" | "UNSUPPORTED";

export type FieldStatus = "FOUND" | "UNCONFIRMED" | "NOT_FOUND";

export interface ExtractedField {
  fieldId: string;
  fieldName: string;
  fieldType: "TEXT" | "DATE" | "NAME" | "ORGANIZATION" | "ADDRESS" | "IDENTIFIER" | "CURRENCY";
  semanticRole: "CANDIDATE_NAME" | "PARENT_NAME" | "DATE_OF_BIRTH" | "IDENTIFIER" | "ADDRESS" | "ORGANIZATION" | "GENDER" | "INCOME" | "CATEGORY" | "OTHER" | null;
  value: string;
  normalizedValue: string;
  confidence: number; // 0.0 to 1.0
  status: FieldStatus;
  isUserCorrected?: boolean;
  rawExtractedValue?: string;
}

export interface DocumentExtractionResult {
  documentTypeKey: string;
  documentTypeId?: string;
  displayName?: string;
  issuer: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  confidence: number;
  status: ExtractionStatus;
  fields: ExtractedField[];
  warnings: string[];
  rawText?: string;
}

export interface UploadValidationResult {
  valid: boolean;
  error?: string;
  mimeType?: string;
  fileSize?: number;
  detectedExtension?: string;
}

export type DuplicateResolutionOption = "keep_both" | "replace_existing" | "prompt";

export interface ProcessUploadOptions {
  documentTypeOverride?: string;
  duplicateResolution?: DuplicateResolutionOption;
  existingDocumentIdToReplace?: string;
  metadataHints?: Record<string, string>;
}

export interface ProcessUploadResult {
  success: boolean;
  duplicateDetected?: boolean;
  existingDocument?: {
    id: string;
    displayName: string;
    documentTypeKey: string;
    createdAt: string;
  };
  document?: {
    id: string;
    userId: string;
    documentTypeId: string;
    documentTypeKey: string;
    displayName: string;
    source: string;
    issuer: string;
    issueDate: string | null;
    expiryDate: string | null;
    imageStorageKey: string | null;
    mimeType: string | null;
    fileSize: number | null;
    extractionStatus: ExtractionStatus;
    extractionConfidence: number;
    fields: ExtractedField[];
  };
  extraction?: DocumentExtractionResult;
  verification?: any;
  consistency?: any;
  journey?: any;
  error?: string;
}

export interface UserFieldCorrection {
  fieldId?: string;
  fieldName: string;
  correctedValue: string;
}

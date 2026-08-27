/**
 * DigiReady - Document Verification & Trust Layer Types
 * Phase 7.4: Deterministic Metadata Verification & Trust Assessment
 */

export type VerificationStatus =
  | "READY_FOR_REVIEW"
  | "NEEDS_REVIEW"
  | "DOCUMENT_NOT_FOUND"
  | "UNSUPPORTED_DOCUMENT";

export interface VerificationCheck {
  key: string;
  label: string;
  status: "PASS" | "FAIL" | "NOT_CHECKED";
  explanation: string;
}

export interface DocumentVerification {
  documentId?: string;
  documentType: string;
  displayName: string;
  status: VerificationStatus;
  checks: VerificationCheck[];
  summary: string;
  limitationNote: string;
}

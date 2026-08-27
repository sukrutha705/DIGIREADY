/**
 * DigiReady - Conflict Resolution & Government Correction Routing Types
 * Deterministic types for cross-document conflicts, guidance, and authority workflows.
 */

import type { GovernmentAuthority } from "@/server/authorities";

export type ConflictType =
  | "NAME_MISMATCH"
  | "DOB_MISMATCH"
  | "GENDER_MISMATCH"
  | "PARENT_NAME_MISMATCH"
  | "ADDRESS_MISMATCH"
  | "IDENTIFIER_MISMATCH"
  | "DOCUMENT_DATE_CONFLICT"
  | "UNKNOWN_CONFLICT";

export type ConflictResolutionPath =
  | "AADHAAR_UPDATE"
  | "EDUCATION_BOARD_CORRECTION"
  | "INCOME_CERTIFICATE_ISSUER"
  | "CASTE_CERTIFICATE_ISSUER"
  | "REVENUE_DEPARTMENT"
  | "ADDRESS_UPDATE"
  | "PASSPORT_REISSUE"
  | "EPFO_JOINT_DECLARATION"
  | "DOCUMENT_REISSUE"
  | "MANUAL_REVIEW"
  | "UNKNOWN";

export interface AffectedDocumentEntry {
  documentId: string;
  documentDisplayName: string;
  documentTypeKey: string;
  fieldName: string;
  value: string;
  rawExtractedValue?: string;
  issuer: string;
}

export interface AuthorityCorrectionBranch {
  documentTypeKey: string;
  documentDisplayName: string;
  authorityName: string;
  authorityShortName: string;
  portalName: string;
  officialUrl?: string;
  summary: string;
  steps: string[];
}

export interface ConflictGuidance {
  id: string;
  conflictType: ConflictType;
  resolutionPath: ConflictResolutionPath;
  fieldKey: string;
  fieldLabel: string;
  title: string;
  explanation: string;
  affectedDocuments: AffectedDocumentEntry[];
  recommendedAuthority: GovernmentAuthority;
  authorityBranches: AuthorityCorrectionBranch[];
  whyCorrectionMayBeRequired: string;
  numberedSteps: string[];
  requiredDocuments: string[];
  caution: string;
  officialProcessNote: string;
  nextAction: string;
  recheckAfterCorrection: string;
}

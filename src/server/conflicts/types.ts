/**
 * DigiReady - Conflict Resolution & Government Correction Routing Types
 * Phase 9.3: Deterministic types for cross-document conflicts, guidance, authority routing, and centre resolution.
 */

import type { GovernmentAuthority } from "@/server/authorities";
import type { CorrectionCentre } from "@/server/centres/types";

export type ConflictSeverity = "INFO" | "WARNING" | "BLOCKING";

export type ConflictIssueStatus =
  | "OPEN"
  | "GUIDANCE_AVAILABLE"
  | "CENTRE_RECOMMENDED"
  | "CORRECTION_IN_PROGRESS"
  | "RESOLVED"
  | "RECHECK_REQUIRED";

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

export interface CorrectionStep {
  stepNumber: number;
  title: string;
  instruction: string;
  officialSourceUrl?: string;
  isPhysicalAction?: boolean;
}

export interface RequiredCorrectionDocument {
  documentName: string;
  purpose: string;
  isMandatory: boolean;
  note?: string;
}

export interface ConflictResolutionPlan {
  authority: GovernmentAuthority;
  authorityType: string;
  reason: string;
  officialPortal: string;
  officialInstructionsUrl?: string;
  centreRequired: boolean;
  correctionMethod: string;
  requiredSupportingDocuments: string[];
  numberedSteps: string[];
  nextVerificationAction: string;
}

export interface ConflictIssue {
  id: string;
  documentA: AffectedDocumentEntry;
  documentB: AffectedDocumentEntry;
  field: string;
  fieldLabel: string;
  valueA: string;
  valueB: string;
  severity: ConflictSeverity;
  status: ConflictIssueStatus;
  explanation: string;
  whyItMatters: string;
  resolutionPlan: ConflictResolutionPlan;
  authority: GovernmentAuthority;
  centreRequired: boolean;
  userCity?: string | null;
  recommendedCentres?: CorrectionCentre[];
  officialWebsite?: string;
  officialInstructionsUrl?: string;
  createdAt: string;
  updatedAt: string;
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

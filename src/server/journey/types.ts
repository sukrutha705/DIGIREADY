/**
 * DigiReady - Application Journey Domain Types
 * Realigned for Preparation, Verification, and Cross-Document Consistency.
 */

import type { ServiceReadiness } from "@/server/services/types";
import type { ConsistencyAssessment, FieldConsistencyComparison } from "@/server/consistency/types";

export const JourneyStatuses = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  MISSING_DOCUMENTS: "MISSING_DOCUMENTS",
  READY_FOR_VERIFICATION: "READY_FOR_VERIFICATION",
  NEEDS_ATTENTION: "NEEDS_ATTENTION",
  READY_TO_APPLY: "READY_TO_APPLY",
  // Backward compatibility alias
  READY_TO_SHARE: "READY_TO_SHARE",
} as const;

export type ApplicationJourneyStatus = (typeof JourneyStatuses)[keyof typeof JourneyStatuses];

export const JourneyDocumentStatuses = {
  AVAILABLE: "AVAILABLE",
  MISSING: "MISSING",
  VERIFIED: "VERIFIED",
  NEEDS_REVIEW: "NEEDS_REVIEW",
  CONFLICT: "CONFLICT",
  SHARED: "SHARED",
} as const;

export type JourneyDocumentStatus = (typeof JourneyDocumentStatuses)[keyof typeof JourneyDocumentStatuses];

export interface JourneyDocument {
  documentType: string;
  displayName: string;
  required: boolean;
  status: JourneyDocumentStatus;
  documentId?: string;
  matchedDocumentName?: string;
  verificationStatus?: string;
  hasConflict?: boolean;
  isShared?: boolean;
}

export const JourneyActionTypes = {
  GUIDANCE: "GUIDANCE",
  VERIFY: "VERIFY",
  CONFLICT: "CONFLICT",
  SHARE: "SHARE",
  REFRESH: "REFRESH",
} as const;

export type JourneyActionType = (typeof JourneyActionTypes)[keyof typeof JourneyActionTypes];

export interface JourneyAction {
  id: string;
  label: string;
  type: JourneyActionType;
  documentType?: string;
  documentId?: string;
}

export interface ApplicationJourney {
  serviceId: string;
  serviceName: string;
  status: ApplicationJourneyStatus;
  startedAt: string;
  requiredCount: number;
  availableCount: number;
  missingCount: number;
  readiness: ServiceReadiness;
  missingDocuments: JourneyDocument[];
  verifiedDocuments: JourneyDocument[];
  documentsNeedingReview: JourneyDocument[];
  consistency: ConsistencyAssessment;
  conflicts: FieldConsistencyComparison[];
  nextActions: JourneyAction[];
  limitationNote: string;
}

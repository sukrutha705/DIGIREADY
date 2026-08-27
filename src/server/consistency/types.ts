/**
 * DigiReady - Cross-Document Consistency Engine Domain Types
 * Deterministic comparison of identity and demographic fields across vault documents.
 */

export type ComparisonFieldKey = "name" | "dateOfBirth" | "gender" | "parentName" | "address";

export type FieldComparisonStatus = "MATCH" | "POTENTIAL_MISMATCH" | "INSUFFICIENT_DATA";

export type ConsistencySeverity = "CRITICAL" | "WARNING" | "INFO";

export interface DocumentFieldEntry {
  documentId: string;
  documentDisplayName: string;
  documentTypeKey: string;
  fieldName: string;
  semanticRole?: string | null;
  rawValue: string;
  normalizedValue: string;
}

import type { ConflictGuidance } from "@/server/conflicts/types";

export type OverallConsistencyStatus =
  | "CONSISTENT"
  | "CONFLICT_DETECTED"
  | "OFFICIAL_CORRECTION_REQUIRED"
  | "USER_RECHECK_REQUIRED"
  | "NEEDS_REVIEW"
  | "RESOLVED";

export interface FieldConsistencyComparison {
  fieldKey: ComparisonFieldKey;
  fieldLabel: string;
  status: FieldComparisonStatus;
  entries: DocumentFieldEntry[];
  distinctValues: string[];
  explanation: string;
  severity: ConsistencySeverity;
  guidance?: ConflictGuidance;
}

export interface ConsistencyAssessment {
  userId: string;
  hasConflicts: boolean;
  overallStatus: OverallConsistencyStatus;
  conflictCount: number;
  matchCount: number;
  insufficientCount: number;
  comparisons: FieldConsistencyComparison[];
  conflicts: FieldConsistencyComparison[];
  conflictGuidanceList?: ConflictGuidance[];
  evaluatedAt: string;
  summaryNote: string;
}

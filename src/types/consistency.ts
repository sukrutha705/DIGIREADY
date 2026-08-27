/**
 * DigiReady - Document Consistency & Validation Types
 * Phase 5: Multi-Document Consistency Engine
 */

export const ConsistencySeverities = {
  INFO: "INFO",
  WARNING: "WARNING",
  CRITICAL: "CRITICAL",
} as const;

export type ConsistencySeverity = (typeof ConsistencySeverities)[keyof typeof ConsistencySeverities];

export const ConsistencyFindingCodes = {
  NAME_MISMATCH: "NAME_MISMATCH",
  PARENT_NAME_MISMATCH: "PARENT_NAME_MISMATCH",
  DOB_MISMATCH: "DOB_MISMATCH",
  MISSING_EXPECTED_FIELD: "MISSING_EXPECTED_FIELD",
  DOCUMENT_EXPIRED: "DOCUMENT_EXPIRED",
} as const;

export type ConsistencyFindingCode =
  (typeof ConsistencyFindingCodes)[keyof typeof ConsistencyFindingCodes];

export interface ConsistencyFinding {
  code: ConsistencyFindingCode;
  severity: ConsistencySeverity;
  message: string;
  documentIds: string[];
  fieldNames: string[];
}

export interface ConsistencySummary {
  infoCount: number;
  warningCount: number;
  criticalCount: number;
}

export interface ConsistencyResult {
  userId: string;
  findings: ConsistencyFinding[];
  summary: ConsistencySummary;
  evaluatedAt: string;
}

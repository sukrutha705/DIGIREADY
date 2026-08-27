/**
 * DigiReady - Application Readiness Domain Types
 * Phase 4: Deterministic Readiness Engine
 */

export const ReadinessStatuses = {
  COMPLETE: "COMPLETE",
  INCOMPLETE: "INCOMPLETE",
} as const;

export type ReadinessStatus = (typeof ReadinessStatuses)[keyof typeof ReadinessStatuses];

export const RequirementEvaluationStatuses = {
  PRESENT: "PRESENT",
  MISSING: "MISSING",
  CONDITIONAL: "CONDITIONAL",
  OPTIONAL: "OPTIONAL",
} as const;

export type RequirementEvaluationStatus =
  (typeof RequirementEvaluationStatuses)[keyof typeof RequirementEvaluationStatuses];

export interface ReadinessRequirementResult {
  requirementKey: string;
  label: string;
  requirementType: "REQUIRED" | "OPTIONAL" | "CONDITIONAL" | string;
  status: RequirementEvaluationStatus;
  conditionKey: string | null;
  documentTypeId: string;
  documentTypeKey: string;
  documentTypeName: string;
  matchingDocumentIds: string[];
}

export interface ReadinessResult {
  serviceKey: string;
  serviceName: string;
  userId: string;
  userDisplayName: string;
  overallStatus: ReadinessStatus;
  requiredTotal: number;
  requiredSatisfied: number;
  requiredMissing: number;
  requirements: ReadinessRequirementResult[];
  evaluatedAt: string;
}

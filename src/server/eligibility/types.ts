/**
 * DigiReady - Eligibility Domain Types
 * Phase 9.2: Deterministic Eligibility Engine & Citizen Profile Intelligence
 */

export const EligibilityStatuses = {
  ELIGIBLE: "ELIGIBLE",
  NOT_ELIGIBLE: "NOT_ELIGIBLE",
  NEEDS_INFORMATION: "NEEDS_INFORMATION",
  NOT_APPLICABLE: "NOT_APPLICABLE",
  UNKNOWN: "UNKNOWN",
} as const;

export type EligibilityStatus = (typeof EligibilityStatuses)[keyof typeof EligibilityStatuses];

export const CriterionStatuses = {
  PASS: "PASS",
  FAIL: "FAIL",
  NEEDS_INFORMATION: "NEEDS_INFORMATION",
  NOT_APPLICABLE: "NOT_APPLICABLE",
} as const;

export type CriterionStatus = (typeof CriterionStatuses)[keyof typeof CriterionStatuses];

export const ValueProvenanceSources = {
  USER_PROVIDED: "USER_PROVIDED",
  EXTRACTED_FROM_DOC: "EXTRACTED_FROM_DOC",
  OFFICIAL_RECORD: "OFFICIAL_RECORD",
  NOT_PROVIDED: "NOT_PROVIDED",
} as const;

export type ValueProvenanceSource = (typeof ValueProvenanceSources)[keyof typeof ValueProvenanceSources];

export interface EligibilityCriterion {
  id: string;
  name: string;
  category: "AGE" | "EDUCATION" | "NATIONALITY" | "DOMICILE" | "CATEGORY" | "GENDER" | "INCOME" | "DISABILITY" | "OTHER";
  status: CriterionStatus;
  conditionDescription: string;
  explanation: string;
  requiredField?: string;
  providedValue?: string | number | boolean | null;
  valueSource?: ValueProvenanceSource;
  officialRuleSummary?: string;
}

export interface ServiceEligibilityRule {
  serviceId: string;
  serviceName: string;
  minAge?: number;
  maxAge?: number;
  ageReferenceDate?: string; // e.g. "31st December of examination year" or "1st August"
  ageRelaxationRules?: Record<string, number>; // category -> years of relaxation (e.g. { "OBC": 3, "SC": 5, "ST": 5, "PwD": 10 })
  minEducationQualification?: string; // "10TH_PASS", "12TH_PASS", "GRADUATE", "POST_GRADUATE"
  requiredStreams?: string[]; // e.g. ["PCM", "PCB", "ANY"]
  acceptedNationalities?: string[]; // e.g. ["Indian", "OCI", "NRI"]
  requiredDomicile?: string; // e.g. "Karnataka" or "ANY"
  allowedGenders?: string[]; // e.g. ["Female"] for Sukanya or ["Male", "Female", "Other"]
  maxAnnualFamilyIncome?: number; // e.g. 800000 for EWS, 250000 for SC/ST post-matric scholarship
  customConditionSummary?: string;
  sourceReference: string;
  sourceUrl?: string | null;
}

export interface UserEligibilityProfile {
  userId: string;
  dateOfBirth?: string | null; // YYYY-MM-DD
  age?: number | null;
  gender?: string | null;
  nationality?: string | null;
  state?: string | null;
  domicileState?: string | null;
  category?: string | null; // "General", "OBC", "SC", "ST", "EWS"
  educationQualification?: string | null; // "10TH_PASS", "12TH_PASS", "GRADUATE", "POST_GRADUATE"
  educationStream?: string | null; // "Science (PCM)", "Science (PCB)", "Commerce", "Arts", "Engineering", "Medicine", etc.
  annualFamilyIncome?: number | null;
  disabilityStatus?: boolean | null;
  sourceMap?: Record<string, ValueProvenanceSource>;
}

export interface ServiceEligibilityResult {
  serviceId: string;
  serviceName: string;
  slug?: string;
  overallStatus: EligibilityStatus;
  isEligible: boolean;
  needsInformation: boolean;
  statusLabel: string;
  summary: string;
  criteria: EligibilityCriterion[];
  missingFields: string[];
  sourceReference: string;
  sourceUrl?: string | null;
  officialWebsite?: string | null;
  evaluatedAt: string;
  disclaimer: string;
}

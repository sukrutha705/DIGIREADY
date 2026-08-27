/**
 * DigiReady - Service & Requirements Domain Types
 * Phase 3 & Phase 5: Generic Service Requirements Engine
 */

export const ServiceCategories = {
  EXAMINATION: "EXAMINATION",
  CERTIFICATE: "CERTIFICATE",
  SCHOLARSHIP: "SCHOLARSHIP",
  EMPLOYMENT: "EMPLOYMENT",
  TAX: "TAX",
  PENSION: "PENSION",
  GRIEVANCE: "GRIEVANCE",
  OTHER: "OTHER",
} as const;

export type ServiceCategory = (typeof ServiceCategories)[keyof typeof ServiceCategories];

export const RequirementTypes = {
  REQUIRED: "REQUIRED",
  OPTIONAL: "OPTIONAL",
  CONDITIONAL: "CONDITIONAL",
} as const;

export type RequirementType = (typeof RequirementTypes)[keyof typeof RequirementTypes];

export const RequirementSourceTypes = {
  OFFICIAL_REFERENCE: "OFFICIAL_REFERENCE",
  OFFICIAL_API: "OFFICIAL_API",
  MOCK_REFERENCE: "MOCK_REFERENCE",
  MOCK_API: "MOCK_API",
  MANUAL_ENTRY: "MANUAL_ENTRY",
} as const;

export type RequirementSourceType = (typeof RequirementSourceTypes)[keyof typeof RequirementSourceTypes];

export interface RequirementSourceSummary {
  name: string;
  sourceType: RequirementSourceType | string;
  referenceUrl: string | null;
  notes: string | null;
}

export interface ServiceRequirementItem {
  id: string;
  requirementKey: string;
  documentTypeId: string;
  documentTypeKey: string;
  documentTypeName: string;
  documentTypeCategory: string;
  label: string;
  description: string | null;
  requirementType: RequirementType | string;
  conditionKey: string | null;
  sortOrder: number;
  source: RequirementSourceSummary;
}

export interface ServiceRequirementResult {
  serviceId: string;
  serviceKey: string;
  serviceName: string;
  shortDescription: string;
  category: ServiceCategory | string;
  providerName: string;
  active: boolean;
  requirements: ServiceRequirementItem[];
}

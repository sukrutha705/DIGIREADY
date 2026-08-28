/**
 * DigiReady - Service & Requirements Domain Types
 * Phase 3, Phase 5, and Phase 9: Universal Service Registry & Readiness
 */

export const ServiceCategories = {
  EXAMINATION: "EXAMINATION",
  SCHOLARSHIP: "SCHOLARSHIP",
  GOVERNMENT_SCHEME: "GOVERNMENT_SCHEME",
  GOVERNMENT_SERVICE: "GOVERNMENT_SERVICE",
  CERTIFICATE: "CERTIFICATE",
  RECRUITMENT: "RECRUITMENT",
  EMPLOYMENT: "EMPLOYMENT",
  EDUCATION: "EDUCATION",
  TAX: "TAX",
  PENSION: "PENSION",
  GRIEVANCE: "GRIEVANCE",
  OTHER: "OTHER",
} as const;

export type ServiceCategory = (typeof ServiceCategories)[keyof typeof ServiceCategories];

export const AvailabilityStatuses = {
  SUPPORTED: "SUPPORTED",
  COMING_SOON: "COMING_SOON",
  NOT_CURRENTLY_SUPPORTED: "NOT_CURRENTLY_SUPPORTED",
} as const;

export type AvailabilityStatus = (typeof AvailabilityStatuses)[keyof typeof AvailabilityStatuses];

export const RequirementCategories = {
  DOCUMENT_REQUIREMENT: "DOCUMENT_REQUIREMENT",
  IDENTITY_REQUIREMENT: "IDENTITY_REQUIREMENT",
  ELIGIBILITY_REQUIREMENT: "ELIGIBILITY_REQUIREMENT",
  INFORMATION_REQUIREMENT: "INFORMATION_REQUIREMENT",
} as const;

export type RequirementCategory = (typeof RequirementCategories)[keyof typeof RequirementCategories];

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
  requirementCategory?: RequirementCategory | string;
  required?: boolean;
  condition?: string | null;
  notes?: string | null;
  priority?: number;
  conditionKey: string | null;
  sortOrder: number;
  sourceReference?: string | null;
  sourceTitle?: string | null;
  sourceUrl?: string | null;
  source: RequirementSourceSummary;
}

export interface ServiceRequirementResult {
  serviceId: string;
  serviceKey: string;
  slug?: string;
  serviceName: string;
  shortName?: string | null;
  shortDescription: string;
  description?: string | null;
  category: ServiceCategory | string;
  providerName: string;
  authority?: string | null;
  jurisdiction?: string | null;
  officialWebsite?: string | null;
  officialApplicationUrl?: string | null;
  availabilityStatus?: AvailabilityStatus | string;
  provenanceStatus?: string;
  eligibilitySummary?: string | null;
  prototypeNotice?: string | null;
  version?: string;
  active: boolean;
  requirements: ServiceRequirementItem[];
}

export interface ServiceDTO {
  id: string;
  slug: string;
  serviceKey: string;
  name: string;
  shortName: string | null;
  shortDescription: string;
  description: string | null;
  category: ServiceCategory | string;
  providerName: string;
  authority: string | null;
  jurisdiction: string | null;
  officialWebsite: string | null;
  officialApplicationUrl: string | null;
  availabilityStatus: AvailabilityStatus | string;
  provenanceStatus?: string;
  eligibilitySummary?: string | null;
  prototypeNotice?: string | null;
  version: string;
  lastReviewedAt: string | null;
  lastVerifiedAt?: string | null;
  active: boolean;
  requiredDocumentsCount: number;
  totalDocumentsCount: number;
  requirements?: ServiceRequirementItem[];
}

export interface UserActiveServiceDTO {
  id: string;
  userId: string;
  serviceId: string;
  slug: string;
  serviceName: string;
  shortName: string | null;
  category: string;
  authority: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  readinessSummary?: {
    requiredCount: number;
    availableCount: number;
    missingCount: number;
    ready: boolean;
    missingDocumentNames: string[];
    hasConflicts: boolean;
  };
}

export interface ServiceSummary {
  id: string;
  slug: string;
  serviceKey: string;
  name: string;
  shortName: string | null;
  shortDescription: string;
  category: string;
  providerName: string;
  authority: string | null;
  jurisdiction: string | null;
  availabilityStatus: string;
  requiredDocumentsCount: number;
  totalDocumentsCount: number;
}

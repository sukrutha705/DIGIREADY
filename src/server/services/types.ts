/**
 * DigiReady - Service Requirements & Readiness Types
 * Phase 7.2 & Phase 9: Universal Service Requirement & Document Readiness Engine
 */

export interface DocumentRequirement {
  documentType: string; // Canonical key or identifier e.g. "GOVERNMENT_IDENTITY_PROOF", "SECONDARY_MARKS_CARD"
  displayName: string;
  required: boolean;
  requirementCategory?: string; // "DOCUMENT_REQUIREMENT" | "IDENTITY_REQUIREMENT" | "ELIGIBILITY_REQUIREMENT" | "INFORMATION_REQUIREMENT"
  condition?: string | null;
  notes?: string | null;
  priority?: number;
  sourceReference?: string | null;
  sourceTitle?: string | null;
  sourceUrl?: string | null;
  aliases?: string[];
}

export interface ServiceRequirement {
  serviceId: string;
  serviceName: string;
  slug?: string;
  serviceKey?: string;
  shortName?: string | null;
  category?: string;
  authority?: string | null;
  jurisdiction?: string | null;
  officialWebsite?: string | null;
  officialApplicationUrl?: string | null;
  availabilityStatus?: string;
  provenanceStatus?: string;
  eligibilitySummary?: string | null;
  sourceReference?: string | null;
  prototypeNotice?: string | null;
  version?: string;
  description?: string;
  requiredDocuments: DocumentRequirement[];
}

export interface ReadinessDocument {
  documentType: string;
  displayName: string;
  required: boolean;
  condition?: string | null;
  notes?: string | null;
  status: "AVAILABLE" | "MISSING";
  documentId?: string;
  matchedDocumentName?: string;
}

export interface ServiceReadiness {
  serviceId: string;
  serviceName: string;
  slug?: string;
  authority?: string | null;
  jurisdiction?: string | null;
  officialWebsite?: string | null;
  officialApplicationUrl?: string | null;
  description?: string;
  requiredCount: number;
  availableCount: number;
  missingCount: number;
  ready: boolean;
  documents: ReadinessDocument[];
}


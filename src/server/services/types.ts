/**
 * DigiReady - Service Requirements & Readiness Types
 * Phase 7.2: Service Requirement & Document Readiness Engine
 */

export interface DocumentRequirement {
  documentType: string; // Canonical key or identifier e.g. "GOVERNMENT_IDENTITY_PROOF", "SECONDARY_MARKS_CARD"
  displayName: string;
  required: boolean;
  aliases?: string[];
}

export interface ServiceRequirement {
  serviceId: string;
  serviceName: string;
  description?: string;
  requiredDocuments: DocumentRequirement[];
}

export interface ReadinessDocument {
  documentType: string;
  displayName: string;
  required: boolean;
  status: "AVAILABLE" | "MISSING";
  documentId?: string;
  matchedDocumentName?: string;
}

export interface ServiceReadiness {
  serviceId: string;
  serviceName: string;
  description?: string;
  requiredCount: number;
  availableCount: number;
  missingCount: number;
  ready: boolean;
  documents: ReadinessDocument[];
}

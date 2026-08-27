/**
 * DigiReady - Document Guidance Domain Types
 * Phase 7.3: Missing Document Guidance Engine
 */

export interface DocumentGuidance {
  documentType: string; // Canonical key e.g. "INCOME_CERTIFICATE"
  displayName: string;
  description: string;
  purpose: string;
  nextSteps: string[];
  authorityNote: string;
  aliases?: string[];
}

export interface DocumentGuidanceResponse {
  documentType: string;
  guidance: DocumentGuidance;
}

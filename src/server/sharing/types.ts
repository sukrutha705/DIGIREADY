/**
 * DigiReady - Secure Document Sharing & Consent Layer Types
 * Phase 7.5: Deterministic Consent, Attribute Scoping, and Controlled Share Permissions
 */

export type ShareStatus = "ACTIVE" | "EXPIRED" | "REVOKED";

export interface SharePermissions {
  canView: boolean;
  canDownload: boolean;
}

export interface ShareConsentPayload {
  documentId: string;
  recipientName: string;
  purpose: string;
  expiresInHours?: number;
  includedFieldIds: string[];
  consent: boolean;
}

export interface SharedFieldDTO {
  id: string;
  fieldName: string;
  fieldType: string;
  semanticRole: string | null;
  normalizedValue: string;
}

export interface DocumentShareRecord {
  id: string;
  shareToken: string;
  userId: string;
  documentId: string;
  documentDisplayName: string;
  documentTypeKey: string;
  recipientName: string;
  purpose: string;
  status: ShareStatus;
  permissions: SharePermissions;
  sharedFields: SharedFieldDTO[];
  createdAt: string;
  expiresAt: string;
  revokedAt?: string | null;
  limitationNote: string;
}

export interface SharePreviewField {
  id: string;
  fieldName: string;
  fieldType: string;
  semanticRole: string | null;
  displayValue: string;
}

export interface SharePreviewDTO {
  documentId: string;
  documentDisplayName: string;
  documentTypeKey: string;
  issuer: string;
  suggestedRecipient?: string;
  suggestedPurpose?: string;
  availableFields: SharePreviewField[];
  defaultFieldIds: string[];
  permissions: SharePermissions;
  expiresInDays: number;
  consentNotice: string;
  limitationNote: string;
}

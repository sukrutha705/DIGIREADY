/**
 * DigiReady - Document Ontology & Domain Types
 * Phase 2 & Phase 5: Generalized Document Architecture
 */

export const DocumentCategories = {
  IDENTITY: "IDENTITY",
  EDUCATION: "EDUCATION",
  ADDRESS: "ADDRESS",
  SOCIAL_CERTIFICATE: "SOCIAL_CERTIFICATE",
  FINANCIAL: "FINANCIAL",
  EMPLOYMENT: "EMPLOYMENT",
  TRAVEL: "TRAVEL",
  OTHER: "OTHER",
} as const;

export type DocumentCategory = (typeof DocumentCategories)[keyof typeof DocumentCategories];

export const DocumentSources = {
  ISSUED: "ISSUED",
  UPLOADED: "UPLOADED",
} as const;

export type DocumentSource = (typeof DocumentSources)[keyof typeof DocumentSources];

export const DocumentFieldTypes = {
  TEXT: "TEXT",
  DATE: "DATE",
  NAME: "NAME",
  ORGANIZATION: "ORGANIZATION",
  ADDRESS: "ADDRESS",
  IDENTIFIER: "IDENTIFIER",
} as const;

export type DocumentFieldType = (typeof DocumentFieldTypes)[keyof typeof DocumentFieldTypes];

export const SemanticRoles = {
  CANDIDATE_NAME: "CANDIDATE_NAME",
  PARENT_NAME: "PARENT_NAME",
  DATE_OF_BIRTH: "DATE_OF_BIRTH",
  IDENTIFIER: "IDENTIFIER",
  ADDRESS: "ADDRESS",
  ORGANIZATION: "ORGANIZATION",
  OTHER: "OTHER",
} as const;

export type SemanticRole = (typeof SemanticRoles)[keyof typeof SemanticRoles];

export interface DocumentAliasData {
  alias: string;
  normalizedAlias?: string;
}

export interface DocumentTypeDefinition {
  canonicalKey: string;
  displayName: string;
  category: DocumentCategory;
  description?: string;
  aliases: string[];
}

export interface IdentityEvidenceData {
  id?: string;
  userId: string;
  documentId: string;
  fieldId?: string | null;
  semanticRole: SemanticRole | string;
  normalizedValue: string;
}

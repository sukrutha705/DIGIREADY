/**
 * DigiReady - Document Verification Rules Registry
 * Phase 7.4: Deterministic Metadata Verification Rules
 */

export interface VerificationRuleSet {
  documentType: string;
  displayName: string;
  requiredChecks: string[];
  requireIssuer: boolean;
  requireIssueDate: boolean;
  checkExpiry: boolean;
  requiredSemanticRoles: string[]; // semanticRole values expected in DocumentField
  aliases?: string[];
}

export const VERIFICATION_RULES: Record<string, VerificationRuleSet> = {
  GOVERNMENT_IDENTITY_PROOF: {
    documentType: "GOVERNMENT_IDENTITY_PROOF",
    displayName: "Government Identity Proof",
    requiredChecks: [
      "DOCUMENT_EXISTS",
      "DOCUMENT_TYPE_RECOGNIZED",
      "ISSUER_PRESENT",
      "ISSUE_DATE_PRESENT",
      "REQUIRED_METADATA_PRESENT",
    ],
    requireIssuer: true,
    requireIssueDate: true,
    checkExpiry: true,
    requiredSemanticRoles: ["CANDIDATE_NAME"],
    aliases: ["aadhaar", "aadhaar card", "identity proof", "govt id", "identity card", "government identity proof"],
  },
  SECONDARY_MARKS_CARD: {
    documentType: "SECONDARY_MARKS_CARD",
    displayName: "10th / Secondary Marks Card",
    requiredChecks: [
      "DOCUMENT_EXISTS",
      "DOCUMENT_TYPE_RECOGNIZED",
      "ISSUER_PRESENT",
      "ISSUE_DATE_PRESENT",
      "REQUIRED_METADATA_PRESENT",
    ],
    requireIssuer: true,
    requireIssueDate: true,
    checkExpiry: false,
    requiredSemanticRoles: ["CANDIDATE_NAME"],
    aliases: ["sslc marks card", "10th marks card", "class 10 marks card", "secondary marks card", "secondary school certificate"],
  },
  HIGHER_SECONDARY_MARKS_CARD: {
    documentType: "HIGHER_SECONDARY_MARKS_CARD",
    displayName: "12th / Higher Secondary Marks Card",
    requiredChecks: [
      "DOCUMENT_EXISTS",
      "DOCUMENT_TYPE_RECOGNIZED",
      "ISSUER_PRESENT",
      "ISSUE_DATE_PRESENT",
      "REQUIRED_METADATA_PRESENT",
    ],
    requireIssuer: true,
    requireIssueDate: true,
    checkExpiry: false,
    requiredSemanticRoles: ["CANDIDATE_NAME"],
    aliases: ["2nd puc marks card", "puc marks card", "12th marks card", "higher secondary marks card", "class 12 marks card", "plus two certificate"],
  },
  STUDY_CERTIFICATE: {
    documentType: "STUDY_CERTIFICATE",
    displayName: "Study Certificate",
    requiredChecks: [
      "DOCUMENT_EXISTS",
      "DOCUMENT_TYPE_RECOGNIZED",
      "ISSUER_PRESENT",
      "ISSUE_DATE_PRESENT",
      "REQUIRED_METADATA_PRESENT",
    ],
    requireIssuer: true,
    requireIssueDate: true,
    checkExpiry: false,
    requiredSemanticRoles: ["CANDIDATE_NAME"],
    aliases: ["study certificate", "school study certificate", "institution study certificate", "bonafide study certificate"],
  },
  CASTE_CERTIFICATE: {
    documentType: "CASTE_CERTIFICATE",
    displayName: "Caste / Category Certificate",
    requiredChecks: [
      "DOCUMENT_EXISTS",
      "DOCUMENT_TYPE_RECOGNIZED",
      "ISSUER_PRESENT",
      "ISSUE_DATE_PRESENT",
      "REQUIRED_METADATA_PRESENT",
    ],
    requireIssuer: true,
    requireIssueDate: true,
    checkExpiry: true,
    requiredSemanticRoles: ["CANDIDATE_NAME"],
    aliases: ["caste certificate", "category certificate", "form d caste certificate", "community certificate"],
  },
  INCOME_CERTIFICATE: {
    documentType: "INCOME_CERTIFICATE",
    displayName: "Income Certificate",
    requiredChecks: [
      "DOCUMENT_EXISTS",
      "DOCUMENT_TYPE_RECOGNIZED",
      "ISSUER_PRESENT",
      "ISSUE_DATE_PRESENT",
      "REQUIRED_METADATA_PRESENT",
    ],
    requireIssuer: true,
    requireIssueDate: true,
    checkExpiry: true,
    requiredSemanticRoles: ["CANDIDATE_NAME"],
    aliases: ["income certificate", "annual income certificate", "family income certificate", "revenue income certificate"],
  },
  ADDRESS_PROOF: {
    documentType: "ADDRESS_PROOF",
    displayName: "Address Proof",
    requiredChecks: [
      "DOCUMENT_EXISTS",
      "DOCUMENT_TYPE_RECOGNIZED",
      "ISSUER_PRESENT",
      "ISSUE_DATE_PRESENT",
      "REQUIRED_METADATA_PRESENT",
    ],
    requireIssuer: true,
    requireIssueDate: true,
    checkExpiry: true,
    requiredSemanticRoles: ["CANDIDATE_NAME"],
    aliases: ["address proof", "residential certificate", "domicile certificate", "proof of address"],
  },
  PASSPORT: {
    documentType: "PASSPORT",
    displayName: "Passport",
    requiredChecks: [
      "DOCUMENT_EXISTS",
      "DOCUMENT_TYPE_RECOGNIZED",
      "ISSUER_PRESENT",
      "ISSUE_DATE_PRESENT",
      "REQUIRED_METADATA_PRESENT",
    ],
    requireIssuer: true,
    requireIssueDate: true,
    checkExpiry: true,
    requiredSemanticRoles: ["CANDIDATE_NAME"],
    aliases: ["passport", "travel passport", "official passport"],
  },
};

/**
 * Normalizes document type or name token.
 */
function normalizeDocToken(str: string): string {
  if (!str || typeof str !== "string") {
    return "";
  }
  return str.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Resolves verification rule set by canonical key, display name, or alias.
 */
export function getVerificationRuleSet(documentType: string): VerificationRuleSet | null {
  if (!documentType || typeof documentType !== "string") {
    return null;
  }

  const normalized = normalizeDocToken(documentType);
  if (!normalized) {
    return null;
  }

  // 1. Direct canonical key match
  const keyCandidate = normalized.toUpperCase().replace(/\s+/g, "_");
  if (VERIFICATION_RULES[keyCandidate]) {
    return VERIFICATION_RULES[keyCandidate];
  }

  // 2. Direct display name match
  for (const rule of Object.values(VERIFICATION_RULES)) {
    if (normalizeDocToken(rule.displayName) === normalized) {
      return rule;
    }
  }

  // 3. Alias match
  for (const rule of Object.values(VERIFICATION_RULES)) {
    if (rule.aliases) {
      for (const alias of rule.aliases) {
        const normAlias = normalizeDocToken(alias);
        if (normAlias === normalized || normalized.includes(normAlias)) {
          return rule;
        }
      }
    }
  }

  return null;
}

/**
 * Returns all configured verification rule sets.
 */
export function getAllVerificationRules(): VerificationRuleSet[] {
  return Object.values(VERIFICATION_RULES);
}


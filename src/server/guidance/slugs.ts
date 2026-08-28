/**
 * DigiReady - Canonical Guidance Slugs & Topic Normalizer
 * Standardizes slug generation and resolution across documents, conflicts, authorities, and services.
 */

import { DEMO_DOCUMENT_GUIDANCE, getDocumentGuidance } from "./registry";
import { GOVERNMENT_AUTHORITIES } from "@/server/authorities";

export type GuidanceTargetType = "CONFLICT" | "DOCUMENT" | "AUTHORITY" | "SERVICE" | "UNKNOWN";

export interface CanonicalGuidanceResolution {
  type: GuidanceTargetType;
  canonicalSlug: string;
  key: string;
}

/**
 * Normalizes any input string token into a clean alphanumeric sequence.
 */
export function normalizeGuidanceToken(str: string): string {
  if (!str || typeof str !== "string") return "";
  try {
    return decodeURIComponent(str).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  } catch {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }
}

/**
 * Maps any document identifier or alias to its canonical URL slug (e.g. "income-certificate").
 */
export function getCanonicalDocumentSlug(input: string): string {
  const norm = normalizeGuidanceToken(input);
  if (!norm) return "income-certificate";

  // Document Guidance match
  const docGuidance = getDocumentGuidance(input);
  if (docGuidance) {
    return docGuidance.documentType.toLowerCase().replace(/_/g, "-");
  }

  if (norm.includes("income") && !norm.includes("caste income")) {
    return "income-certificate";
  }
  if (norm.includes("caste income") || norm.includes("caste and income")) {
    return "caste-income-certificate";
  }
  if (norm.includes("caste") || norm.includes("category")) {
    return "caste-certificate";
  }
  if (
    norm.includes("aadhaar") ||
    norm.includes("identity proof") ||
    norm.includes("govt id") ||
    norm.includes("government identity")
  ) {
    return "government-identity-proof";
  }
  if (
    norm.includes("10th") ||
    norm.includes("sslc") ||
    norm.includes("secondary marks") ||
    norm.includes("class 10")
  ) {
    return "secondary-marks-card";
  }
  if (
    norm.includes("12th") ||
    norm.includes("2nd puc") ||
    norm.includes("puc") ||
    norm.includes("higher secondary") ||
    norm.includes("class 12")
  ) {
    return "higher-secondary-marks-card";
  }
  if (norm.includes("study") || norm.includes("bonafide")) {
    return "study-certificate";
  }
  if (norm.includes("address") || norm.includes("domicile") || norm.includes("residential")) {
    return "address-proof";
  }
  if (norm.includes("passport")) {
    return "passport";
  }
  if (norm.includes("disability") || norm.includes("pwd") || norm.includes("udid")) {
    return "disability-certificate";
  }
  if (norm.includes("ews") || norm.includes("economically weaker")) {
    return "ews-certificate";
  }
  if (norm.includes("rural")) {
    return "rural-certificate";
  }
  if (norm.includes("kannada medium")) {
    return "kannada-medium-certificate";
  }
  if (norm.includes("land") || norm.includes("rtc") || norm.includes("pahani") || norm.includes("patta")) {
    return "land-revenue-record";
  }

  return norm.replace(/\s+/g, "-");
}

/**
 * Resolves any raw slug, alias, document type, or field name into its canonical guidance topic.
 */
export function resolveCanonicalGuidanceSlug(rawInput: string): CanonicalGuidanceResolution {
  if (!rawInput || typeof rawInput !== "string") {
    return { type: "UNKNOWN", canonicalSlug: "", key: "" };
  }

  const token = normalizeGuidanceToken(rawInput);
  if (!token) {
    return { type: "UNKNOWN", canonicalSlug: "", key: "" };
  }

  // 1. Conflict Topics
  if (
    token === "name mismatch" ||
    token === "name" ||
    token === "candidate name" ||
    token === "name discrepancy" ||
    token.startsWith("name mismatch") ||
    token === "name-mismatch"
  ) {
    return { type: "CONFLICT", canonicalSlug: "name-mismatch", key: "name-mismatch" };
  }
  if (
    token === "dob mismatch" ||
    token === "dob" ||
    token === "date of birth" ||
    token === "dateofbirth" ||
    token === "birth date" ||
    token.startsWith("dob mismatch") ||
    token === "dob-mismatch"
  ) {
    return { type: "CONFLICT", canonicalSlug: "dob-mismatch", key: "dob-mismatch" };
  }
  if (
    token === "parent name mismatch" ||
    token === "parent name" ||
    token === "parentname" ||
    token === "father name" ||
    token === "parent mismatch" ||
    token.startsWith("parent name mismatch") ||
    token === "parent-name-mismatch"
  ) {
    return { type: "CONFLICT", canonicalSlug: "parent-name-mismatch", key: "parent-name-mismatch" };
  }
  if (
    token === "address mismatch" ||
    token === "address" ||
    token === "residential address" ||
    token.startsWith("address mismatch") ||
    token === "address-mismatch"
  ) {
    return { type: "CONFLICT", canonicalSlug: "address-mismatch", key: "address-mismatch" };
  }
  if (
    token === "gender mismatch" ||
    token === "gender" ||
    token === "gender discrepancy" ||
    token.startsWith("gender mismatch") ||
    token === "gender-mismatch"
  ) {
    return { type: "CONFLICT", canonicalSlug: "gender-mismatch", key: "gender-mismatch" };
  }

  // 2. Statutory Authorities
  const upperAuthKey = token.toUpperCase().replace(/\s+/g, "_");
  if (GOVERNMENT_AUTHORITIES[upperAuthKey]) {
    const auth = GOVERNMENT_AUTHORITIES[upperAuthKey];
    return {
      type: "AUTHORITY",
      canonicalSlug: auth.id.toLowerCase().replace(/_/g, "-"),
      key: auth.id,
    };
  }
  for (const auth of Object.values(GOVERNMENT_AUTHORITIES)) {
    const authNorm = normalizeGuidanceToken(auth.name);
    const authShort = normalizeGuidanceToken(auth.shortName);
    const authSlug = auth.id.toLowerCase().replace(/_/g, "-");
    if (token === authSlug.replace(/-/g, " ") || token === authShort || token === authNorm) {
      return {
        type: "AUTHORITY",
        canonicalSlug: authSlug,
        key: auth.id,
      };
    }
  }

  // 3. Document Topics
  const docGuidance = getDocumentGuidance(rawInput);
  if (docGuidance) {
    const canonicalDocSlug = docGuidance.documentType.toLowerCase().replace(/_/g, "-");
    return {
      type: "DOCUMENT",
      canonicalSlug: canonicalDocSlug,
      key: docGuidance.documentType,
    };
  }

  // Fallback check for document keywords
  if (token.includes("income") || token.includes("caste") || token.includes("marks") || token.includes("study") || token.includes("aadhaar") || token.includes("passport")) {
    const canonical = getCanonicalDocumentSlug(token);
    const resolvedDoc = getDocumentGuidance(canonical);
    if (resolvedDoc) {
      return {
        type: "DOCUMENT",
        canonicalSlug: resolvedDoc.documentType.toLowerCase().replace(/_/g, "-"),
        key: resolvedDoc.documentType,
      };
    }
  }

  // 4. Default as Service or Generic Slug
  return {
    type: "SERVICE",
    canonicalSlug: token.replace(/\s+/g, "-"),
    key: token.replace(/\s+/g, "_").toUpperCase(),
  };
}

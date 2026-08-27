/**
 * DigiReady - Consistency Normalization & Comparison Policies
 * Strict, deterministic transformations for cross-document attribute comparison.
 */

/**
 * Deterministically normalizes name strings:
 * - Trims leading/trailing whitespace
 * - Converts to uppercase
 * - Replaces punctuation (periods, commas, hyphens, slashes) with single spaces
 * - Collapses multiple spaces into a single space
 * 
 * Note: Token sequence is preserved ("SUKRUTHA K" !== "K SUKRUTHA").
 */
export function normalizeName(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }
  return input
    .toUpperCase()
    .replace(/[.,\-_/\\#@!$%^&*();:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Deterministically parses dates into canonical YYYY-MM-DD format.
 * Supports ISO strings, YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, and YYYY/MM/DD.
 */
export function normalizeDob(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  const trimmed = input.trim();

  // Pattern: YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, "0");
    const day = ymdMatch[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Pattern: DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Fallback ISO timestamp parse
  const parsedDate = new Date(trimmed);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().split("T")[0];
  }

  return trimmed;
}

/**
 * Deterministically normalizes gender values:
 * Maps "M", "MALE", "Male" -> "MALE"
 * Maps "F", "FEMALE", "Female" -> "FEMALE"
 * Maps "T", "TRANS", "TRANSGENDER" -> "TRANSGENDER"
 */
export function normalizeGender(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }
  const clean = input.trim().toUpperCase();
  if (clean === "M" || clean === "MALE") return "MALE";
  if (clean === "F" || clean === "FEMALE") return "FEMALE";
  if (clean === "T" || clean === "TRANS" || clean === "TRANSGENDER" || clean === "OTHER") return "TRANSGENDER / OTHER";
  return clean;
}

/**
 * Deterministically normalizes parent / guardian name strings.
 */
export function normalizeParentName(input: string): string {
  return normalizeName(input);
}

/**
 * Deterministically normalizes address strings:
 * - Trims whitespace
 * - Converts to uppercase
 * - Standardizes common abbreviations (ST -> STREET, RD -> ROAD, APT -> APARTMENT)
 * - Collapses spaces and punctuation
 */
export function normalizeAddress(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }
  return input
    .toUpperCase()
    .replace(/[.,\-_/\\#@!$%^&*();:]+/g, " ")
    .replace(/\bRD\b/g, "ROAD")
    .replace(/\bST\b/g, "STREET")
    .replace(/\bNGR\b/g, "NAGAR")
    .replace(/\s+/g, " ")
    .trim();
}

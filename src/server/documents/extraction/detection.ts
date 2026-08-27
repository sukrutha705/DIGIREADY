import { resolveDocumentType, normalizeDocumentName } from "@/server/ontology";
import type { PrismaClient, DocumentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface DetectionResult {
  detectedType: DocumentType | null;
  canonicalKey: string;
  displayName: string;
  confidence: number;
  status: "SUCCESS" | "NEEDS_REVIEW" | "UNSUPPORTED";
  matchedCue?: string;
  warnings: string[];
}

// Canonical keyword cues mapped to ontology aliases
const DOCUMENT_CUES: Array<{
  pattern: RegExp;
  aliasQuery: string;
  fallbackKey: string;
  fallbackName: string;
}> = [
  {
    pattern: /(income|annual\s*income|family\s*income|revenue\s*dept|tahsildar|form\s*16)/i,
    aliasQuery: "Income Certificate",
    fallbackKey: "INCOME_CERTIFICATE",
    fallbackName: "Income Certificate",
  },
  {
    pattern: /(sslc|10th|class\s*10|class\s*x|secondary\s*school|matriculation)/i,
    aliasQuery: "SSLC Marks Card",
    fallbackKey: "SECONDARY_MARKS_CARD",
    fallbackName: "10th / Secondary Marks Card",
  },
  {
    pattern: /(2nd\s*puc|puc|12th|class\s*12|class\s*xii|higher\s*secondary|plus\s*two)/i,
    aliasQuery: "2nd PUC Marks Card",
    fallbackKey: "HIGHER_SECONDARY_MARKS_CARD",
    fallbackName: "12th / Higher Secondary Marks Card",
  },
  {
    pattern: /(aadhaar|uidai|unique\s*identification|government\s*identity|identity\s*card|photo\s*id|govt\s*id)/i,
    aliasQuery: "Government Identity Proof",
    fallbackKey: "GOVERNMENT_IDENTITY_PROOF",
    fallbackName: "Government Identity Proof",
  },
  {
    pattern: /(caste|category\s*cert|community\s*cert|form\s*d|sc\s*st|obc)/i,
    aliasQuery: "Caste Certificate",
    fallbackKey: "CASTE_CERTIFICATE",
    fallbackName: "Caste / Category Certificate",
  },
  {
    pattern: /(study\s*cert|bonafide|institutional\s*study|school\s*study)/i,
    aliasQuery: "Study Certificate",
    fallbackKey: "STUDY_CERTIFICATE",
    fallbackName: "Study Certificate",
  },
  {
    pattern: /(passport)/i,
    aliasQuery: "Passport",
    fallbackKey: "PASSPORT",
    fallbackName: "Passport",
  },
];

/**
 * Deterministically detects the canonical document type from image cues, filename, or explicit override.
 */
export async function detectDocumentType(
  fileName: string,
  rawText?: string,
  typeOverride?: string,
  db: PrismaClient = prisma
): Promise<DetectionResult> {
  const warnings: string[] = [];

  // 1. Explicit override provided by user
  if (typeOverride && typeOverride.trim()) {
    const resolved = await resolveDocumentType(typeOverride, db);
    if (resolved) {
      return {
        detectedType: resolved,
        canonicalKey: resolved.canonicalKey,
        displayName: resolved.displayName,
        confidence: 1.0,
        status: "SUCCESS",
        matchedCue: "USER_OVERRIDE",
        warnings: [],
      };
    }
  }

  // 2. Combine textual cues from filename and any OCR/text hint
  const combinedText = `${fileName || ""} ${rawText || ""}`.toLowerCase();

  for (const cue of DOCUMENT_CUES) {
    if (cue.pattern.test(combinedText)) {
      const resolved = await resolveDocumentType(cue.aliasQuery, db);
      if (resolved) {
        return {
          detectedType: resolved,
          canonicalKey: resolved.canonicalKey,
          displayName: resolved.displayName,
          confidence: 0.95,
          status: "SUCCESS",
          matchedCue: cue.aliasQuery,
          warnings: [],
        };
      } else {
        return {
          detectedType: null,
          canonicalKey: cue.fallbackKey,
          displayName: cue.fallbackName,
          confidence: 0.85,
          status: "SUCCESS",
          matchedCue: cue.aliasQuery,
          warnings: [],
        };
      }
    }
  }

  // 3. Fallback: try ontology resolution on clean filename tokens
  const cleanName = fileName.replace(/\.[^/.]+$/, "");
  const resolvedFromName = await resolveDocumentType(cleanName, db);
  if (resolvedFromName) {
    return {
      detectedType: resolvedFromName,
      canonicalKey: resolvedFromName.canonicalKey,
      displayName: resolvedFromName.displayName,
      confidence: 0.8,
      status: "SUCCESS",
      matchedCue: "FILENAME_MATCH",
      warnings: [],
    };
  }

  // 4. Ambiguous / Unknown Document Type
  warnings.push("We couldn't confidently identify this document type. Please select the document type manually.");
  return {
    detectedType: null,
    canonicalKey: "UNKNOWN",
    displayName: "Unidentified Document",
    confidence: 0.0,
    status: "NEEDS_REVIEW",
    warnings,
  };
}

import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import { UserNotFoundError } from "@/server/readiness";
import type {
  ConsistencyResult,
  ConsistencyFinding,
  ConsistencySummary,
  ConsistencySeverity,
} from "@/types/consistency";

export * from "./consistency/types";
export * from "./consistency/policy";
export * from "./consistency/service";

/**
 * Deterministically normalizes name strings:
 * - Trims leading and trailing whitespace
 * - Converts to uppercase
 * - Replaces punctuation (periods, commas, hyphens) with spaces
 * - Collapses consecutive whitespace into a single space
 * 
 * IMPORTANT: Token order is STRICTLY preserved.
 * "SUKRUTHA K" and "K SUKRUTHA" normalize to "SUKRUTHA K" and "K SUKRUTHA" respectively.
 */
export function normalizeNameString(input: string): string {
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
 * Deterministically parses synthetic dates into canonical YYYY-MM-DD format.
 * Supports YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, YYYY/MM/DD, and ISO strings.
 */
export function normalizeDobString(input: string): string {
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
 * Conservative name comparison.
 * Returns "MATCH" only when normalized full name strings are identical.
 */
export function compareNames(a: string, b: string): "MATCH" | "MISMATCH" {
  const normA = normalizeNameString(a);
  const normB = normalizeNameString(b);
  if (!normA || !normB) {
    return "MISMATCH";
  }
  return normA === normB ? "MATCH" : "MISMATCH";
}

const SEVERITY_RANK: Record<ConsistencySeverity, number> = {
  CRITICAL: 1,
  WARNING: 2,
  INFO: 3,
};

/**
 * Evaluates document metadata consistency across all documents in a citizen's vault.
 * 
 * Rules:
 * - Multi-Document support (N documents, N names, N parent names, N DOBs).
 * - Conservative matching (token reordering produces NAME_MISMATCH).
 * - Consolidates multi-document conflicts into single findings.
 * - Deterministic ordering: CRITICAL -> WARNING -> INFO, then code alphabetically, then document IDs.
 */
export async function evaluateDocumentConsistency(
  userId: string,
  db: PrismaClient = prisma
): Promise<ConsistencyResult> {
  const trimmedUserId = userId?.trim();
  if (!trimmedUserId) {
    throw new UserNotFoundError(userId || "EMPTY_USER_ID");
  }

  // 1. Retrieve User, documents, fields, and identity evidence
  const user = await db.user.findUnique({
    where: { id: trimmedUserId },
    include: {
      documents: {
        include: {
          fields: true,
          identityEvidence: true,
          documentType: true,
        },
        orderBy: { createdAt: "asc" },
      },
      identityEvidence: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!user) {
    throw new UserNotFoundError(trimmedUserId);
  }

  const evaluationDate = new Date();
  const rawFindings: ConsistencyFinding[] = [];

  // 2. Aggregate evidence by semantic role across all documents
  const candidateNameEntries: { documentId: string; fieldName: string; normalized: string }[] = [];
  const parentNameEntries: { documentId: string; fieldName: string; normalized: string }[] = [];
  const dobEntries: { documentId: string; fieldName: string; normalizedDob: string }[] = [];

  for (const doc of user.documents) {
    // Check Expiry
    if (doc.expiryDate && new Date(doc.expiryDate).getTime() < evaluationDate.getTime()) {
      rawFindings.push({
        code: "DOCUMENT_EXPIRED",
        severity: "WARNING",
        message: "This document appears to have passed its recorded expiry date.",
        documentIds: [doc.id],
        fieldNames: ["expiryDate"],
      });
    }

    // Check Expected Fields (a document with zero fields or explicitly lacking identity attributes)
    if (doc.fields.length === 0 && doc.identityEvidence.length === 0) {
      rawFindings.push({
        code: "MISSING_EXPECTED_FIELD",
        severity: "WARNING",
        message: "Document is missing expected metadata attributes.",
        documentIds: [doc.id],
        fieldNames: ["fields"],
      });
    }

    // Process fields
    for (const field of doc.fields) {
      const role = field.semanticRole;
      const fName = field.fieldName.toLowerCase();

      if (
        role === "CANDIDATE_NAME" ||
        (!role && ["fullname", "candidatename", "studentname", "applicantname", "residentname", "name"].includes(fName))
      ) {
        candidateNameEntries.push({
          documentId: doc.id,
          fieldName: field.fieldName,
          normalized: normalizeNameString(field.normalizedValue),
        });
      } else if (
        role === "PARENT_NAME" ||
        (!role && ["fathername", "mothername", "parentname", "guardianname"].includes(fName))
      ) {
        parentNameEntries.push({
          documentId: doc.id,
          fieldName: field.fieldName,
          normalized: normalizeNameString(field.normalizedValue),
        });
      } else if (
        role === "DATE_OF_BIRTH" ||
        (!role && ["dateofbirth", "dob"].includes(fName))
      ) {
        dobEntries.push({
          documentId: doc.id,
          fieldName: field.fieldName,
          normalizedDob: normalizeDobString(field.normalizedValue),
        });
      }
    }
  }

  // 3. Cross-Document Candidate Name Consistency Check
  if (candidateNameEntries.length >= 2) {
    const distinctNames = new Set(candidateNameEntries.map((e) => e.normalized).filter(Boolean));
    if (distinctNames.size > 1) {
      const conflictingDocIds = Array.from(new Set(candidateNameEntries.map((e) => e.documentId))).sort();
      const conflictingFieldNames = Array.from(new Set(candidateNameEntries.map((e) => e.fieldName))).sort();
      rawFindings.push({
        code: "NAME_MISMATCH",
        severity: "WARNING",
        message: `Candidate name differs across ${conflictingDocIds.length} documents.`,
        documentIds: conflictingDocIds,
        fieldNames: conflictingFieldNames,
      });
    }
  }

  // 4. Cross-Document Parent Name Consistency Check
  if (parentNameEntries.length >= 2) {
    const distinctParentNames = new Set(parentNameEntries.map((e) => e.normalized).filter(Boolean));
    if (distinctParentNames.size > 1) {
      const conflictingDocIds = Array.from(new Set(parentNameEntries.map((e) => e.documentId))).sort();
      const conflictingFieldNames = Array.from(new Set(parentNameEntries.map((e) => e.fieldName))).sort();
      rawFindings.push({
        code: "PARENT_NAME_MISMATCH",
        severity: "CRITICAL",
        message: `Parent or guardian name differs across ${conflictingDocIds.length} documents.`,
        documentIds: conflictingDocIds,
        fieldNames: conflictingFieldNames,
      });
    }
  }

  // 5. Cross-Document DOB Consistency Check
  if (dobEntries.length >= 2) {
    const distinctDobs = new Set(dobEntries.map((e) => e.normalizedDob).filter(Boolean));
    if (distinctDobs.size > 1) {
      const conflictingDocIds = Array.from(new Set(dobEntries.map((e) => e.documentId))).sort();
      const conflictingFieldNames = Array.from(new Set(dobEntries.map((e) => e.fieldName))).sort();
      rawFindings.push({
        code: "DOB_MISMATCH",
        severity: "CRITICAL",
        message: `Date of birth differs across ${conflictingDocIds.length} documents.`,
        documentIds: conflictingDocIds,
        fieldNames: conflictingFieldNames,
      });
    }
  }

  // 6. Deduplicate findings
  const deduplicatedFindings: ConsistencyFinding[] = [];
  const seenFindingKeys = new Set<string>();

  for (const finding of rawFindings) {
    const key = `${finding.code}:${finding.severity}:${[...finding.documentIds].sort().join(",")}`;
    if (!seenFindingKeys.has(key)) {
      seenFindingKeys.add(key);
      deduplicatedFindings.push({
        ...finding,
        documentIds: [...finding.documentIds].sort(),
        fieldNames: [...finding.fieldNames].sort(),
      });
    }
  }

  // 7. Deterministic Sorting: Severity (CRITICAL -> WARNING -> INFO), then code alphabetically, then doc IDs
  deduplicatedFindings.sort((a, b) => {
    const rankDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (rankDiff !== 0) return rankDiff;

    const codeDiff = a.code.localeCompare(b.code);
    if (codeDiff !== 0) return codeDiff;

    return a.documentIds.join(",").localeCompare(b.documentIds.join(","));
  });

  // 8. Calculate Summary
  const summary: ConsistencySummary = {
    infoCount: deduplicatedFindings.filter((f) => f.severity === "INFO").length,
    warningCount: deduplicatedFindings.filter((f) => f.severity === "WARNING").length,
    criticalCount: deduplicatedFindings.filter((f) => f.severity === "CRITICAL").length,
  };

  return {
    userId: user.id,
    findings: deduplicatedFindings,
    summary,
    evaluatedAt: evaluationDate.toISOString(),
  };
}

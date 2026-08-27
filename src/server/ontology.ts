import { prisma } from "@/lib/prisma";
import type { PrismaClient, DocumentType } from "@prisma/client";

/**
 * Normalizes input string for deterministic document ontology resolution:
 * - Trims leading/trailing whitespace
 * - Converts to lowercase
 * - Replaces non-alphanumeric characters with spaces
 * - Collapses consecutive whitespace into a single space
 */
export function normalizeDocumentName(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Deterministically resolves an input document name or alias to its canonical DocumentType.
 * 
 * Search precedence:
 * 1. Exact canonicalKey match (case-insensitive, e.g. "HIGHER_SECONDARY_MARKS_CARD")
 * 2. Normalized canonicalKey match (e.g. "higher secondary marks card")
 * 3. Normalized displayName match
 * 4. Normalized alias match from document_aliases table
 * 
 * Returns the matching DocumentType record or null if unresolvable.
 */
export async function resolveDocumentType(
  input: string,
  db: PrismaClient = prisma
): Promise<DocumentType | null> {
  const trimmed = input?.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = normalizeDocumentName(trimmed);
  if (!normalized) {
    return null;
  }

  // 1. Direct canonical key match (e.g., input is "HIGHER_SECONDARY_MARKS_CARD" or "higher_secondary_marks_card")
  const canonicalFormatted = trimmed.toUpperCase().replace(/[\s-]+/g, "_");
  const directType = await db.documentType.findUnique({
    where: { canonicalKey: canonicalFormatted },
  });
  if (directType) {
    return directType;
  }

  // 2. Query all document types and their aliases to resolve normalized forms
  // Note: For hackathon and production registry scale (dozens/hundreds of document types), this is deterministic and extremely fast.
  const allDocumentTypes = await db.documentType.findMany({
    include: {
      aliases: true,
    },
  });

  // Check normalized canonical keys and display names
  for (const docType of allDocumentTypes) {
    if (
      normalizeDocumentName(docType.canonicalKey) === normalized ||
      normalizeDocumentName(docType.displayName) === normalized
    ) {
      return docType;
    }
  }

  // Check normalized aliases
  for (const docType of allDocumentTypes) {
    for (const aliasRecord of docType.aliases) {
      if (aliasRecord.normalizedAlias === normalized) {
        return docType;
      }
    }
  }

  return null;
}

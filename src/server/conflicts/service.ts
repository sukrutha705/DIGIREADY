/**
 * DigiReady - Conflict Resolution Subsystem Service
 * Exposes conflict guidance retrieval and assessment enrichment for citizens.
 */

import { prisma } from "@/lib/prisma";
import { getVaultConsistencyAssessment } from "@/server/consistency/service";
import { generateConflictGuidance } from "./guidance";
import type { ConflictGuidance } from "./types";
import type { PrismaClient } from "@prisma/client";

export async function getVaultConflictGuidanceList(
  userId: string,
  db: PrismaClient = prisma
): Promise<ConflictGuidance[]> {
  const consistency = await getVaultConsistencyAssessment(userId, db);
  if (!consistency.hasConflicts) {
    return [];
  }

  // Fetch document metadata to enrich affected documents
  const docs = await db.document.findMany({
    where: { userId },
    select: {
      id: true,
      issuer: true,
      fields: {
        select: {
          fieldName: true,
          rawExtractedValue: true,
          normalizedValue: true,
        },
      },
    },
  });

  const rawDocsMap: Record<string, { issuer: string; rawExtractedValue?: string }> = {};
  docs.forEach((d) => {
    rawDocsMap[d.id] = {
      issuer: d.issuer,
    };
  });

  return consistency.conflicts.map((conflictComp) =>
    generateConflictGuidance(conflictComp, rawDocsMap)
  );
}

export async function getConflictGuidanceForField(
  userId: string,
  fieldKey: string,
  db: PrismaClient = prisma
): Promise<ConflictGuidance | null> {
  const list = await getVaultConflictGuidanceList(userId, db);
  return list.find((g) => g.fieldKey === fieldKey) || null;
}

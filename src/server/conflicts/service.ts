/**
 * DigiReady - Conflict Issue Service
 * Phase 9.3: Resolves rich ConflictIssue domain objects with authority routing and location-aware centres.
 */

import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import { getVaultConsistencyAssessment } from "@/server/consistency/service";
import {
  buildConflictResolutionPlan,
  generateConflictGuidance,
  resolveCorrectionAuthority,
  requiresPhysicalCentre,
} from "./guidance";
import { getCorrectionCentres } from "@/server/centres/service";
import type { ConflictIssue, ConflictSeverity, ConflictIssueStatus, ConflictGuidance } from "./types";

export const evaluateConsistency = getVaultConsistencyAssessment;

export async function getVaultConflictGuidanceList(
  userId: string,
  db: PrismaClient = prisma
): Promise<ConflictGuidance[]> {
  const assessment = await getVaultConsistencyAssessment(userId, db);
  return assessment.conflictGuidanceList || [];
}

export async function getConflictGuidanceForField(
  userId: string,
  fieldKey: string,
  db: PrismaClient = prisma
): Promise<ConflictGuidance | null> {
  const assessment = await getVaultConsistencyAssessment(userId, db);
  const conflict = assessment.conflicts.find((c) => c.fieldKey === fieldKey);
  return conflict?.guidance || null;
}

export async function getConflictIssues(
  userId: string,
  userCity?: string | null,
  db: PrismaClient = prisma
): Promise<ConflictIssue[]> {
  const assessment = await getVaultConsistencyAssessment(userId, db);

  if (!assessment.hasConflicts || assessment.conflicts.length === 0) {
    return [];
  }

  const issues: ConflictIssue[] = assessment.conflicts.map((comparison) => {
    const authority = resolveCorrectionAuthority(comparison);
    const centreRequired = requiresPhysicalCentre(comparison);
    const guidance = generateConflictGuidance(comparison);
    const plan = buildConflictResolutionPlan(comparison);

    const docA = guidance.affectedDocuments[0] || {
      documentId: "doc-1",
      documentDisplayName: "Document 1",
      documentTypeKey: "UNKNOWN",
      fieldName: comparison.fieldKey,
      value: comparison.distinctValues[0] || "Unknown",
      issuer: "Issuing Authority",
    };

    const docB = guidance.affectedDocuments[1] || {
      documentId: "doc-2",
      documentDisplayName: "Document 2",
      documentTypeKey: "UNKNOWN",
      fieldName: comparison.fieldKey,
      value: comparison.distinctValues[1] || "Unknown",
      issuer: "Issuing Authority",
    };

    const severity: ConflictSeverity =
      comparison.severity === "CRITICAL" ||
      comparison.status === "POTENTIAL_MISMATCH" ||
      comparison.fieldKey === "name" ||
      comparison.fieldKey === "dateOfBirth"
        ? "BLOCKING"
        : "WARNING";

    let status: ConflictIssueStatus = "OPEN";
    let recommendedCentres = undefined;

    if (userCity) {
      const centreResult = getCorrectionCentres(authority.id, userCity);
      if (centreResult.isVerifiedAvailable && centreResult.verifiedCentres.length > 0) {
        status = "CENTRE_RECOMMENDED";
        recommendedCentres = centreResult.verifiedCentres;
      } else {
        status = "GUIDANCE_AVAILABLE";
      }
    } else {
      status = "GUIDANCE_AVAILABLE";
    }

    return {
      id: `issue-${comparison.fieldKey}`,
      documentA: docA,
      documentB: docB,
      field: comparison.fieldKey,
      fieldLabel: comparison.fieldLabel || comparison.fieldKey,
      valueA: docA.value,
      valueB: docB.value,
      severity,
      status,
      explanation: comparison.explanation || guidance.explanation,
      whyItMatters: guidance.whyCorrectionMayBeRequired,
      resolutionPlan: plan,
      authority,
      centreRequired,
      userCity: userCity || null,
      recommendedCentres,
      officialWebsite: authority.officialUrl,
      officialInstructionsUrl: authority.officialUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  return issues;
}

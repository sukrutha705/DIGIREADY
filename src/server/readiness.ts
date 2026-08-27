import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import type {
  ReadinessResult,
  ReadinessRequirementResult,
  RequirementEvaluationStatus,
} from "@/types/readiness";

/**
 * Domain error thrown when a requested User is not found in the database.
 */
export class UserNotFoundError extends Error {
  constructor(userId: string) {
    super(`User with ID '${userId}' was not found.`);
    this.name = "UserNotFoundError";
  }
}

/**
 * Domain error thrown when a requested Service is not found in the database.
 */
export class ServiceNotFoundError extends Error {
  constructor(serviceKey: string) {
    super(`Service with key '${serviceKey}' was not found.`);
    this.name = "ServiceNotFoundError";
  }
}

/**
 * Deterministically evaluates a citizen's document vault against a public service's requirements.
 * 
 * Matching Strategy:
 * - Compares canonical DocumentType IDs between ServiceRequirement and User Document records.
 * - Does NOT use display names, aliases, or fuzzy string comparisons.
 * 
 * Status Classification:
 * - REQUIRED: "PRESENT" if at least one matching document exists; "MISSING" otherwise.
 * - OPTIONAL: "OPTIONAL" (matching document IDs attached if available; does not block completion).
 * - CONDITIONAL: "CONDITIONAL" (matching document IDs attached if available; does not block completion in Phase 4).
 * 
 * Overall Status:
 * - "COMPLETE" only when requiredMissing === 0.
 * - "INCOMPLETE" when requiredMissing > 0.
 */
export async function evaluateServiceReadiness(
  userId: string,
  serviceKey: string,
  db: PrismaClient = prisma
): Promise<ReadinessResult> {
  const trimmedUserId = userId?.trim();
  if (!trimmedUserId) {
    throw new UserNotFoundError(userId || "EMPTY_USER_ID");
  }

  const trimmedServiceKey = serviceKey?.trim();
  if (!trimmedServiceKey) {
    throw new ServiceNotFoundError(serviceKey || "EMPTY_SERVICE_KEY");
  }

  // 1. Retrieve User and synthetic vault document references
  const user = await db.user.findUnique({
    where: { id: trimmedUserId },
    include: {
      documents: {
        select: {
          id: true,
          documentTypeId: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!user) {
    throw new UserNotFoundError(trimmedUserId);
  }

  // 2. Retrieve Service and its ordered requirements
  const service = await db.service.findUnique({
    where: { serviceKey: trimmedServiceKey },
    include: {
      requirements: {
        orderBy: { sortOrder: "asc" },
        include: {
          documentType: true,
        },
      },
    },
  });

  if (!service) {
    throw new ServiceNotFoundError(trimmedServiceKey);
  }

  // 3. Build lookup map of user documents grouped by canonical DocumentType ID
  const userDocsByTypeId = new Map<string, string[]>();
  for (const doc of user.documents) {
    const existing = userDocsByTypeId.get(doc.documentTypeId) ?? [];
    existing.push(doc.id);
    userDocsByTypeId.set(doc.documentTypeId, existing);
  }

  // 4. Evaluate each requirement deterministically in sortOrder
  let requiredTotal = 0;
  let requiredSatisfied = 0;

  const evaluatedRequirements: ReadinessRequirementResult[] = service.requirements.map((req) => {
    const matchingDocs = userDocsByTypeId.get(req.documentTypeId) ?? [];
    let status: RequirementEvaluationStatus;

    if (req.requirementType === "REQUIRED") {
      requiredTotal += 1;
      if (matchingDocs.length > 0) {
        status = "PRESENT";
        requiredSatisfied += 1;
      } else {
        status = "MISSING";
      }
    } else if (req.requirementType === "OPTIONAL") {
      status = "OPTIONAL";
    } else if (req.requirementType === "CONDITIONAL") {
      status = "CONDITIONAL";
    } else {
      // Fallback for any future requirement types
      status = matchingDocs.length > 0 ? "PRESENT" : "MISSING";
    }

    return {
      requirementKey: req.requirementKey,
      label: req.label,
      requirementType: req.requirementType,
      status,
      conditionKey: req.conditionKey,
      documentTypeId: req.documentTypeId,
      documentTypeKey: req.documentType.canonicalKey,
      documentTypeName: req.documentType.displayName,
      matchingDocumentIds: matchingDocs,
    };
  });

  const requiredMissing = requiredTotal - requiredSatisfied;
  const overallStatus = requiredMissing === 0 ? "COMPLETE" : "INCOMPLETE";

  return {
    serviceKey: service.serviceKey,
    serviceName: service.name,
    userId: user.id,
    userDisplayName: user.displayName,
    overallStatus,
    requiredTotal,
    requiredSatisfied,
    requiredMissing,
    requirements: evaluatedRequirements,
    evaluatedAt: new Date().toISOString(),
  };
}

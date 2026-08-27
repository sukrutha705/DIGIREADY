import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import { getServiceRequirement } from "./registry";
import { ServiceReadiness, ReadinessDocument } from "./types";
import { getUserDocuments } from "@/server/vault";

/**
 * Normalizes document string token for matching.
 */
function normalizeDocToken(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Evaluates a citizen's vault documents against the requirements of a specified service.
 * Returns a structured ServiceReadiness DTO, or null if the service is unknown.
 */
export async function getServiceReadiness(
  userId: string,
  serviceName: string,
  db: PrismaClient = prisma
): Promise<ServiceReadiness | null> {
  const serviceReq = getServiceRequirement(serviceName);
  if (!serviceReq) {
    return null;
  }

  // Reuse existing vault service abstraction (zero duplicate DB queries)
  const userDocuments = await getUserDocuments(userId, undefined, db);

  const evaluatedDocuments: ReadinessDocument[] = serviceReq.requiredDocuments.map((req) => {
    // Find matching document in user's vault
    const matched = userDocuments.find((doc) => {
      // 1. Match canonical key
      if (doc.documentTypeKey === req.documentType) {
        return true;
      }

      const normDocName = normalizeDocToken(doc.displayName);
      const normDocTypeName = normalizeDocToken(doc.documentTypeName);
      const normReqName = normalizeDocToken(req.displayName);

      // 2. Match display name / type name
      if (normDocName === normReqName || normDocTypeName === normReqName) {
        return true;
      }

      // 3. Match aliases
      if (req.aliases) {
        for (const alias of req.aliases) {
          const normAlias = normalizeDocToken(alias);
          if (normDocName.includes(normAlias) || normDocTypeName.includes(normAlias) || normAlias === normDocName) {
            return true;
          }
        }
      }

      return false;
    });

    if (matched) {
      return {
        documentType: req.documentType,
        displayName: req.displayName,
        required: req.required,
        status: "AVAILABLE",
        documentId: matched.id,
        matchedDocumentName: matched.displayName,
      };
    }

    return {
      documentType: req.documentType,
      displayName: req.displayName,
      required: req.required,
      status: "MISSING",
    };
  });

  const mandatoryDocs = evaluatedDocuments.filter((d) => d.required);
  const availableMandatory = mandatoryDocs.filter((d) => d.status === "AVAILABLE");
  const missingMandatory = mandatoryDocs.filter((d) => d.status === "MISSING");

  return {
    serviceId: serviceReq.serviceId,
    serviceName: serviceReq.serviceName,
    description: serviceReq.description,
    requiredCount: mandatoryDocs.length,
    availableCount: availableMandatory.length,
    missingCount: missingMandatory.length,
    ready: missingMandatory.length === 0,
    documents: evaluatedDocuments,
  };
}

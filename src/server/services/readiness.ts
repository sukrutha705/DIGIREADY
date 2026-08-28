import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import { getServiceBySlug, getServiceRequirement } from "./registry";
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
 * Supports slug, key, name, or alias.
 * Returns a structured ServiceReadiness DTO, or null if the service is unknown.
 */
export async function getServiceReadiness(
  userId: string,
  serviceName: string,
  db: PrismaClient = prisma
): Promise<ServiceReadiness | null> {
  if (!serviceName || typeof serviceName !== "string" || !serviceName.trim()) {
    return null;
  }

  // 1. Try in-memory canonical requirement first, then database
  let serviceReq = getServiceRequirement(serviceName);
  if (!serviceReq) {
    serviceReq = await getServiceBySlug(serviceName, db);
  }
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
      const normReqType = normalizeDocToken(req.documentType);

      // 2. Match display name / type name / canonical key
      if (
        normDocName === normReqName ||
        normDocTypeName === normReqName ||
        normDocName === normReqType ||
        normDocTypeName === normReqType
      ) {
        return true;
      }

      // 3. Match aliases
      if (req.aliases && req.aliases.length > 0) {
        for (const alias of req.aliases) {
          const normAlias = normalizeDocToken(alias);
          if (
            normDocName.includes(normAlias) ||
            normDocTypeName.includes(normAlias) ||
            normAlias === normDocName ||
            normAlias === normDocTypeName
          ) {
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
        condition: req.condition || null,
        notes: req.notes || null,
        status: "AVAILABLE",
        documentId: matched.id,
        matchedDocumentName: matched.displayName,
      };
    }

    return {
      documentType: req.documentType,
      displayName: req.displayName,
      required: req.required,
      condition: req.condition || null,
      notes: req.notes || null,
      status: "MISSING",
    };
  });

  const mandatoryDocs = evaluatedDocuments.filter((d) => d.required);
  const availableMandatory = mandatoryDocs.filter((d) => d.status === "AVAILABLE");
  const missingMandatory = mandatoryDocs.filter((d) => d.status === "MISSING");

  return {
    serviceId: serviceReq.serviceId,
    serviceName: serviceReq.serviceName,
    slug: serviceReq.slug || serviceReq.serviceId,
    authority: serviceReq.authority || null,
    jurisdiction: serviceReq.jurisdiction || null,
    officialWebsite: serviceReq.officialWebsite || null,
    officialApplicationUrl: serviceReq.officialApplicationUrl || null,
    description: serviceReq.description,
    requiredCount: mandatoryDocs.length,
    availableCount: availableMandatory.length,
    missingCount: missingMandatory.length,
    ready: missingMandatory.length === 0,
    documents: evaluatedDocuments,
  };
}


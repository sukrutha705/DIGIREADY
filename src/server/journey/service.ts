/**
 * DigiReady - End-to-End Application Journey Engine
 * Realigned for Preparation, Verification, and Cross-Document Consistency.
 */

import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import { getServiceReadiness } from "@/server/services/readiness";
import { verifyDocument } from "@/server/verification/verifier";
import { getVaultConsistencyAssessment } from "@/server/consistency";
import {
  ApplicationJourney,
  ApplicationJourneyStatus,
  JourneyAction,
  JourneyDocument,
  JourneyDocumentStatus,
  JourneyStatuses,
} from "./types";

export const JOURNEY_LIMITATION_NOTE =
  "DigiReady helps citizens check requirements, verify document information, and resolve identity conflicts before applying. DigiReady does not submit official applications to external government or examination authorities.";

/**
 * Deterministically constructs an end-to-end ApplicationJourney for a citizen and target public service.
 * Lifecycle: Requirements -> Documents -> Missing Guidance -> Metadata Checks -> Consistency -> Ready to Apply.
 */
export async function getApplicationJourney(
  userId: string,
  serviceQuery: string,
  db: PrismaClient = prisma
): Promise<ApplicationJourney | null> {
  const trimmedUserId = userId?.trim();
  const trimmedQuery = serviceQuery?.trim();

  if (!trimmedUserId || !trimmedQuery) {
    return null;
  }

  // 1. Resolve service and document readiness via existing readiness engine
  const readiness = await getServiceReadiness(trimmedUserId, trimmedQuery, db);
  if (!readiness) {
    return null;
  }

  // 2. Resolve cross-document consistency assessment
  const consistency = await getVaultConsistencyAssessment(trimmedUserId, db);

  const missingDocuments: JourneyDocument[] = [];
  const verifiedDocuments: JourneyDocument[] = [];
  const documentsNeedingReview: JourneyDocument[] = [];
  const nextActions: JourneyAction[] = [];

  // Create set of document IDs involved in any consistency conflict
  const conflictingDocIds = new Set(
    consistency.conflicts.flatMap((c) => c.entries.map((e) => e.documentId))
  );

  // 3. Evaluate each required and optional document in the service
  for (const docReq of readiness.documents) {
    if (docReq.status === "MISSING") {
      const journeyDoc: JourneyDocument = {
        documentType: docReq.documentType,
        displayName: docReq.displayName,
        required: docReq.required,
        status: "MISSING",
      };

      if (docReq.required) {
        missingDocuments.push(journeyDoc);
        nextActions.push({
          id: `guidance-${docReq.documentType.toLowerCase()}`,
          label: `How to get ${docReq.displayName}?`,
          type: "GUIDANCE",
          documentType: docReq.documentType,
        });
      }
    } else if (docReq.status === "AVAILABLE" && docReq.documentId) {
      // Re-verify document via existing verification engine
      const verification = await verifyDocument(trimmedUserId, docReq.documentId, db);
      const isVerified = verification.status === "READY_FOR_REVIEW";
      const hasConflict = conflictingDocIds.has(docReq.documentId);

      let status: JourneyDocumentStatus = "AVAILABLE";
      if (hasConflict) {
        status = "CONFLICT";
      } else if (isVerified) {
        status = "VERIFIED";
      } else {
        status = "NEEDS_REVIEW";
      }

      const journeyDoc: JourneyDocument = {
        documentType: docReq.documentType,
        displayName: docReq.displayName,
        required: docReq.required,
        status,
        documentId: docReq.documentId,
        matchedDocumentName: docReq.matchedDocumentName,
        verificationStatus: verification.status,
        hasConflict,
      };

      if (isVerified) {
        verifiedDocuments.push(journeyDoc);
        if (docReq.required) {
          nextActions.push({
            id: `verify-${docReq.documentId}`,
            label: `Inspect ${docReq.displayName} Metadata`,
            type: "VERIFY",
            documentId: docReq.documentId,
            documentType: docReq.documentType,
          });
        }
      } else {
        documentsNeedingReview.push(journeyDoc);
        if (docReq.required) {
          nextActions.push({
            id: `verify-${docReq.documentId}`,
            label: `Verify ${docReq.displayName}`,
            type: "VERIFY",
            documentId: docReq.documentId,
            documentType: docReq.documentType,
          });
        }
      }
    }
  }

  // Add conflict actions if any exist
  if (consistency.hasConflicts) {
    for (const conflict of consistency.conflicts) {
      nextActions.push({
        id: `conflict-${conflict.fieldKey}`,
        label: `Review ${conflict.fieldLabel} Mismatch`,
        type: "CONFLICT",
      });
    }
  }

  // 4. Calculate overall deterministic journey lifecycle status
  let journeyStatus: ApplicationJourneyStatus = JourneyStatuses.IN_PROGRESS;

  const requiredMissingCount = missingDocuments.filter((d) => d.required).length;
  const requiredNeedingReviewCount = documentsNeedingReview.filter((d) => d.required).length;

  if (requiredMissingCount > 0) {
    journeyStatus = JourneyStatuses.MISSING_DOCUMENTS;
  } else if (requiredNeedingReviewCount > 0) {
    journeyStatus = JourneyStatuses.READY_FOR_VERIFICATION;
  } else if (consistency.hasConflicts) {
    journeyStatus = JourneyStatuses.NEEDS_ATTENTION;
  } else {
    journeyStatus = JourneyStatuses.READY_TO_APPLY;
  }

  // Always include a refresh action
  nextActions.push({
    id: "refresh-journey",
    label: "Refresh Application Readiness",
    type: "REFRESH",
  });

  return {
    serviceId: readiness.serviceId,
    serviceName: readiness.serviceName,
    status: journeyStatus,
    startedAt: new Date().toISOString(),
    requiredCount: readiness.requiredCount,
    availableCount: readiness.availableCount,
    missingCount: readiness.missingCount,
    readiness,
    missingDocuments,
    verifiedDocuments,
    documentsNeedingReview,
    consistency,
    conflicts: consistency.conflicts,
    nextActions,
    limitationNote: JOURNEY_LIMITATION_NOTE,
  };
}

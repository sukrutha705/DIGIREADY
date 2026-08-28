/**
 * DigiReady - End-to-End Application Journey Engine
 * Phase 9.2: Complete Readiness, Eligibility Intelligence, Application Windows, & Blockers.
 */

import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import { getServiceReadiness } from "@/server/services/readiness";
import { verifyDocument } from "@/server/verification/verifier";
import { getVaultConsistencyAssessment } from "@/server/consistency";
import { evaluateServiceEligibility } from "@/server/eligibility/service";
import { getApplicationWindowInfo } from "@/server/application-window/service";
import {
  ApplicationJourney,
  ApplicationJourneyStatus,
  JourneyAction,
  JourneyDocument,
  JourneyDocumentStatus,
  JourneyStatuses,
  ReadinessBlocker,
} from "./types";
import { EligibilityStatuses } from "@/server/eligibility/types";
import { ApplicationWindowStatuses } from "@/server/application-window/types";
import { getCanonicalDocumentSlug } from "@/server/guidance/slugs";

export const JOURNEY_LIMITATION_NOTE =
  "DigiReady helps citizens check requirements, evaluate statutory eligibility, verify documents, and resolve identity conflicts before applying. DigiReady does not submit official applications to external government or examination authorities.";

/**
 * Deterministically constructs an end-to-end ApplicationJourney for a citizen and target public service.
 * Lifecycle: Requirements -> Documents -> Missing Guidance -> Metadata Checks -> Consistency -> Eligibility -> Window -> Ready to Apply.
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

  // 3. Resolve eligibility evaluation
  const eligibility = await evaluateServiceEligibility(trimmedUserId, trimmedQuery, db);

  // 4. Resolve application window and deadline intelligence
  const applicationWindow = await getApplicationWindowInfo(trimmedQuery, db);

  const missingDocuments: JourneyDocument[] = [];
  const verifiedDocuments: JourneyDocument[] = [];
  const documentsNeedingReview: JourneyDocument[] = [];
  const nextActions: JourneyAction[] = [];
  const blockers: ReadinessBlocker[] = [];

  // Create set of document IDs involved in any consistency conflict
  const conflictingDocIds = new Set(
    consistency.conflicts.flatMap((c) => c.entries.map((e) => e.documentId))
  );

  // 5. Evaluate each required and optional document in the service
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
        const canonicalDocSlug = getCanonicalDocumentSlug(docReq.documentType);
        nextActions.push({
          id: `guidance-${canonicalDocSlug}`,
          label: `How to get ${docReq.displayName}?`,
          type: "GUIDANCE",
          documentType: docReq.documentType,
        });

        blockers.push({
          id: `blocker-missing-${docReq.documentType}`,
          category: "DOCUMENT_MISSING",
          title: `Missing ${docReq.displayName}`,
          description: docReq.notes || `This required document is not yet in your DigiReady vault.`,
          actionLabel: `Get ${docReq.displayName} Guidance`,
          actionType: "GUIDANCE",
          documentType: docReq.documentType,
          actionHref: `/guidance/${canonicalDocSlug}`,
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

          blockers.push({
            id: `blocker-verify-${docReq.documentId}`,
            category: "VERIFICATION",
            title: `${docReq.displayName} Metadata Check`,
            description: `Document has fields requiring confirmation or review.`,
            actionLabel: `Review Metadata`,
            actionType: "INSPECT_DOCUMENT",
            documentId: docReq.documentId,
            actionHref: `/documents/${docReq.documentId}`,
          });
        }
      }
    }
  }

  // 6. Add conflict actions and blockers if any exist
  if (consistency.hasConflicts) {
    for (const conflict of consistency.conflicts) {
      nextActions.push({
        id: `conflict-${conflict.fieldKey}`,
        label: `Review ${conflict.fieldLabel} Mismatch`,
        type: "CONFLICT",
      });

      const conflictSlug =
        conflict.fieldKey === "name"
          ? "name-mismatch"
          : conflict.fieldKey === "dateOfBirth"
          ? "dob-mismatch"
          : conflict.fieldKey === "parentName"
          ? "parent-name-mismatch"
          : conflict.fieldKey === "address"
          ? "address-mismatch"
          : "name-mismatch";

      blockers.push({
        id: `blocker-conflict-${conflict.fieldKey}`,
        category: "CONFLICT",
        title: `Identity Conflict: ${conflict.fieldLabel}`,
        description: `Different values found across ${conflict.entries
          .map((e) => e.documentDisplayName)
          .join(" and ")}.`,
        actionLabel: `Resolve in Guidance Center`,
        actionType: "CONFLICT_GUIDANCE",
        actionHref: `/guidance/${conflictSlug}`,
      });
    }
  }

  // 7. Add eligibility blockers if any exist
  if (eligibility.overallStatus === EligibilityStatuses.NEEDS_INFORMATION) {
    for (const field of eligibility.missingFields) {
      nextActions.push({
        id: `eligibility-${field}`,
        label: `Provide ${field} for Eligibility Check`,
        type: "PROVIDE_INFO",
      });

      blockers.push({
        id: `blocker-eligibility-${field}`,
        category: "ELIGIBILITY",
        title: `Eligibility Information Needed`,
        description: `Your ${field} is required to evaluate eligibility for ${readiness.serviceName}.`,
        actionLabel: `Provide Information`,
        actionType: "PROVIDE_INFORMATION",
        actionHref: `/profile`,
      });
    }
  } else if (eligibility.overallStatus === EligibilityStatuses.NOT_ELIGIBLE) {
    const failedCriteria = eligibility.criteria.filter((c) => c.status === "FAIL");
    for (const crit of failedCriteria) {
      blockers.push({
        id: `blocker-ineligible-${crit.id}`,
        category: "ELIGIBILITY",
        title: `Eligibility Condition Not Met: ${crit.name}`,
        description: crit.explanation,
        actionLabel: `View Eligibility Details`,
        actionType: "PROVIDE_INFORMATION",
        actionHref: `/journey/${encodeURIComponent(readiness.slug || readiness.serviceId)}#eligibility`,
      });
    }
  }

  // 8. Add application window blockers if closed
  if (applicationWindow.status === ApplicationWindowStatuses.CLOSED) {
    blockers.push({
      id: "blocker-window-closed",
      category: "DEADLINE",
      title: "Application Window Closed",
      description: `The application period for this cycle closed on ${applicationWindow.applicationEnd || "the official deadline"}.`,
      actionLabel: "Check Official Portal for Next Cycle",
      actionType: "CHECK_PORTAL",
      actionHref: applicationWindow.sourceUrl || applicationWindow.officialWebsite || "#",
    });
  }

  // 9. Calculate overall deterministic journey lifecycle status
  let journeyStatus: ApplicationJourneyStatus = JourneyStatuses.IN_PROGRESS;

  const requiredMissingCount = missingDocuments.filter((d) => d.required).length;
  const requiredNeedingReviewCount = documentsNeedingReview.filter((d) => d.required).length;

  if (requiredMissingCount > 0) {
    journeyStatus = JourneyStatuses.MISSING_DOCUMENTS;
  } else if (eligibility.overallStatus === EligibilityStatuses.NOT_ELIGIBLE) {
    journeyStatus = JourneyStatuses.NOT_ELIGIBLE;
  } else if (eligibility.overallStatus === EligibilityStatuses.NEEDS_INFORMATION && !consistency.hasConflicts) {
    journeyStatus = JourneyStatuses.NEEDS_INFORMATION;
  } else if (applicationWindow.status === ApplicationWindowStatuses.CLOSED) {
    journeyStatus = JourneyStatuses.APPLICATION_WINDOW_CLOSED;
  } else if (consistency.hasConflicts) {
    journeyStatus = JourneyStatuses.NEEDS_ATTENTION;
  } else if (requiredNeedingReviewCount > 0) {
    journeyStatus = JourneyStatuses.READY_FOR_VERIFICATION;
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
    slug: readiness.slug,
    status: journeyStatus,
    startedAt: new Date().toISOString(),
    requiredCount: readiness.requiredCount,
    availableCount: readiness.availableCount,
    missingCount: readiness.missingCount,
    officialWebsite: readiness.officialWebsite,
    officialApplicationUrl: readiness.officialApplicationUrl,
    readiness,
    missingDocuments,
    verifiedDocuments,
    documentsNeedingReview,
    consistency,
    conflicts: consistency.conflicts,
    nextActions,
    blockers,
    eligibility,
    applicationWindow,
    limitationNote: JOURNEY_LIMITATION_NOTE,
  };
}

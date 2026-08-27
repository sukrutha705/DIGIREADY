import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import { getUserDocumentById, getUserDocuments } from "@/server/vault";
import { getVerificationRuleSet } from "./rules";
import { DocumentVerification, VerificationCheck, VerificationStatus } from "./types";

const LIMITATION_NOTE =
  "This assessment checks document metadata available in DigiReady. It does not confirm official government authenticity, legal validity, or statutory approval.";

/**
 * Normalizes string token for matching.
 */
function normalizeDocToken(str: string): string {
  if (!str || typeof str !== "string") {
    return "";
  }
  return str.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Deterministically verifies a citizen document's metadata completeness and trust indicators.
 */
export async function verifyDocument(
  userId: string,
  documentId: string,
  db: PrismaClient = prisma
): Promise<DocumentVerification> {
  // Reuse existing vault abstraction
  const document = await getUserDocumentById(userId, documentId, db);

  if (!document) {
    return {
      documentId,
      documentType: "UNKNOWN",
      displayName: "Document",
      status: "DOCUMENT_NOT_FOUND",
      checks: [
        {
          key: "DOCUMENT_EXISTS",
          label: "Document in vault",
          status: "FAIL",
          explanation: "The requested document was not found in the citizen vault or does not belong to this user.",
        },
      ],
      summary: "The requested document was not found in your DigiReady vault.",
      limitationNote: LIMITATION_NOTE,
    };
  }

  const ruleSet =
    getVerificationRuleSet(document.documentTypeKey) ||
    getVerificationRuleSet(document.documentTypeName) ||
    getVerificationRuleSet(document.displayName);

  if (!ruleSet) {
    return {
      documentId: document.id,
      documentType: document.documentTypeKey,
      displayName: document.displayName,
      status: "UNSUPPORTED_DOCUMENT",
      checks: [
        {
          key: "DOCUMENT_EXISTS",
          label: "Document in vault",
          status: "PASS",
          explanation: "Document is present in your vault.",
        },
        {
          key: "DOCUMENT_TYPE_SUPPORTED",
          label: "Verification rules configured",
          status: "FAIL",
          explanation: "No deterministic verification rules are configured for this document type.",
        },
      ],
      summary: `This document is available in your vault, but DigiReady does not currently have verification rules configured for '${document.displayName}'.`,
      limitationNote: LIMITATION_NOTE,
    };
  }

  const checks: VerificationCheck[] = [];

  // Check 1: Document Exists
  checks.push({
    key: "DOCUMENT_EXISTS",
    label: "Document present in vault",
    status: "PASS",
    explanation: "Document is present in your vault.",
  });

  // Check 2: Canonical Type Recognized
  checks.push({
    key: "DOCUMENT_TYPE_RECOGNIZED",
    label: "Document type recognized",
    status: "PASS",
    explanation: `Recognized canonical document type: ${ruleSet.displayName}.`,
  });

  // Check 3: Issuer Present
  if (ruleSet.requireIssuer) {
    const hasIssuer = Boolean(document.issuer && document.issuer.trim() !== "");
    checks.push({
      key: "ISSUER_PRESENT",
      label: "Issuing authority recorded",
      status: hasIssuer ? "PASS" : "FAIL",
      explanation: hasIssuer
        ? `Issued by ${document.issuer}.`
        : "Issuing authority metadata is missing.",
    });
  }

  // Check 4: Issue Date Present
  if (ruleSet.requireIssueDate) {
    const hasIssueDate = Boolean(document.issueDate);
    checks.push({
      key: "ISSUE_DATE_PRESENT",
      label: "Issue date recorded",
      status: hasIssueDate ? "PASS" : "FAIL",
      explanation: hasIssueDate && document.issueDate
        ? `Issue date is recorded (${document.issueDate.split("T")[0]}).`
        : "Issue date metadata is missing.",
    });
  }

  // Check 5: Expiry Check
  if (ruleSet.checkExpiry) {
    let expiryPass = true;
    let explanation = "No expiry restriction specified.";

    if (document.expiryDate) {
      const expiryDate = new Date(document.expiryDate);
      if (expiryDate.getTime() < Date.now()) {
        expiryPass = false;
        explanation = `Document recorded validity expired on ${document.expiryDate.split("T")[0]}.`;
      } else {
        explanation = `Document validity is active (expires on ${document.expiryDate.split("T")[0]}).`;
      }
    }

    checks.push({
      key: "EXPIRY_CHECK",
      label: "Validity period active",
      status: expiryPass ? "PASS" : "FAIL",
      explanation,
    });
  }

  // Check 6: Semantic Field Roles
  if (ruleSet.requiredSemanticRoles.length > 0) {
    const availableRoles = new Set(document.fields.map((f) => f.semanticRole).filter(Boolean));
    const missingRoles = ruleSet.requiredSemanticRoles.filter((role) => !availableRoles.has(role));

    const fieldsPass = missingRoles.length === 0;
    checks.push({
      key: "REQUIRED_METADATA_PRESENT",
      label: "Required metadata fields present",
      status: fieldsPass ? "PASS" : "FAIL",
      explanation: fieldsPass
        ? "All expected metadata fields are present."
        : `Missing expected metadata fields: ${missingRoles.join(", ")}.`,
    });
  }

  const allPassed = checks.every((c) => c.status === "PASS");
  const status: VerificationStatus = allPassed ? "READY_FOR_REVIEW" : "NEEDS_REVIEW";

  let summary = "";
  if (status === "READY_FOR_REVIEW") {
    summary = `Your ${document.displayName} is available in your DigiReady vault and contains the expected metadata for this prototype. It is ready for review.`;
  } else {
    summary = `Your ${document.displayName} is available, but some expected metadata is missing or requires attention. It needs review before it can be considered ready for review in this prototype.`;
  }

  return {
    documentId: document.id,
    documentType: document.documentTypeKey,
    displayName: document.displayName,
    status,
    checks,
    summary,
    limitationNote: LIMITATION_NOTE,
  };
}

/**
 * Finds a document by query name or alias in the citizen vault and runs deterministic verification.
 */
export async function verifyDocumentByType(
  userId: string,
  documentQuery: string,
  db: PrismaClient = prisma
): Promise<{
  verification?: DocumentVerification;
  multipleMatches?: boolean;
  matchedCount?: number;
  matchedDocuments?: { id: string; name: string }[];
}> {
  const normQuery = normalizeDocToken(documentQuery);
  const targetRule = getVerificationRuleSet(normQuery);
  const userDocuments = await getUserDocuments(userId, undefined, db);

  const matches = userDocuments.filter((doc) => {
    const normKey = normalizeDocToken(doc.documentTypeKey);
    const normName = normalizeDocToken(doc.displayName);
    const normTypeName = normalizeDocToken(doc.documentTypeName);

    if (normKey === normQuery || normName === normQuery || normTypeName === normQuery) {
      return true;
    }
    if (normName.includes(normQuery) || normQuery.includes(normName)) {
      return true;
    }
    if (targetRule && (targetRule.documentType === doc.documentTypeKey || normKey === normalizeDocToken(targetRule.documentType))) {
      return true;
    }
    return false;
  });

  if (matches.length === 0) {
    if (!targetRule) {
      return {
        verification: {
          documentType: documentQuery,
          displayName: documentQuery,
          status: "UNSUPPORTED_DOCUMENT",
          checks: [
            {
              key: "DOCUMENT_EXISTS",
              label: "Document in vault",
              status: "NOT_CHECKED",
              explanation: "Document was not matched in your vault.",
            },
            {
              key: "DOCUMENT_TYPE_RECOGNIZED",
              label: "Verification rules configured",
              status: "FAIL",
              explanation: `DigiReady does not currently have verification rules configured for '${documentQuery}'.`,
            },
          ],
          summary: `DigiReady does not currently have verification rules configured for '${documentQuery}'.`,
          limitationNote: LIMITATION_NOTE,
        },
      };
    }

    return {
      verification: {
        documentType: targetRule.documentType,
        displayName: targetRule.displayName,
        status: "DOCUMENT_NOT_FOUND",
        checks: [
          {
            key: "DOCUMENT_EXISTS",
            label: "Document in vault",
            status: "FAIL",
            explanation: `No document matching '${documentQuery}' was found in your vault.`,
          },
        ],
        summary: `I couldn't find '${documentQuery}' in your DigiReady vault.`,
        limitationNote: LIMITATION_NOTE,
      },
    };
  }

  if (matches.length > 1) {
    return {
      multipleMatches: true,
      matchedCount: matches.length,
      matchedDocuments: matches.map((m) => ({ id: m.id, name: m.displayName })),
    };
  }

  const verification = await verifyDocument(userId, matches[0].id, db);
  return { verification };
}

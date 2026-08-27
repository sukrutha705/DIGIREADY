/**
 * DigiReady - Secure Document Sharing Service
 * Phase 7.5: Deterministic Sharing Engine, Token Generation, and Consent Enforcement
 */

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import { getUserDocumentById } from "@/server/vault";
import { maskIdentifier, formatDate } from "@/lib/formatters";
import { SHARING_POLICY, calculateExpiryDate, isShareExpired } from "./policy";
import {
  DocumentShareRecord,
  ShareConsentPayload,
  SharePreviewDTO,
  ShareStatus,
  SharedFieldDTO,
} from "./types";

export class ConsentRequiredError extends Error {
  constructor(message = "Affirmative citizen consent is required to create a document share grant.") {
    super(message);
    this.name = "ConsentRequiredError";
  }
}

export class ShareValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShareValidationError";
  }
}

export class ShareNotFoundError extends Error {
  constructor(message = "Document share grant not found or access denied.") {
    super(message);
    this.name = "ShareNotFoundError";
  }
}

/**
 * Generates a cryptographically random, non-guessable share token.
 */
export function generateShareToken(): string {
  const randomHex = crypto.randomBytes(SHARING_POLICY.tokenRandomBytes).toString("hex");
  return `${SHARING_POLICY.tokenPrefix}${randomHex}`;
}

/**
 * Computes a share preview with attribute scoping options for a citizen document.
 * Does NOT create any share record or active token.
 */
export async function getSharePreview(
  userId: string,
  documentId: string,
  recipient?: string,
  purpose?: string,
  db: PrismaClient = prisma
): Promise<SharePreviewDTO | null> {
  const document = await getUserDocumentById(userId, documentId, db);
  if (!document) {
    return null;
  }

  const availableFields = document.fields.map((field) => {
    const isIdentifier = field.fieldType === "IDENTIFIER" || field.semanticRole === "IDENTIFIER";
    const isDate = field.fieldType === "DATE" || field.semanticRole === "DATE_OF_BIRTH";
    const displayValue = isIdentifier
      ? maskIdentifier(field.normalizedValue)
      : isDate
      ? formatDate(field.normalizedValue)
      : field.normalizedValue;

    return {
      id: field.id,
      fieldName: field.fieldName,
      fieldType: field.fieldType,
      semanticRole: field.semanticRole,
      displayValue,
    };
  });

  return {
    documentId: document.id,
    documentDisplayName: document.displayName,
    documentTypeKey: document.documentTypeKey,
    issuer: document.issuer,
    suggestedRecipient: recipient?.trim() || undefined,
    suggestedPurpose: purpose?.trim() || undefined,
    availableFields,
    defaultFieldIds: availableFields.map((f) => f.id),
    permissions: SHARING_POLICY.defaultPermissions,
    expiresInDays: Math.round(SHARING_POLICY.defaultExpiryHours / 24),
    consentNotice: SHARING_POLICY.consentNotice,
    limitationNote: SHARING_POLICY.limitationNote,
  };
}

/**
 * Creates an active document share grant ONLY after affirmative citizen consent.
 */
export async function createDocumentShare(
  userId: string,
  payload: ShareConsentPayload,
  db: PrismaClient = prisma
): Promise<DocumentShareRecord> {
  // 1. Mandatory affirmative consent verification
  if (payload.consent !== true) {
    throw new ConsentRequiredError();
  }

  // 2. Validate recipient and purpose
  const recipientName = payload.recipientName?.trim();
  if (!recipientName) {
    throw new ShareValidationError("Recipient name is required.");
  }

  const purpose = payload.purpose?.trim();
  if (!purpose) {
    throw new ShareValidationError("Sharing purpose is required.");
  }

  // 3. Verify document ownership via existing vault abstraction
  const document = await getUserDocumentById(userId, payload.documentId, db);
  if (!document) {
    throw new ShareNotFoundError("Document not found in user vault.");
  }

  // 4. Validate and scope selected fields
  const validFieldIds = new Set(document.fields.map((f) => f.id));
  const selectedFieldIds = (payload.includedFieldIds || []).filter((id) => validFieldIds.has(id));

  // 5. Generate secure token and expiry
  const shareToken = generateShareToken();
  const expiresAt = calculateExpiryDate(payload.expiresInHours);

  // 6. Persist share grant
  const created = await db.documentShare.create({
    data: {
      shareToken,
      userId,
      documentId: document.id,
      recipientName,
      purpose,
      status: "ACTIVE",
      sharedFieldIdsJson: JSON.stringify(selectedFieldIds),
      canView: SHARING_POLICY.defaultPermissions.canView,
      canDownload: SHARING_POLICY.defaultPermissions.canDownload,
      expiresAt,
    },
  });

  // 7. Filter shared fields for DTO
  const selectedIdSet = new Set(selectedFieldIds);
  const sharedFields: SharedFieldDTO[] = document.fields
    .filter((f) => selectedIdSet.has(f.id))
    .map((f) => ({
      id: f.id,
      fieldName: f.fieldName,
      fieldType: f.fieldType,
      semanticRole: f.semanticRole,
      normalizedValue: f.normalizedValue,
    }));

  return {
    id: created.id,
    shareToken: created.shareToken,
    userId: created.userId,
    documentId: document.id,
    documentDisplayName: document.displayName,
    documentTypeKey: document.documentTypeKey,
    recipientName: created.recipientName,
    purpose: created.purpose,
    status: "ACTIVE",
    permissions: {
      canView: created.canView,
      canDownload: created.canDownload,
    },
    sharedFields,
    createdAt: created.createdAt.toISOString(),
    expiresAt: created.expiresAt.toISOString(),
    revokedAt: null,
    limitationNote: SHARING_POLICY.limitationNote,
  };
}

/**
 * Resolves a shared document view by token for controlled recipient consumption.
 * Deterministically evaluates expiry, revocation, and field scoping server-side.
 */
export async function getDocumentShareByToken(
  shareToken: string,
  db: PrismaClient = prisma
): Promise<DocumentShareRecord | null> {
  const trimmedToken = shareToken?.trim();
  if (!trimmedToken) {
    return null;
  }

  const share = await db.documentShare.findUnique({
    where: { shareToken: trimmedToken },
    include: {
      document: {
        include: {
          documentType: true,
          fields: true,
        },
      },
    },
  });

  if (!share) {
    return null;
  }

  // Determine current lifecycle status
  let status: ShareStatus = "ACTIVE";
  if (share.status === "REVOKED") {
    status = "REVOKED";
  } else if (isShareExpired(share.expiresAt)) {
    status = "EXPIRED";
  }

  // Server-side attribute scoping: only active shares return scoped fields
  let sharedFields: SharedFieldDTO[] = [];
  if (status === "ACTIVE") {
    let allowedFieldIds: string[] = [];
    try {
      allowedFieldIds = JSON.parse(share.sharedFieldIdsJson);
    } catch {
      allowedFieldIds = [];
    }

    const allowedSet = new Set(allowedFieldIds);
    sharedFields = share.document.fields
      .filter((f) => allowedSet.has(f.id))
      .map((f) => ({
        id: f.id,
        fieldName: f.fieldName,
        fieldType: f.fieldType,
        semanticRole: f.semanticRole,
        normalizedValue: f.normalizedValue,
      }));
  }

  return {
    id: share.id,
    shareToken: share.shareToken,
    userId: share.userId,
    documentId: share.documentId,
    documentDisplayName: share.document.displayName,
    documentTypeKey: share.document.documentType.canonicalKey,
    recipientName: share.recipientName,
    purpose: share.purpose,
    status,
    permissions: {
      canView: share.canView,
      canDownload: share.canDownload,
    },
    sharedFields,
    createdAt: share.createdAt.toISOString(),
    expiresAt: share.expiresAt.toISOString(),
    revokedAt: share.revokedAt ? share.revokedAt.toISOString() : null,
    limitationNote: SHARING_POLICY.limitationNote,
  };
}

/**
 * Retrieves all sharing grants created by the user, with optional document filtering.
 */
export async function getUserShares(
  userId: string,
  documentId?: string,
  db: PrismaClient = prisma
): Promise<DocumentShareRecord[]> {
  const trimmedUserId = userId?.trim();
  if (!trimmedUserId) {
    return [];
  }

  const whereClause: Record<string, any> = { userId: trimmedUserId };
  if (documentId && documentId.trim()) {
    whereClause.documentId = documentId.trim();
  }

  const shares = await db.documentShare.findMany({
    where: whereClause,
    include: {
      document: {
        include: {
          documentType: true,
          fields: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return shares.map((share) => {
    let status: ShareStatus = "ACTIVE";
    if (share.status === "REVOKED") {
      status = "REVOKED";
    } else if (isShareExpired(share.expiresAt)) {
      status = "EXPIRED";
    }

    let allowedFieldIds: string[] = [];
    try {
      allowedFieldIds = JSON.parse(share.sharedFieldIdsJson);
    } catch {
      allowedFieldIds = [];
    }
    const allowedSet = new Set(allowedFieldIds);

    const sharedFields: SharedFieldDTO[] = share.document.fields
      .filter((f) => allowedSet.has(f.id))
      .map((f) => ({
        id: f.id,
        fieldName: f.fieldName,
        fieldType: f.fieldType,
        semanticRole: f.semanticRole,
        normalizedValue: f.normalizedValue,
      }));

    return {
      id: share.id,
      shareToken: share.shareToken,
      userId: share.userId,
      documentId: share.documentId,
      documentDisplayName: share.document.displayName,
      documentTypeKey: share.document.documentType.canonicalKey,
      recipientName: share.recipientName,
      purpose: share.purpose,
      status,
      permissions: {
        canView: share.canView,
        canDownload: share.canDownload,
      },
      sharedFields,
      createdAt: share.createdAt.toISOString(),
      expiresAt: share.expiresAt.toISOString(),
      revokedAt: share.revokedAt ? share.revokedAt.toISOString() : null,
      limitationNote: SHARING_POLICY.limitationNote,
    };
  });
}

/**
 * Revokes an active share grant, enforcing user ownership.
 */
export async function revokeDocumentShare(
  userId: string,
  shareId: string,
  db: PrismaClient = prisma
): Promise<DocumentShareRecord> {
  const trimmedUserId = userId?.trim();
  const trimmedShareId = shareId?.trim();
  if (!trimmedUserId || !trimmedShareId) {
    throw new ShareNotFoundError();
  }

  const existing = await db.documentShare.findFirst({
    where: {
      id: trimmedShareId,
      userId: trimmedUserId,
    },
    include: {
      document: {
        include: {
          documentType: true,
          fields: true,
        },
      },
    },
  });

  if (!existing) {
    throw new ShareNotFoundError();
  }

  const updated = await db.documentShare.update({
    where: { id: trimmedShareId },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
    },
  });

  return {
    id: updated.id,
    shareToken: updated.shareToken,
    userId: updated.userId,
    documentId: existing.documentId,
    documentDisplayName: existing.document.displayName,
    documentTypeKey: existing.document.documentType.canonicalKey,
    recipientName: updated.recipientName,
    purpose: updated.purpose,
    status: "REVOKED",
    permissions: {
      canView: updated.canView,
      canDownload: updated.canDownload,
    },
    sharedFields: [],
    createdAt: updated.createdAt.toISOString(),
    expiresAt: updated.expiresAt.toISOString(),
    revokedAt: updated.revokedAt ? updated.revokedAt.toISOString() : null,
    limitationNote: SHARING_POLICY.limitationNote,
  };
}

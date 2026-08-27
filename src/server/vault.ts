import { prisma } from "@/lib/prisma";
import type { PrismaClient, User, Document, DocumentType, DocumentField } from "@prisma/client";
import { UserNotFoundError } from "@/server/readiness";

export interface VaultDocumentDTO {
  id: string;
  userId: string;
  documentTypeId: string;
  documentTypeKey: string;
  documentTypeName: string;
  category: string;
  displayName: string;
  source: string; // "ISSUED" | "UPLOADED"
  issuer: string;
  issueDate: string | null;
  expiryDate: string | null;
  imageStorageKey?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  extractionStatus?: string | null;
  extractionConfidence?: number | null;
  createdAt: string;
  updatedAt: string;
  fields: {
    id: string;
    fieldName: string;
    fieldType: string;
    semanticRole: string | null;
    normalizedValue: string;
    isUserCorrected?: boolean;
    rawExtractedValue?: string | null;
  }[];
}

export interface DocumentFilters {
  category?: string;
  source?: string;
  search?: string;
}

export interface CategorySummaryItem {
  category: string;
  displayName: string;
  count: number;
}

export interface UserVaultSummary {
  userId: string;
  userDisplayName: string;
  totalDocuments: number;
  issuedCount: number;
  uploadedCount: number;
  categoriesCount: number;
  categories: CategorySummaryItem[];
  recentDocuments: VaultDocumentDTO[];
}

/**
 * Retrieves the synthetic demo user for demonstration sessions.
 */
export async function getDemoUser(db: PrismaClient = prisma): Promise<User> {
  const user = await db.user.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!user) {
    throw new UserNotFoundError("DEMO_USER_NOT_FOUND");
  }

  return user;
}

/**
 * Retrieves filtered documents from the user's synthetic document vault.
 */
export async function getUserDocuments(
  userId: string,
  filters?: DocumentFilters,
  db: PrismaClient = prisma
): Promise<VaultDocumentDTO[]> {
  const trimmedUserId = userId?.trim();
  if (!trimmedUserId) {
    throw new UserNotFoundError(userId || "EMPTY_USER_ID");
  }

  const whereClause: Record<string, any> = {
    userId: trimmedUserId,
  };

  if (filters?.source && filters.source !== "ALL") {
    whereClause.source = filters.source.toUpperCase();
  }

  if (filters?.category && filters.category !== "ALL") {
    whereClause.documentType = {
      category: filters.category.toUpperCase(),
    };
  }

  if (filters?.search && filters.search.trim()) {
    const term = filters.search.trim();
    whereClause.OR = [
      { displayName: { contains: term } },
      { issuer: { contains: term } },
      { documentType: { displayName: { contains: term } } },
      { documentType: { canonicalKey: { contains: term.toUpperCase() } } },
    ];
  }

  const docs = await db.document.findMany({
    where: whereClause,
    include: {
      documentType: true,
      fields: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return docs.map((doc) => ({
    id: doc.id,
    userId: doc.userId,
    documentTypeId: doc.documentTypeId,
    documentTypeKey: doc.documentType.canonicalKey,
    documentTypeName: doc.documentType.displayName,
    category: doc.documentType.category,
    displayName: doc.displayName,
    source: doc.source,
    issuer: doc.issuer,
    issueDate: doc.issueDate ? doc.issueDate.toISOString() : null,
    expiryDate: doc.expiryDate ? doc.expiryDate.toISOString() : null,
    imageStorageKey: doc.imageStorageKey,
    mimeType: doc.mimeType,
    fileSize: doc.fileSize,
    extractionStatus: doc.extractionStatus,
    extractionConfidence: doc.extractionConfidence,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    fields: doc.fields.map((f) => ({
      id: f.id,
      fieldName: f.fieldName,
      fieldType: f.fieldType,
      semanticRole: f.semanticRole,
      normalizedValue: f.normalizedValue,
      isUserCorrected: f.isUserCorrected,
      rawExtractedValue: f.rawExtractedValue,
    })),
  }));
}

/**
 * Retrieves a single document by ID from the user's synthetic document vault.
 */
export async function getUserDocumentById(
  userId: string,
  documentId: string,
  db: PrismaClient = prisma
): Promise<VaultDocumentDTO | null> {
  const trimmedUserId = userId?.trim();
  const trimmedDocId = documentId?.trim();
  if (!trimmedUserId || !trimmedDocId) {
    return null;
  }

  const doc = await db.document.findFirst({
    where: {
      id: trimmedDocId,
      userId: trimmedUserId,
    },
    include: {
      documentType: true,
      fields: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!doc) {
    return null;
  }

  return {
    id: doc.id,
    userId: doc.userId,
    documentTypeId: doc.documentTypeId,
    documentTypeKey: doc.documentType.canonicalKey,
    documentTypeName: doc.documentType.displayName,
    category: doc.documentType.category,
    displayName: doc.displayName,
    source: doc.source,
    issuer: doc.issuer,
    issueDate: doc.issueDate ? doc.issueDate.toISOString() : null,
    expiryDate: doc.expiryDate ? doc.expiryDate.toISOString() : null,
    imageStorageKey: doc.imageStorageKey,
    mimeType: doc.mimeType,
    fileSize: doc.fileSize,
    extractionStatus: doc.extractionStatus,
    extractionConfidence: doc.extractionConfidence,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    fields: doc.fields.map((f) => ({
      id: f.id,
      fieldName: f.fieldName,
      fieldType: f.fieldType,
      semanticRole: f.semanticRole,
      normalizedValue: f.normalizedValue,
      isUserCorrected: f.isUserCorrected,
      rawExtractedValue: f.rawExtractedValue,
    })),
  };
}

/**
 * Computes dynamic vault summary metrics for the user.
 */
export async function getUserVaultSummary(
  userId: string,
  db: PrismaClient = prisma
): Promise<UserVaultSummary> {
  const trimmedUserId = userId?.trim();
  if (!trimmedUserId) {
    throw new UserNotFoundError(userId || "EMPTY_USER_ID");
  }

  const user = await db.user.findUnique({
    where: { id: trimmedUserId },
  });

  if (!user) {
    throw new UserNotFoundError(trimmedUserId);
  }

  const allDocs = await getUserDocuments(trimmedUserId, undefined, db);

  const issuedCount = allDocs.filter((d) => d.source === "ISSUED").length;
  const uploadedCount = allDocs.filter((d) => d.source === "UPLOADED").length;

  const categoryCounts = new Map<string, number>();
  for (const doc of allDocs) {
    const current = categoryCounts.get(doc.category) ?? 0;
    categoryCounts.set(doc.category, current + 1);
  }

  const categories: CategorySummaryItem[] = Array.from(categoryCounts.entries())
    .map(([category, count]) => ({
      category,
      displayName: formatCategoryTitle(category),
      count,
    }))
    .sort((a, b) => b.count - a.count || a.displayName.localeCompare(b.displayName));

  return {
    userId: user.id,
    userDisplayName: user.displayName,
    totalDocuments: allDocs.length,
    issuedCount,
    uploadedCount,
    categoriesCount: categories.length,
    categories,
    recentDocuments: allDocs.slice(0, 4),
  };
}

function formatCategoryTitle(category: string): string {
  return category
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

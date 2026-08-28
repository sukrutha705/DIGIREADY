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

import {
  getFallbackDemoUser,
  getBaselineVaultDocuments,
  FALLBACK_DEMO_USER_ID,
} from "./demo-fallback";

/**
 * Retrieves the synthetic demo user for demonstration sessions.
 * Falls back gracefully to in-memory baseline user if database is unseeded/unavailable.
 */
export async function getDemoUser(db: PrismaClient = prisma): Promise<User> {
  try {
    const user = await db.user.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (user) {
      return user;
    }
  } catch (err) {
    console.warn("[Vault] Database query failed or unavailable. Using resilient demo baseline:", err instanceof Error ? err.message : String(err));
  }

  return getFallbackDemoUser();
}

/**
 * Retrieves filtered documents from the user's synthetic document vault.
 * Falls back gracefully to in-memory baseline documents if database is unseeded/unavailable.
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

  try {
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

    if (docs) {
      let mapped = docs.map((doc) => ({
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

      if (filters?.source && filters.source !== "ALL") {
        mapped = mapped.filter((d) => d.source === filters.source?.toUpperCase());
      }
      if (filters?.category && filters.category !== "ALL") {
        mapped = mapped.filter((d) => d.category === filters.category?.toUpperCase());
      }
      return mapped;
    }
  } catch (err) {
    console.warn("[Vault] getUserDocuments database query failed. Using resilient demo baseline:", err instanceof Error ? err.message : String(err));
  }

  // Resilient fallback filtering
  let fallbackDocs = getBaselineVaultDocuments(trimmedUserId);
  if (filters?.source && filters.source !== "ALL") {
    fallbackDocs = fallbackDocs.filter((d) => d.source === filters.source?.toUpperCase());
  }
  if (filters?.category && filters.category !== "ALL") {
    fallbackDocs = fallbackDocs.filter((d) => d.category === filters.category?.toUpperCase());
  }
  if (filters?.search && filters.search.trim()) {
    const term = filters.search.trim().toLowerCase();
    fallbackDocs = fallbackDocs.filter(
      (d) =>
        d.displayName.toLowerCase().includes(term) ||
        d.issuer.toLowerCase().includes(term) ||
        d.documentTypeName.toLowerCase().includes(term) ||
        d.documentTypeKey.toLowerCase().includes(term)
    );
  }
  return fallbackDocs;
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

  try {
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

    if (doc) {
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
  } catch (err) {
    console.warn("[Vault] getUserDocumentById database query failed. Searching demo baseline:", err instanceof Error ? err.message : String(err));
  }

  const allFallback = getBaselineVaultDocuments(trimmedUserId);
  return allFallback.find((d) => d.id === trimmedDocId) || null;
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

  let userDisplayName = "Demo Citizen (KCET Applicant)";

  try {
    const user = await db.user.findUnique({
      where: { id: trimmedUserId },
    });
    if (user) {
      userDisplayName = user.displayName;
    }
  } catch (err) {
    console.warn("[Vault] getUserVaultSummary user query failed. Using demo baseline user:", err instanceof Error ? err.message : String(err));
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
    userId: trimmedUserId,
    userDisplayName,
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

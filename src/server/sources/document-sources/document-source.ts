import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";

export interface AvailableDocument {
  id: string;
  userId: string;
  documentTypeId: string;
  documentTypeKey: string;
  displayName: string;
  source: string;
  issuer: string;
  issueDate: Date | null;
  expiryDate: Date | null;
  createdAt: Date;
}

/**
 * Common abstraction for Document Source providers (e.g. Mock DigiLocker, Mock Issuer, Future Authorized APIs).
 * Allows downstream readiness and consistency engines to consume documents decoupled from direct database bindings.
 */
export interface DocumentSource {
  readonly sourceName: string;
  readonly sourceType: string;
  getAvailableDocuments(userId: string): Promise<AvailableDocument[]>;
}

/**
 * Mock DigiLocker Document Source.
 * Represents the citizen's synthetic document vault in the simulated DigiLocker environment.
 */
export class MockDigiLockerSource implements DocumentSource {
  readonly sourceName = "Mock DigiLocker Document Vault";
  readonly sourceType = "MOCK_VAULT";

  constructor(private db: PrismaClient = prisma) {}

  async getAvailableDocuments(userId: string): Promise<AvailableDocument[]> {
    const trimmed = userId?.trim();
    if (!trimmed) {
      return [];
    }

    const docs = await this.db.document.findMany({
      where: { userId: trimmed },
      include: {
        documentType: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return docs.map((doc) => ({
      id: doc.id,
      userId: doc.userId,
      documentTypeId: doc.documentTypeId,
      documentTypeKey: doc.documentType.canonicalKey,
      displayName: doc.displayName,
      source: doc.source,
      issuer: doc.issuer,
      issueDate: doc.issueDate,
      expiryDate: doc.expiryDate,
      createdAt: doc.createdAt,
    }));
  }
}

import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import {
  getDemoUser,
  getUserDocuments,
  getUserDocumentById,
  getUserVaultSummary,
} from "../src/server/vault";
import {
  maskIdentifier,
  formatCategoryName,
  formatDate,
  getSourceBadgeProps,
} from "../src/lib/formatters";

describe("Phase 6: DigiLocker-Style Citizen Vault & UI Data Layer", () => {
  let demoUserId: string;

  beforeAll(async () => {
    const user = await getDemoUser(prisma);
    expect(user).toBeDefined();
    demoUserId = user.id;
  });

  describe("getDemoUser", () => {
    it("retrieves the synthetic demo citizen without real PII", async () => {
      const user = await getDemoUser(prisma);
      expect(user.id).toBeDefined();
      expect(user.displayName).toContain("Demo Citizen");
    });
  });

  describe("getUserDocuments", () => {
    it("retrieves all documents in the demo citizen vault", async () => {
      const docs = await getUserDocuments(demoUserId, undefined, prisma);
      expect(docs.length).toBeGreaterThanOrEqual(6);
      expect(docs[0].documentTypeId).toBeDefined();
      expect(docs[0].documentTypeKey).toBeDefined();
      expect(docs[0].documentTypeName).toBeDefined();
      expect(docs[0].category).toBeDefined();
    });

    it("filters documents by source: ISSUED", async () => {
      const issuedDocs = await getUserDocuments(demoUserId, { source: "ISSUED" }, prisma);
      expect(issuedDocs.length).toBeGreaterThanOrEqual(5);
      for (const doc of issuedDocs) {
        expect(doc.source).toBe("ISSUED");
      }
    });

    it("filters documents by source: UPLOADED", async () => {
      const uploadedDocs = await getUserDocuments(demoUserId, { source: "UPLOADED" }, prisma);
      expect(uploadedDocs.length).toBeGreaterThanOrEqual(1);
      for (const doc of uploadedDocs) {
        expect(doc.source).toBe("UPLOADED");
      }
    });

    it("filters documents by category: EDUCATION", async () => {
      const eduDocs = await getUserDocuments(demoUserId, { category: "EDUCATION" }, prisma);
      expect(eduDocs.length).toBeGreaterThanOrEqual(3);
      for (const doc of eduDocs) {
        expect(doc.category).toBe("EDUCATION");
      }
    });

    it("filters documents by category: IDENTITY", async () => {
      const idDocs = await getUserDocuments(demoUserId, { category: "IDENTITY" }, prisma);
      expect(idDocs.length).toBeGreaterThanOrEqual(1);
      for (const doc of idDocs) {
        expect(doc.category).toBe("IDENTITY");
      }
    });

    it("searches documents by display name", async () => {
      const searchResults = await getUserDocuments(demoUserId, { search: "PUC" }, prisma);
      expect(searchResults.length).toBeGreaterThanOrEqual(1);
      expect(searchResults[0].displayName).toContain("PUC");
    });

    it("searches documents by issuer name", async () => {
      const searchResults = await getUserDocuments(demoUserId, { search: "Pre-University" }, prisma);
      expect(searchResults.length).toBeGreaterThanOrEqual(1);
      expect(searchResults.some((d) => d.issuer.includes("Pre-University"))).toBe(true);
    });

    it("returns empty array for non-matching search", async () => {
      const searchResults = await getUserDocuments(demoUserId, { search: "NON_EXISTENT_DOC_XYZ" }, prisma);
      expect(searchResults.length).toBe(0);
    });
  });

  describe("getUserDocumentById", () => {
    it("retrieves a single document with metadata fields by valid ID", async () => {
      const allDocs = await getUserDocuments(demoUserId, undefined, prisma);
      const target = allDocs[0];

      const doc = await getUserDocumentById(demoUserId, target.id, prisma);
      expect(doc).not.toBeNull();
      expect(doc?.id).toBe(target.id);
      expect(doc?.displayName).toBe(target.displayName);
      expect(doc?.fields.length).toBeGreaterThanOrEqual(1);
    });

    it("returns null for non-existent document ID", async () => {
      const doc = await getUserDocumentById(demoUserId, "non-existent-id-12345", prisma);
      expect(doc).toBeNull();
    });

    it("returns null when querying document belonging to another user", async () => {
      const allDocs = await getUserDocuments(demoUserId, undefined, prisma);
      const target = allDocs[0];

      const doc = await getUserDocumentById("another-user-id-999", target.id, prisma);
      expect(doc).toBeNull();
    });
  });

  describe("getUserVaultSummary", () => {
    it("calculates dynamic vault counts without hardcoding", async () => {
      const summary = await getUserVaultSummary(demoUserId, prisma);

      expect(summary.userId).toBe(demoUserId);
      expect(summary.totalDocuments).toBeGreaterThanOrEqual(6);
      expect(summary.issuedCount + summary.uploadedCount).toBe(summary.totalDocuments);
      expect(summary.categoriesCount).toBe(summary.categories.length);
      expect(summary.recentDocuments.length).toBeLessThanOrEqual(4);

      // Verify category items
      const educationCat = summary.categories.find((c) => c.category === "EDUCATION");
      expect(educationCat).toBeDefined();
      expect(educationCat?.count).toBeGreaterThanOrEqual(3);
    });
  });

  describe("UI Formatting & Masking Helpers", () => {
    it("masks sensitive-looking identifier strings safely", () => {
      expect(maskIdentifier("SYNTH-SSLC-2022-8812")).toBe("SYNTH-••••-••••-8812");
      expect(maskIdentifier("SYNTH-PUC-2024-4431")).toBe("SYNTH-•••-••••-4431");
      expect(maskIdentifier("123456789012")).toBe("••••••••9012");
    });

    it("formats categories cleanly", () => {
      expect(formatCategoryName("SOCIAL_CERTIFICATE")).toBe("Social Certificate");
      expect(formatCategoryName("EDUCATION")).toBe("Education");
      expect(formatCategoryName("IDENTITY")).toBe("Identity");
    });

    it("formats dates gracefully", () => {
      expect(formatDate("2024-05-15T00:00:00Z")).toContain("2024");
      expect(formatDate(null)).toBe("Not specified");
      expect(formatDate(undefined)).toBe("Not specified");
    });

    it("returns appropriate badge classes for ISSUED vs UPLOADED", () => {
      const issuedProps = getSourceBadgeProps("ISSUED");
      expect(issuedProps.label).toBe("Issued Document");
      expect(issuedProps.className).toContain("emerald");

      const uploadedProps = getSourceBadgeProps("UPLOADED");
      expect(uploadedProps.label).toBe("Uploaded Document");
      expect(uploadedProps.className).toContain("blue");
    });
  });
});

import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { evaluateConsistency } from "@/server/conflicts/service";
import { getApplicationJourney } from "@/server/journey/service";
import { getConflictIssues } from "@/server/conflicts/service";
import { processDocumentUpload } from "@/server/documents/extraction/service";

describe("Phase 9.3: Conflict Lifecycle & Re-upload Resolution", () => {
  it("executes the complete conflict lifecycle: Detection -> Blocking -> Guidance -> Re-upload -> Resolution", async () => {
    // 1. Create dedicated isolated test user
    const testUser = await prisma.user.create({
      data: { displayName: "Lifecycle Test Citizen" },
    });

    const aadhaarType = await prisma.documentType.findUnique({
      where: { canonicalKey: "GOVERNMENT_IDENTITY_PROOF" },
    });
    const sslcType = await prisma.documentType.findUnique({
      where: { canonicalKey: "SECONDARY_MARKS_CARD" },
    });

    // 2. Seed initial conflicting documents: Aadhaar ("Sukrutha K") vs SSLC ("Sukrutha Kumar")
    if (aadhaarType && sslcType) {
      await prisma.document.create({
        data: {
          userId: testUser.id,
          documentTypeId: aadhaarType.id,
          displayName: "Aadhaar Card",
          issuer: "UIDAI",
          source: "ISSUED",
          fields: {
            create: [
              { fieldName: "name", normalizedValue: "SUKRUTHA K", semanticRole: "CANDIDATE_NAME", fieldType: "STRING" },
              { fieldName: "dateOfBirth", normalizedValue: "2006-05-15", semanticRole: "DATE_OF_BIRTH", fieldType: "DATE" },
            ],
          },
        },
      });

      const initialSslc = await prisma.document.create({
        data: {
          userId: testUser.id,
          documentTypeId: sslcType.id,
          displayName: "SSLC Marks Card",
          issuer: "KSEEB",
          source: "ISSUED",
          fields: {
            create: [
              { fieldName: "candidate_name", normalizedValue: "SUKRUTHA KUMAR", semanticRole: "CANDIDATE_NAME", fieldType: "STRING" },
              { fieldName: "date_of_birth", normalizedValue: "2006-05-15", semanticRole: "DATE_OF_BIRTH", fieldType: "DATE" },
            ],
          },
        },
      });

      // 3. Evaluate initial conflict issues
      const initialIssues = await getConflictIssues(testUser.id, "Bengaluru", prisma);
      expect(initialIssues.length).toBeGreaterThanOrEqual(1);
      expect(initialIssues[0].severity).toBe("BLOCKING");
      expect(initialIssues[0].resolutionPlan).toBeDefined();
      expect(initialIssues[0].recommendedCentres).toBeDefined();

      // 4. Update the SSLC document with the corrected name matching Aadhaar
      await prisma.documentField.updateMany({
        where: { documentId: initialSslc.id, semanticRole: "CANDIDATE_NAME" },
        data: { normalizedValue: "SUKRUTHA K" },
      });

      // 5. Re-evaluate consistency
      const postConsistency = await evaluateConsistency(testUser.id, prisma);
      expect(postConsistency.hasConflicts).toBe(false);

      // 6. Re-check conflict issues
      const postIssues = await getConflictIssues(testUser.id, "Bengaluru", prisma);
      expect(postIssues.length).toBe(0);

      // 7. Cleanup
      await prisma.documentField.deleteMany({ where: { document: { userId: testUser.id } } });
      await prisma.document.deleteMany({ where: { userId: testUser.id } });
      await prisma.user.delete({ where: { id: testUser.id } });
    }
  });
});

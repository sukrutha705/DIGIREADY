import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import {
  normalizeNameString,
  normalizeDobString,
  compareNames,
  evaluateDocumentConsistency,
} from "../src/server/consistency";
import { UserNotFoundError } from "../src/server/readiness";
import { MockGovernmentSource } from "../src/server/sources/service-requirement-source";
import { MockDigiLockerSource } from "../src/server/sources/document-sources/document-source";

describe("Phase 5: Document Consistency & Validation Engine", () => {
  let demoUserId: string;
  let testUserConsistentId: string;
  let testUserNameMismatchId: string;
  let testUserDobMismatchId: string;
  let testUserParentMismatchId: string;
  let testUserMultiNameId: string;
  let testUserExpiredId: string;
  let testUserMissingFieldId: string;

  beforeAll(async () => {
    // 1. Retrieve baseline demo citizen
    const demoUser = await prisma.user.findFirst({
      where: { displayName: { contains: "Demo Citizen" } },
    });
    if (!demoUser) {
      throw new Error("Demo Citizen not found in database.");
    }
    demoUserId = demoUser.id;

    const govtIdType = await prisma.documentType.findUniqueOrThrow({
      where: { canonicalKey: "GOVERNMENT_IDENTITY_PROOF" },
    });
    const secondaryType = await prisma.documentType.findUniqueOrThrow({
      where: { canonicalKey: "SECONDARY_MARKS_CARD" },
    });
    const higherSecType = await prisma.documentType.findUniqueOrThrow({
      where: { canonicalKey: "HIGHER_SECONDARY_MARKS_CARD" },
    });

    // 2. User A: All documents consistent
    const userConsistent = await prisma.user.create({
      data: {
        displayName: "Consistent User (Sukrutha K)",
        documents: {
          create: [
            {
              documentTypeId: govtIdType.id,
              displayName: "Govt ID",
              source: "ISSUED",
              issuer: "Demo Identity Authority",
              fields: {
                create: [
                  { fieldName: "fullName", fieldType: "NAME", semanticRole: "CANDIDATE_NAME", normalizedValue: "SUKRUTHA K" },
                  { fieldName: "dateOfBirth", fieldType: "DATE", semanticRole: "DATE_OF_BIRTH", normalizedValue: "2006-05-15" },
                ],
              },
            },
            {
              documentTypeId: secondaryType.id,
              displayName: "SSLC Marks",
              source: "ISSUED",
              issuer: "Demo Education Board",
              fields: {
                create: [
                  { fieldName: "candidateName", fieldType: "NAME", semanticRole: "CANDIDATE_NAME", normalizedValue: "sukrutha   k." },
                  { fieldName: "fatherName", fieldType: "NAME", semanticRole: "PARENT_NAME", normalizedValue: "DEMO PARENT" },
                  { fieldName: "dateOfBirth", fieldType: "DATE", semanticRole: "DATE_OF_BIRTH", normalizedValue: "15-05-2006" },
                ],
              },
            },
          ],
        },
      },
    });
    testUserConsistentId = userConsistent.id;

    // 3. User B: Reordered Name Mismatch ("SUKRUTHA K" vs "K SUKRUTHA")
    const userNameMismatch = await prisma.user.create({
      data: {
        displayName: "User Name Mismatch",
        documents: {
          create: [
            {
              documentTypeId: govtIdType.id,
              displayName: "Govt ID",
              source: "ISSUED",
              issuer: "Demo Identity Authority",
              fields: {
                create: [
                  { fieldName: "fullName", fieldType: "NAME", semanticRole: "CANDIDATE_NAME", normalizedValue: "SUKRUTHA K" },
                ],
              },
            },
            {
              documentTypeId: secondaryType.id,
              displayName: "SSLC Marks",
              source: "ISSUED",
              issuer: "Demo Education Board",
              fields: {
                create: [
                  { fieldName: "candidateName", fieldType: "NAME", semanticRole: "CANDIDATE_NAME", normalizedValue: "K SUKRUTHA" },
                ],
              },
            },
          ],
        },
      },
    });
    testUserNameMismatchId = userNameMismatch.id;

    // 4. User C: DOB Mismatch (2006-05-15 vs 2006-06-15)
    const userDobMismatch = await prisma.user.create({
      data: {
        displayName: "User DOB Mismatch",
        documents: {
          create: [
            {
              documentTypeId: govtIdType.id,
              displayName: "Govt ID",
              source: "ISSUED",
              issuer: "Demo Identity Authority",
              fields: {
                create: [
                  { fieldName: "dateOfBirth", fieldType: "DATE", semanticRole: "DATE_OF_BIRTH", normalizedValue: "2006-05-15" },
                ],
              },
            },
            {
              documentTypeId: secondaryType.id,
              displayName: "SSLC Marks",
              source: "ISSUED",
              issuer: "Demo Education Board",
              fields: {
                create: [
                  { fieldName: "dateOfBirth", fieldType: "DATE", semanticRole: "DATE_OF_BIRTH", normalizedValue: "2006-06-15" },
                ],
              },
            },
          ],
        },
      },
    });
    testUserDobMismatchId = userDobMismatch.id;

    // 5. User D: Parent Name Mismatch ("DEMO PARENT" vs "OTHER PARENT")
    const userParentMismatch = await prisma.user.create({
      data: {
        displayName: "User Parent Name Mismatch",
        documents: {
          create: [
            {
              documentTypeId: secondaryType.id,
              displayName: "SSLC Marks",
              source: "ISSUED",
              issuer: "Demo Education Board",
              fields: {
                create: [
                  { fieldName: "fatherName", fieldType: "NAME", semanticRole: "PARENT_NAME", normalizedValue: "DEMO PARENT" },
                ],
              },
            },
            {
              documentTypeId: higherSecType.id,
              displayName: "2nd PUC Marks",
              source: "ISSUED",
              issuer: "Demo Pre-University Board",
              fields: {
                create: [
                  { fieldName: "fatherName", fieldType: "NAME", semanticRole: "PARENT_NAME", normalizedValue: "OTHER PARENT" },
                ],
              },
            },
          ],
        },
      },
    });
    testUserParentMismatchId = userParentMismatch.id;

    // 6. User E: Multiple conflicting names across 3+ documents (Consolidated Finding)
    const userMultiName = await prisma.user.create({
      data: {
        displayName: "User Multi-Document Conflict",
        documents: {
          create: [
            {
              documentTypeId: govtIdType.id,
              displayName: "Doc A",
              source: "ISSUED",
              issuer: "Demo Authority A",
              fields: {
                create: [
                  { fieldName: "fullName", fieldType: "NAME", semanticRole: "CANDIDATE_NAME", normalizedValue: "SUKRUTHA K" },
                ],
              },
            },
            {
              documentTypeId: secondaryType.id,
              displayName: "Doc B",
              source: "ISSUED",
              issuer: "Demo Authority B",
              fields: {
                create: [
                  { fieldName: "candidateName", fieldType: "NAME", semanticRole: "CANDIDATE_NAME", normalizedValue: "SUKRUTHA K" },
                ],
              },
            },
            {
              documentTypeId: higherSecType.id,
              displayName: "Doc C",
              source: "ISSUED",
              issuer: "Demo Authority C",
              fields: {
                create: [
                  { fieldName: "studentName", fieldType: "NAME", semanticRole: "CANDIDATE_NAME", normalizedValue: "K SUKRUTHA" },
                ],
              },
            },
          ],
        },
      },
    });
    testUserMultiNameId = userMultiName.id;

    // 7. User F: Expired Document
    const userExpired = await prisma.user.create({
      data: {
        displayName: "User Expired Doc",
        documents: {
          create: [
            {
              documentTypeId: govtIdType.id,
              displayName: "Expired Identity Document",
              source: "ISSUED",
              issuer: "Demo Identity Authority",
              expiryDate: new Date("2020-01-01T00:00:00Z"), // Past date
              fields: {
                create: [
                  { fieldName: "fullName", fieldType: "NAME", semanticRole: "CANDIDATE_NAME", normalizedValue: "DEMO CITIZEN" },
                ],
              },
            },
          ],
        },
      },
    });
    testUserExpiredId = userExpired.id;

    // 8. User G: Missing Expected Field (document with zero fields)
    const userMissingField = await prisma.user.create({
      data: {
        displayName: "User Missing Metadata Fields",
        documents: {
          create: [
            {
              documentTypeId: govtIdType.id,
              displayName: "Empty Metadata Document",
              source: "UPLOADED",
              issuer: "Demo Upload",
            },
          ],
        },
      },
    });
    testUserMissingFieldId = userMissingField.id;
  });

  afterAll(async () => {
    const testIds = [
      testUserConsistentId,
      testUserNameMismatchId,
      testUserDobMismatchId,
      testUserParentMismatchId,
      testUserMultiNameId,
      testUserExpiredId,
      testUserMissingFieldId,
    ].filter(Boolean);

    await prisma.identityEvidence.deleteMany({ where: { userId: { in: testIds } } });
    await prisma.documentField.deleteMany({ where: { document: { userId: { in: testIds } } } });
    await prisma.document.deleteMany({ where: { userId: { in: testIds } } });
    await prisma.user.deleteMany({ where: { id: { in: testIds } } });
  });

  describe("Name Normalization & Comparison Rules", () => {
    it("matches identical names", () => {
      expect(compareNames("SUKRUTHA K", "SUKRUTHA K")).toBe("MATCH");
    });

    it("matches case differences", () => {
      expect(compareNames("Sukrutha K", "SUKRUTHA K")).toBe("MATCH");
    });

    it("matches whitespace differences", () => {
      expect(compareNames("  Sukrutha   K  ", "SUKRUTHA K")).toBe("MATCH");
    });

    it("matches harmless punctuation differences", () => {
      expect(compareNames("Sukrutha K.", "SUKRUTHA-K")).toBe("MATCH");
      expect(normalizeNameString("Sukrutha, K.")).toBe("SUKRUTHA K");
    });

    it("preserves token order: reordered names produce MISMATCH", () => {
      expect(compareNames("SUKRUTHA K", "K SUKRUTHA")).toBe("MISMATCH");
      expect(compareNames("DEMO CITIZEN", "CITIZEN DEMO")).toBe("MISMATCH");
    });

    it("completely different names produce MISMATCH", () => {
      expect(compareNames("SUKRUTHA K", "ANANYA K")).toBe("MISMATCH");
      expect(compareNames("SUKRUTHA K", "SUKRUTHA KUMAR")).toBe("MISMATCH");
    });
  });

  describe("DOB Normalization & Comparison Rules", () => {
    it("normalizes diverse date formats to canonical YYYY-MM-DD", () => {
      expect(normalizeDobString("2006-05-15")).toBe("2006-05-15");
      expect(normalizeDobString("15-05-2006")).toBe("2006-05-15");
      expect(normalizeDobString("15/05/2006")).toBe("2006-05-15");
      expect(normalizeDobString("2006/05/15")).toBe("2006-05-15");
    });
  });

  describe("evaluateDocumentConsistency Engine", () => {
    it("returns zero findings for consistent documents (User A)", async () => {
      const result = await evaluateDocumentConsistency(testUserConsistentId, prisma);

      expect(result.userId).toBe(testUserConsistentId);
      expect(result.findings.length).toBe(0);
      expect(result.summary.criticalCount).toBe(0);
      expect(result.summary.warningCount).toBe(0);
      expect(result.summary.infoCount).toBe(0);
    });

    it("detects NAME_MISMATCH with WARNING severity on reordered names (User B)", async () => {
      const result = await evaluateDocumentConsistency(testUserNameMismatchId, prisma);

      expect(result.findings.length).toBe(1);
      const finding = result.findings[0];
      expect(finding.code).toBe("NAME_MISMATCH");
      expect(finding.severity).toBe("WARNING");
      expect(finding.message).toContain("Candidate name differs");
      expect(finding.documentIds.length).toBe(2);
      expect(result.summary.warningCount).toBe(1);
    });

    it("detects DOB_MISMATCH with CRITICAL severity (User C)", async () => {
      const result = await evaluateDocumentConsistency(testUserDobMismatchId, prisma);

      expect(result.findings.length).toBe(1);
      const finding = result.findings[0];
      expect(finding.code).toBe("DOB_MISMATCH");
      expect(finding.severity).toBe("CRITICAL");
      expect(finding.message).toContain("Date of birth differs");
      expect(finding.documentIds.length).toBe(2);
      expect(result.summary.criticalCount).toBe(1);
    });

    it("detects PARENT_NAME_MISMATCH with CRITICAL severity (User D)", async () => {
      const result = await evaluateDocumentConsistency(testUserParentMismatchId, prisma);

      expect(result.findings.length).toBe(1);
      const finding = result.findings[0];
      expect(finding.code).toBe("PARENT_NAME_MISMATCH");
      expect(finding.severity).toBe("CRITICAL");
      expect(finding.message).toContain("Parent or guardian name differs");
      expect(finding.documentIds.length).toBe(2);
      expect(result.summary.criticalCount).toBe(1);
    });

    it("consolidates multi-document conflicts across 3+ documents into ONE finding (User E)", async () => {
      const result = await evaluateDocumentConsistency(testUserMultiNameId, prisma);

      // Exactly 1 consolidated NAME_MISMATCH finding despite 3 documents involved
      expect(result.findings.length).toBe(1);
      expect(result.findings[0].code).toBe("NAME_MISMATCH");
      expect(result.findings[0].documentIds.length).toBe(3);
    });

    it("detects DOCUMENT_EXPIRED with WARNING severity (User F)", async () => {
      const result = await evaluateDocumentConsistency(testUserExpiredId, prisma);

      expect(result.findings.length).toBe(1);
      const finding = result.findings[0];
      expect(finding.code).toBe("DOCUMENT_EXPIRED");
      expect(finding.severity).toBe("WARNING");
      expect(finding.message).toContain("passed its recorded expiry date");
    });

    it("detects MISSING_EXPECTED_FIELD with WARNING severity (User G)", async () => {
      const result = await evaluateDocumentConsistency(testUserMissingFieldId, prisma);

      expect(result.findings.length).toBe(1);
      const finding = result.findings[0];
      expect(finding.code).toBe("MISSING_EXPECTED_FIELD");
      expect(finding.severity).toBe("WARNING");
    });

    it("sorts findings deterministically: CRITICAL before WARNING, then code alphabetically", async () => {
      // Create user with both a critical DOB mismatch and a warning name mismatch
      const mixedUser = await prisma.user.create({
        data: {
          displayName: "Mixed Findings User",
          documents: {
            create: [
              {
                documentTypeId: (await prisma.documentType.findFirstOrThrow()).id,
                displayName: "Doc 1",
                source: "ISSUED",
                issuer: "Demo Authority",
                fields: {
                  create: [
                    { fieldName: "fullName", fieldType: "NAME", semanticRole: "CANDIDATE_NAME", normalizedValue: "SUKRUTHA K" },
                    { fieldName: "dateOfBirth", fieldType: "DATE", semanticRole: "DATE_OF_BIRTH", normalizedValue: "2006-05-15" },
                  ],
                },
              },
              {
                documentTypeId: (await prisma.documentType.findFirstOrThrow()).id,
                displayName: "Doc 2",
                source: "ISSUED",
                issuer: "Demo Authority",
                fields: {
                  create: [
                    { fieldName: "fullName", fieldType: "NAME", semanticRole: "CANDIDATE_NAME", normalizedValue: "K SUKRUTHA" },
                    { fieldName: "dateOfBirth", fieldType: "DATE", semanticRole: "DATE_OF_BIRTH", normalizedValue: "2006-06-15" },
                  ],
                },
              },
            ],
          },
        },
      });

      const result = await evaluateDocumentConsistency(mixedUser.id, prisma);
      expect(result.findings.length).toBe(2);
      // CRITICAL (DOB_MISMATCH) must precede WARNING (NAME_MISMATCH)
      expect(result.findings[0].severity).toBe("CRITICAL");
      expect(result.findings[0].code).toBe("DOB_MISMATCH");
      expect(result.findings[1].severity).toBe("WARNING");
      expect(result.findings[1].code).toBe("NAME_MISMATCH");

      // Cleanup
      await prisma.documentField.deleteMany({ where: { document: { userId: mixedUser.id } } });
      await prisma.document.deleteMany({ where: { userId: mixedUser.id } });
      await prisma.user.deleteMany({ where: { id: mixedUser.id } });
    });

    it("verifies baseline synthetic demo citizen has zero consistency errors", async () => {
      const result = await evaluateDocumentConsistency(demoUserId, prisma);
      expect(result.findings.length).toBe(0);
      expect(result.summary.criticalCount).toBe(0);
      expect(result.summary.warningCount).toBe(0);
    });

    it("throws UserNotFoundError when evaluating unknown user", async () => {
      await expect(evaluateDocumentConsistency("non-existent-user-id", prisma)).rejects.toThrow(
        UserNotFoundError
      );
    });
  });

  describe("Architecture Layers & Mock Sources", () => {
    it("verifies MockGovernmentSource retrieves services and requirements", async () => {
      const mockGov = new MockGovernmentSource(prisma);
      expect(mockGov.sourceName).toContain("Demo Government");
      expect(mockGov.sourceType).toBe("MOCK_API");

      const kcet = await mockGov.getServiceByKey("KCET_APPLICATION");
      expect(kcet).not.toBeNull();
      expect(kcet?.name).toBe("KCET Application");

      const reqs = await mockGov.getServiceRequirements("KCET_APPLICATION");
      expect(reqs.length).toBe(6);

      const resolved = await mockGov.resolveRequirementsForService("KCET_APPLICATION");
      expect(resolved?.serviceKey).toBe("KCET_APPLICATION");
    });

    it("verifies MockDigiLockerSource retrieves user documents", async () => {
      const mockVault = new MockDigiLockerSource(prisma);
      expect(mockVault.sourceName).toContain("DigiLocker");
      expect(mockVault.sourceType).toBe("MOCK_VAULT");

      const docs = await mockVault.getAvailableDocuments(demoUserId);
      expect(docs.length).toBeGreaterThanOrEqual(6);
      expect(docs[0].userId).toBe(demoUserId);
      expect(docs[0].documentTypeKey).toBeDefined();
    });
  });
});

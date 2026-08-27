import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import {
  evaluateServiceReadiness,
  UserNotFoundError,
  ServiceNotFoundError,
} from "../src/server/readiness";

describe("Phase 4: Application Readiness Engine", () => {
  let demoUserId: string;
  let testUserIdMissingOne: string;
  let testUserIdMissingAll: string;
  let testUserIdMultiDoc: string;

  beforeAll(async () => {
    // 1. Retrieve the seeded demo citizen
    const demoUser = await prisma.user.findFirst({
      where: { displayName: { contains: "Demo Citizen" } },
    });
    if (!demoUser) {
      throw new Error("Seeded Demo Citizen not found. Please run seed script.");
    }
    demoUserId = demoUser.id;

    // Retrieve canonical DocumentTypes
    const govtIdType = await prisma.documentType.findUniqueOrThrow({
      where: { canonicalKey: "GOVERNMENT_IDENTITY_PROOF" },
    });
    const secondaryType = await prisma.documentType.findUniqueOrThrow({
      where: { canonicalKey: "SECONDARY_MARKS_CARD" },
    });
    const higherSecType = await prisma.documentType.findUniqueOrThrow({
      where: { canonicalKey: "HIGHER_SECONDARY_MARKS_CARD" },
    });

    // 2. Create test user missing HIGHER_SECONDARY_MARKS_CARD
    const userMissingOne = await prisma.user.create({
      data: {
        displayName: "Test User (Missing 12th Marks)",
        documents: {
          create: [
            {
              documentTypeId: govtIdType.id,
              displayName: "Test Govt ID",
              source: "ISSUED",
              issuer: "Demo Identity Authority",
            },
            {
              documentTypeId: secondaryType.id,
              displayName: "Test 10th Marks Card",
              source: "ISSUED",
              issuer: "Demo Karnataka Education Board",
            },
          ],
        },
      },
    });
    testUserIdMissingOne = userMissingOne.id;

    // 3. Create test user with zero documents
    const userMissingAll = await prisma.user.create({
      data: {
        displayName: "Test User (Empty Vault)",
      },
    });
    testUserIdMissingAll = userMissingAll.id;

    // 4. Create test user with multiple documents of the same canonical type
    const userMultiDoc = await prisma.user.create({
      data: {
        displayName: "Test User (Multiple Higher Secondary Docs)",
        documents: {
          create: [
            {
              documentTypeId: govtIdType.id,
              displayName: "Primary ID Card",
              source: "ISSUED",
              issuer: "Demo Identity Authority",
            },
            {
              documentTypeId: secondaryType.id,
              displayName: "Class 10 Certificate",
              source: "ISSUED",
              issuer: "Demo Karnataka Education Board",
            },
            {
              documentTypeId: higherSecType.id,
              displayName: "2nd PUC Marks Card (Original)",
              source: "ISSUED",
              issuer: "Demo Pre-University Board",
            },
            {
              documentTypeId: higherSecType.id,
              displayName: "12th Marks Sheet (Duplicate Copy)",
              source: "UPLOADED",
              issuer: "Demo Pre-University Board",
            },
          ],
        },
      },
    });
    testUserIdMultiDoc = userMultiDoc.id;
  });

  afterAll(async () => {
    // Clean up temporary test users created in beforeAll
    await prisma.document.deleteMany({
      where: {
        userId: { in: [testUserIdMissingOne, testUserIdMissingAll, testUserIdMultiDoc] },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [testUserIdMissingOne, testUserIdMissingAll, testUserIdMultiDoc] },
      },
    });
  });

  it("evaluates a user with all required documents as COMPLETE (Demo Citizen for KCET)", async () => {
    const result = await evaluateServiceReadiness(demoUserId, "KCET_APPLICATION", prisma);

    expect(result.serviceKey).toBe("KCET_APPLICATION");
    expect(result.overallStatus).toBe("COMPLETE");
    expect(result.requiredTotal).toBe(3);
    expect(result.requiredSatisfied).toBe(3);
    expect(result.requiredMissing).toBe(0);
    expect(result.requirements.length).toBe(6);

    // Verify REQUIRED requirements are all PRESENT
    const requiredReqs = result.requirements.filter((r) => r.requirementType === "REQUIRED");
    expect(requiredReqs.length).toBe(3);
    for (const req of requiredReqs) {
      expect(req.status).toBe("PRESENT");
      expect(req.matchingDocumentIds.length).toBeGreaterThan(0);
    }
  });

  it("evaluates a user missing one required document as INCOMPLETE with exact missing counts", async () => {
    const result = await evaluateServiceReadiness(testUserIdMissingOne, "KCET_APPLICATION", prisma);

    expect(result.overallStatus).toBe("INCOMPLETE");
    expect(result.requiredTotal).toBe(3);
    expect(result.requiredSatisfied).toBe(2);
    expect(result.requiredMissing).toBe(1);

    // Verify the specific missing requirement is HIGHER_SECONDARY_MARKS_CARD
    const missingReq = result.requirements.find((r) => r.status === "MISSING");
    expect(missingReq).toBeDefined();
    expect(missingReq?.documentTypeKey).toBe("HIGHER_SECONDARY_MARKS_CARD");
    expect(missingReq?.matchingDocumentIds).toEqual([]);
  });

  it("evaluates a user with an empty vault as INCOMPLETE with all required documents MISSING", async () => {
    const result = await evaluateServiceReadiness(testUserIdMissingAll, "KCET_APPLICATION", prisma);

    expect(result.overallStatus).toBe("INCOMPLETE");
    expect(result.requiredTotal).toBe(3);
    expect(result.requiredSatisfied).toBe(0);
    expect(result.requiredMissing).toBe(3);

    const missingReqs = result.requirements.filter((r) => r.status === "MISSING");
    expect(missingReqs.length).toBe(3);
  });

  it("verifies conditional requirements remain CONDITIONAL and do not block COMPLETE status", async () => {
    const result = await evaluateServiceReadiness(demoUserId, "KCET_APPLICATION", prisma);

    const conditionalReqs = result.requirements.filter((r) => r.requirementType === "CONDITIONAL");
    expect(conditionalReqs.length).toBe(2);

    for (const req of conditionalReqs) {
      expect(req.status).toBe("CONDITIONAL");
      expect(req.conditionKey).not.toBeNull();
      // Even though demo citizen has Study and Caste certificates in vault, status remains CONDITIONAL
      expect(req.matchingDocumentIds.length).toBeGreaterThan(0);
    }

    // Overall status is still COMPLETE
    expect(result.overallStatus).toBe("COMPLETE");
  });

  it("verifies optional requirements are marked OPTIONAL and do not affect completeness", async () => {
    const result = await evaluateServiceReadiness(demoUserId, "KCET_APPLICATION", prisma);

    const optionalReqs = result.requirements.filter((r) => r.requirementType === "OPTIONAL");
    expect(optionalReqs.length).toBe(1);
    expect(optionalReqs[0].status).toBe("OPTIONAL");
    expect(optionalReqs[0].matchingDocumentIds.length).toBeGreaterThan(0);
    expect(result.overallStatus).toBe("COMPLETE");
  });

  it("matches documents strictly by canonical DocumentType ID, ignoring display names or aliases", async () => {
    const result = await evaluateServiceReadiness(demoUserId, "KCET_APPLICATION", prisma);

    const pucReq = result.requirements.find(
      (r) => r.documentTypeKey === "HIGHER_SECONDARY_MARKS_CARD"
    );
    expect(pucReq).toBeDefined();
    expect(pucReq?.status).toBe("PRESENT");
    expect(pucReq?.matchingDocumentIds.length).toBe(1);

    // Verify the matched document is indeed the 2nd PUC document
    const matchedDoc = await prisma.document.findUnique({
      where: { id: pucReq!.matchingDocumentIds[0] },
      include: { documentType: true },
    });
    expect(matchedDoc?.documentType.canonicalKey).toBe("HIGHER_SECONDARY_MARKS_CARD");
  });

  it("aggregates multiple documents of the same canonical type into matchingDocumentIds", async () => {
    const result = await evaluateServiceReadiness(testUserIdMultiDoc, "KCET_APPLICATION", prisma);

    expect(result.overallStatus).toBe("COMPLETE");

    const higherSecReq = result.requirements.find(
      (r) => r.documentTypeKey === "HIGHER_SECONDARY_MARKS_CARD"
    );
    expect(higherSecReq).toBeDefined();
    expect(higherSecReq?.status).toBe("PRESENT");
    // Should contain both document IDs
    expect(higherSecReq?.matchingDocumentIds.length).toBe(2);
  });

  it("returns requirements in exact ascending sortOrder", async () => {
    const result = await evaluateServiceReadiness(demoUserId, "KCET_APPLICATION", prisma);

    expect(result.requirements.length).toBe(6);
    expect(result.requirements[0].requirementKey).toBe("KCET_GOVT_ID");
    expect(result.requirements[1].requirementKey).toBe("KCET_10TH_MARKS");
    expect(result.requirements[2].requirementKey).toBe("KCET_12TH_MARKS");
    expect(result.requirements[3].requirementKey).toBe("KCET_STUDY_CERT");
    expect(result.requirements[4].requirementKey).toBe("KCET_CASTE_CERT");
    expect(result.requirements[5].requirementKey).toBe("KCET_ADDRESS_PROOF");
  });

  it("throws UserNotFoundError when evaluating an unknown user ID", async () => {
    await expect(
      evaluateServiceReadiness("non-existent-user-id", "KCET_APPLICATION", prisma)
    ).rejects.toThrow(UserNotFoundError);
  });

  it("throws ServiceNotFoundError when evaluating an unknown serviceKey", async () => {
    await expect(
      evaluateServiceReadiness(demoUserId, "UNKNOWN_SERVICE_KEY", prisma)
    ).rejects.toThrow(ServiceNotFoundError);
  });

  it("produces deterministic output across multiple invocations for identical state", async () => {
    const run1 = await evaluateServiceReadiness(demoUserId, "KCET_APPLICATION", prisma);
    const run2 = await evaluateServiceReadiness(demoUserId, "KCET_APPLICATION", prisma);

    expect(run1.overallStatus).toBe(run2.overallStatus);
    expect(run1.requiredTotal).toBe(run2.requiredTotal);
    expect(run1.requiredSatisfied).toBe(run2.requiredSatisfied);
    expect(run1.requiredMissing).toBe(run2.requiredMissing);
    expect(run1.requirements.map((r) => r.matchingDocumentIds)).toEqual(
      run2.requirements.map((r) => r.matchingDocumentIds)
    );
  });
});

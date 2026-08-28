import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";
import { getUserDocuments } from "../src/server/vault";
import {
  processDocumentUpload,
  updateDocumentMetadata,
  getDocumentImageStream,
} from "../src/server/documents/extraction/service";
import { getApplicationJourney } from "../src/server/journey/service";
import { getVaultConsistencyAssessment } from "../src/server/consistency/service";
import {
  getVaultConflictGuidanceList,
  getConflictGuidanceForField,
} from "../src/server/conflicts/service";
import { generateConflictGuidance } from "../src/server/conflicts/guidance";
import { GOVERNMENT_AUTHORITIES } from "../src/server/authorities";
import { JourneyStatuses } from "../src/server/journey/types";
import { POST as classifyRoute } from "../src/app/api/assistant/classify/route";
import type { FieldConsistencyComparison } from "../src/server/consistency/types";

describe("Phase 8.2: Official Conflict Resolution Guidance & Government Correction Routing", () => {
  let testUserId: string;
  let aadhaarDocId: string;
  let sslcDocId: string;

  const validJpegBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01,
    0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xd9,
  ]);

  beforeAll(async () => {
    // Dedicated test citizen for isolated conflict testing
    const user = await prisma.user.create({
      data: { displayName: "Phase 8.2 Conflict Test Citizen" },
    });
    testUserId = user.id;

    const aadhaarType = await prisma.documentType.findUnique({
      where: { canonicalKey: "GOVERNMENT_IDENTITY_PROOF" },
    });
    const sslcType = await prisma.documentType.findUnique({
      where: { canonicalKey: "SECONDARY_MARKS_CARD" },
    });
    const pucType = await prisma.documentType.findUnique({
      where: { canonicalKey: "HIGHER_SECONDARY_MARKS_CARD" },
    });
    const incomeType = await prisma.documentType.findUnique({
      where: { canonicalKey: "INCOME_CERTIFICATE" },
    });

    // 1. Aadhaar: Sukrutha K
    if (aadhaarType) {
      const doc = await prisma.document.create({
        data: {
          userId: testUserId,
          documentTypeId: aadhaarType.id,
          displayName: "Aadhaar Card",
          issuer: "Demo UIDAI",
          source: "ISSUED",
          fields: {
            create: [
              { fieldName: "candidateName", normalizedValue: "SUKRUTHA K", semanticRole: "CANDIDATE_NAME", fieldType: "STRING" },
              { fieldName: "dateOfBirth", normalizedValue: "2006-05-15", semanticRole: "DATE_OF_BIRTH", fieldType: "DATE" },
            ],
          },
        },
      });
      aadhaarDocId = doc.id;
    }

    // 2. SSLC Marks Card: Sukrutha Kumar (Official discrepancy)
    if (sslcType) {
      const doc = await prisma.document.create({
        data: {
          userId: testUserId,
          documentTypeId: sslcType.id,
          displayName: "SSLC Marks Card",
          issuer: "Demo KSEEB",
          source: "ISSUED",
          fields: {
            create: [
              { fieldName: "candidateName", normalizedValue: "SUKRUTHA KUMAR", semanticRole: "CANDIDATE_NAME", fieldType: "STRING" },
              { fieldName: "dateOfBirth", normalizedValue: "2006-05-15", semanticRole: "DATE_OF_BIRTH", fieldType: "DATE" },
            ],
          },
        },
      });
      sslcDocId = doc.id;
    }

    // 3. 2nd PUC Marks Card: Sukrutha K
    if (pucType) {
      await prisma.document.create({
        data: {
          userId: testUserId,
          documentTypeId: pucType.id,
          displayName: "2nd PUC Marks Card",
          issuer: "Demo DPUE",
          source: "ISSUED",
          fields: {
            create: [
              { fieldName: "candidateName", normalizedValue: "SUKRUTHA K", semanticRole: "CANDIDATE_NAME", fieldType: "STRING" },
              { fieldName: "dateOfBirth", normalizedValue: "2006-05-15", semanticRole: "DATE_OF_BIRTH", fieldType: "DATE" },
            ],
          },
        },
      });
    }

    // 4. Income Certificate: Sukrutha K
    if (incomeType) {
      await prisma.document.create({
        data: {
          userId: testUserId,
          documentTypeId: incomeType.id,
          displayName: "Income Certificate",
          issuer: "Demo Revenue Department",
          source: "ISSUED",
          fields: {
            create: [
              { fieldName: "candidateName", normalizedValue: "SUKRUTHA K", semanticRole: "CANDIDATE_NAME", fieldType: "STRING" },
              { fieldName: "annualIncome", normalizedValue: "180000", semanticRole: "OTHER", fieldType: "NUMBER" },
            ],
          },
        },
      });
    }
  });

  afterAll(async () => {
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
  });

  describe("1. Conflict Detection & Official Status Assignment", () => {
    it("detects name mismatch between Aadhaar and SSLC and returns OFFICIAL_CORRECTION_REQUIRED", async () => {
      const consistency = await getVaultConsistencyAssessment(testUserId, prisma);
      expect(consistency.hasConflicts).toBe(true);
      expect(["OFFICIAL_CORRECTION_REQUIRED", "CONFLICT_DETECTED"]).toContain(consistency.overallStatus);
      expect(consistency.conflictCount).toBeGreaterThanOrEqual(1);

      const nameConflict = consistency.conflicts.find((c) => c.fieldKey === "name");
      expect(nameConflict).toBeDefined();
      expect(nameConflict?.status).toBe("POTENTIAL_MISMATCH");
    });

    it("attaches deterministic ConflictGuidance to the name conflict", async () => {
      const guidanceList = await getVaultConflictGuidanceList(testUserId, prisma);
      expect(guidanceList.length).toBeGreaterThanOrEqual(1);

      const nameGuidance = guidanceList.find((g) => g.fieldKey === "name");
      expect(nameGuidance).toBeDefined();
      expect(nameGuidance?.conflictType).toBe("NAME_MISMATCH");
      expect(nameGuidance?.title).toContain("Name Conflict");
      expect(nameGuidance?.recommendedAuthority.id).toBe("UIDAI");
      expect(nameGuidance?.numberedSteps.length).toBe(12);
    });

    it("does NOT conclude which document is legally wrong in guidance", async () => {
      const guidance = await getConflictGuidanceForField(testUserId, "name", prisma);
      expect(guidance).toBeDefined();
      // Must not say "Aadhaar is wrong" or "SSLC is wrong"
      expect(guidance?.explanation.toLowerCase()).not.toContain("aadhaar is wrong");
      expect(guidance?.explanation.toLowerCase()).not.toContain("sslc is wrong");
      expect(guidance?.explanation).toContain("contain different names");
    });
  });

  describe("2. Application Journey & Dashboard Integration", () => {
    it("blocks READY_TO_APPLY on KCET Journey while unresolved official conflict exists", async () => {
      const journey = await getApplicationJourney(testUserId, "KCET", prisma);
      expect(journey?.availableCount).toBe(4);
      expect(journey?.requiredCount).toBe(4);
      expect(journey?.missingCount).toBe(0);

      // Even with 4/4 documents available, conflict forces NEEDS_ATTENTION or READY_FOR_VERIFICATION, NOT READY_TO_APPLY
      expect([JourneyStatuses.NEEDS_ATTENTION, JourneyStatuses.READY_FOR_VERIFICATION]).toContain(journey?.status);
      expect(journey?.status).not.toBe(JourneyStatuses.READY_TO_APPLY);
    });
  });

  describe("3. Government Authority Registry & Integrity Guarantees", () => {
    it("verifies UIDAI authority details are factual and contain no fake URLs", () => {
      const uidai = GOVERNMENT_AUTHORITIES.UIDAI;
      expect(uidai.name).toContain("Unique Identification Authority of India");
      expect(uidai.officialUrl).toBe("https://myaadhaar.uidai.gov.in");
      expect(uidai.disclaimer).toContain("cannot alter official");
    });

    it("verifies State Education Board guidance routes via school principal / board office", () => {
      const board = GOVERNMENT_AUTHORITIES.STATE_EDUCATION_BOARD;
      expect(board.officialProcessNote).toContain("school/college principal");
    });

    it("does not fabricate nearest center calculation", () => {
      const uidai = GOVERNMENT_AUTHORITIES.UIDAI;
      expect(uidai.appointmentInfoNote).toContain("official UIDAI portal center locator");
    });
  });

  describe("4. Guidance Across Other Conflict Types", () => {
    it("generates DOB_MISMATCH guidance routing to primary birth authority", () => {
      const fakeComp: FieldConsistencyComparison = {
        fieldKey: "dateOfBirth",
        fieldLabel: "Date of Birth",
        status: "POTENTIAL_MISMATCH",
        entries: [
          {
            documentId: "doc-1",
            documentDisplayName: "Aadhaar Card",
            documentTypeKey: "GOVERNMENT_IDENTITY_PROOF",
            fieldName: "dateOfBirth",
            rawValue: "2005-06-15",
            normalizedValue: "2005-06-15",
          },
          {
            documentId: "doc-2",
            documentDisplayName: "SSLC Marks Card",
            documentTypeKey: "SECONDARY_MARKS_CARD",
            fieldName: "dateOfBirth",
            rawValue: "2005-07-20",
            normalizedValue: "2005-07-20",
          },
        ],
        distinctValues: ["2005-06-15", "2005-07-20"],
        explanation: "Date of birth differs",
        severity: "CRITICAL",
      };

      const guidance = generateConflictGuidance(fakeComp);
      expect(guidance.conflictType).toBe("DOB_MISMATCH");
      expect(guidance.numberedSteps.length).toBeGreaterThanOrEqual(3);
    });

    it("generates ADDRESS_MISMATCH guidance noting that address differences over time are common", () => {
      const fakeComp: FieldConsistencyComparison = {
        fieldKey: "address",
        fieldLabel: "Residential Address",
        status: "POTENTIAL_MISMATCH",
        entries: [
          {
            documentId: "doc-1",
            documentDisplayName: "Aadhaar Card",
            documentTypeKey: "GOVERNMENT_IDENTITY_PROOF",
            fieldName: "address",
            rawValue: "Bengaluru, Karnataka",
            normalizedValue: "BENGALURU KARNATAKA",
          },
          {
            documentId: "doc-2",
            documentDisplayName: "Study Certificate",
            documentTypeKey: "STUDY_CERTIFICATE",
            fieldName: "address",
            rawValue: "Mysuru, Karnataka",
            normalizedValue: "MYSURU KARNATAKA",
          },
        ],
        distinctValues: ["BENGALURU KARNATAKA", "MYSURU KARNATAKA"],
        explanation: "Address differs",
        severity: "WARNING",
      };

      const guidance = generateConflictGuidance(fakeComp);
      expect(guidance.conflictType).toBe("ADDRESS_MISMATCH");
      expect(guidance.explanation).toContain("different residential addresses");
    });
  });

  describe("5. Assistant Interaction for Discrepancy Inquiries", () => {
    it("explains discrepancy and states DigiReady cannot alter official records", async () => {
      const req = new NextRequest("http://localhost:3000/api/assistant/classify", {
        method: "POST",
        body: JSON.stringify({
          message: "My Aadhaar name is different from my marks card",
          userId: testUserId,
        }),
      });

      const res = await classifyRoute(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.friendlyResponse).toContain("DigiReady cannot change the information on either official document");
      expect(data.friendlyResponse.toLowerCase()).not.toContain("i have fixed it");
      expect(data.friendlyResponse.toLowerCase()).not.toContain("made the documents consistent");
    });
  });

  describe("6. Re-Upload Is the True Resolution Mechanism", () => {
    it("uploading a corrected SSLC document image resolves the discrepancy deterministically", async () => {
      // User uploads updated SSLC Marks Card where Name is "Sukrutha K"
      const uploadRes = await processDocumentUpload(
        validJpegBuffer,
        "sslc_marks_card_corrected.jpg",
        "image/jpeg",
        testUserId,
        {
          duplicateResolution: "replace_existing",
          existingDocumentIdToReplace: sslcDocId,
          documentTypeOverride: "SECONDARY_MARKS_CARD",
          metadataHints: { candidateName: "Sukrutha K" },
        },
        prisma
      );

      expect(uploadRes.success).toBe(true);

      // Now re-run consistency assessment
      const consistency = await getVaultConsistencyAssessment(testUserId, prisma);
      expect(consistency.hasConflicts).toBe(false);
      expect(consistency.overallStatus).toBe("CONSISTENT");

      // Application Journey now transitions toward READY_TO_APPLY
      const journey = await getApplicationJourney(testUserId, "KCET", prisma);
      expect([
        JourneyStatuses.READY_TO_APPLY,
        JourneyStatuses.READY_FOR_VERIFICATION,
      ]).toContain(journey?.status);
    });
  });
});

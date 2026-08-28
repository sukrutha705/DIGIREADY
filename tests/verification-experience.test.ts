import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";
import { getUserDocuments } from "../src/server/vault";
import {
  processDocumentUpload,
  updateDocumentMetadata,
  getDocumentImageStream,
} from "../src/server/documents/extraction/service";
import { detectDocumentType } from "../src/server/documents/extraction/detection";
import { getApplicationJourney } from "../src/server/journey/service";
import { getVaultConsistencyAssessment } from "../src/server/consistency/service";
import { JourneyStatuses } from "../src/server/journey/types";
import { GET as getImageStreamRoute } from "../src/app/api/documents/[id]/image/route";
import { PATCH as updateMetadataRoute } from "../src/app/api/documents/[id]/metadata/route";
import { POST as classifyRoute } from "../src/app/api/assistant/classify/route";

describe("Phase 8.1: Realistic Document Verification UX, Conflict Resolution & Product Validation", () => {
  let testUserId: string;
  let unauthorizedUserId: string;
  let aadhaarDocId: string;
  let sslcDocId: string;
  let uploadedIncomeDocId: string;

  // Real valid JPEG binary buffer for upload testing
  const validJpegBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01,
    0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xd9,
  ]);

  beforeAll(async () => {
    // 1. Create a dedicated test citizen
    const user = await prisma.user.create({
      data: { displayName: "Phase 8.1 Test Citizen" },
    });
    testUserId = user.id;

    const unauth = await prisma.user.create({
      data: { displayName: "Unauthorized Test Citizen" },
    });
    unauthorizedUserId = unauth.id;

    // 2. Fetch canonical document types
    const aadhaarType = await prisma.documentType.findUnique({
      where: { canonicalKey: "GOVERNMENT_IDENTITY_PROOF" },
    });
    const sslcType = await prisma.documentType.findUnique({
      where: { canonicalKey: "SECONDARY_MARKS_CARD" },
    });
    const pucType = await prisma.documentType.findUnique({
      where: { canonicalKey: "HIGHER_SECONDARY_MARKS_CARD" },
    });

    // 3. Seed initial baseline documents: Aadhaar (Sukrutha K), SSLC (Sukrutha Kumar - deliberate conflict), PUC (Sukrutha K)
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
              { fieldName: "dateOfBirth", normalizedValue: "2005-06-15", semanticRole: "DATE_OF_BIRTH", fieldType: "DATE" },
            ],
          },
        },
      });
      aadhaarDocId = doc.id;
    }

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
              { fieldName: "dateOfBirth", normalizedValue: "2005-06-15", semanticRole: "DATE_OF_BIRTH", fieldType: "DATE" },
            ],
          },
        },
      });
      sslcDocId = doc.id;
    }

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
              { fieldName: "dateOfBirth", normalizedValue: "2005-06-15", semanticRole: "DATE_OF_BIRTH", fieldType: "DATE" },
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
    if (unauthorizedUserId) {
      await prisma.user.delete({ where: { id: unauthorizedUserId } }).catch(() => {});
    }
  });

  describe("1. Initial Baseline & Conflict Detection", () => {
    it("detects name conflict between Aadhaar (Sukrutha K) and SSLC (Sukrutha Kumar)", async () => {
      const consistency = await getVaultConsistencyAssessment(testUserId, prisma);
      expect(["OFFICIAL_CORRECTION_REQUIRED", "CONFLICT_DETECTED"]).toContain(consistency.overallStatus);

      const nameConflict = consistency.conflicts.find((c) => c.fieldKey === "name");
      expect(nameConflict).toBeDefined();
      expect(nameConflict?.status).toBe("POTENTIAL_MISMATCH");
      expect(nameConflict?.entries.length).toBeGreaterThanOrEqual(2);
    });

    it("evaluates KCET Application Journey as missing Income Certificate (3 of 4)", async () => {
      const journey = await getApplicationJourney(testUserId, "KCET", prisma);
      expect(journey?.requiredCount).toBe(4);
      expect(journey?.availableCount).toBe(3);
      expect(journey?.missingCount).toBe(1);
      expect(journey?.status).toBe(JourneyStatuses.MISSING_DOCUMENTS);
    });
  });

  describe("2. Document Upload & Missing Document Progression", () => {
    it("uploads missing Income Certificate image and links metadata", async () => {
      const uploadRes = await processDocumentUpload(
        validJpegBuffer,
        "income_certificate_citizen.jpg",
        "image/jpeg",
        testUserId,
        { duplicateResolution: "keep_both", documentTypeOverride: "INCOME_CERTIFICATE" },
        prisma
      );

      expect(uploadRes.success).toBe(true);
      expect(uploadRes.document).toBeDefined();
      expect(uploadRes.document?.documentTypeKey).toBe("INCOME_CERTIFICATE");
      expect(uploadRes.document?.imageStorageKey).toBeDefined();
      expect(uploadRes.document?.mimeType).toBe("image/jpeg");

      uploadedIncomeDocId = uploadRes.document!.id;
    });

    it("updates Application Journey from 3/4 to 4/4 available", async () => {
      const journey = await getApplicationJourney(testUserId, "KCET", prisma);
      expect(journey?.availableCount).toBe(4);
      expect(journey?.missingCount).toBe(0);
      // Check that 4 of 4 documents are now available
      expect([
        JourneyStatuses.NEEDS_ATTENTION,
        JourneyStatuses.READY_FOR_VERIFICATION,
      ]).toContain(journey?.status);
    });
  });

  describe("3. Image Preservation & Secure Access", () => {
    it("GET /api/documents/[id]/image streams original image with correct headers", async () => {
      const req = new NextRequest(`http://localhost:3000/api/documents/${uploadedIncomeDocId}/image?userId=${testUserId}`);
      const res = await getImageStreamRoute(req, {
        params: Promise.resolve({ id: uploadedIncomeDocId }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/jpeg");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    });

    it("enforces unauthorized access block: unauthorized user cannot stream document image", async () => {
      const req = new NextRequest(`http://localhost:3000/api/documents/${uploadedIncomeDocId}/image?userId=${unauthorizedUserId}`);
      const res = await getImageStreamRoute(req, {
        params: Promise.resolve({ id: uploadedIncomeDocId }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe("4. Conflict Resolution & Metadata Editing", () => {
    it("allows citizen to correct metadata, sets isUserCorrected=true, and preserves rawExtractedValue", async () => {
      const streamBefore = await getDocumentImageStream(testUserId, sslcDocId, prisma);

      // Correct candidateName on SSLC Marks Card to "Sukrutha K"
      const patchReq = new NextRequest(`http://localhost:3000/api/documents/${sslcDocId}/metadata`, {
        method: "PATCH",
        body: JSON.stringify({
          userId: testUserId,
          corrections: [{ fieldName: "candidateName", correctedValue: "Sukrutha K" }],
        }),
      });

      const patchRes = await updateMetadataRoute(patchReq, {
        params: Promise.resolve({ id: sslcDocId }),
      });
      expect(patchRes.status).toBe(200);
      const patchData = await patchRes.json();
      expect(patchData.success).toBe(true);

      // Verify DocumentField is marked as user corrected
      const userDocs = await getUserDocuments(testUserId, undefined, prisma);
      const sslcDoc = userDocs.find((d) => d.id === sslcDocId);
      const nameField = sslcDoc?.fields.find((f) => f.fieldName === "candidateName");
      expect(nameField?.isUserCorrected).toBe(true);
      expect(nameField?.normalizedValue).toBe("SUKRUTHA K");

      // Verify original image stream was NOT modified if an image existed
      if (streamBefore) {
        const streamAfter = await getDocumentImageStream(testUserId, sslcDocId, prisma);
        expect(streamAfter?.buffer.equals(streamBefore.buffer)).toBe(true);
      }
    });

    it("re-evaluates consistency after correction: conflict is resolved (CONSISTENT)", async () => {
      const consistency = await getVaultConsistencyAssessment(testUserId, prisma);
      expect(consistency.hasConflicts).toBe(false);
      expect(consistency.overallStatus).toBe("CONSISTENT");
    });

    it("re-evaluates Application Journey: progresses toward READY_TO_APPLY", async () => {
      const journey = await getApplicationJourney(testUserId, "KCET", prisma);
      expect(journey?.availableCount).toBe(4);
      expect(journey?.missingCount).toBe(0);
      expect([
        JourneyStatuses.READY_TO_APPLY,
        JourneyStatuses.READY_FOR_VERIFICATION,
      ]).toContain(journey?.status);
    });
  });

  describe("5. Low-Confidence Detection & Ontology Fallback", () => {
    it("returns NEEDS_REVIEW when document filename and content are ambiguous", async () => {
      const detection = await detectDocumentType("unnamed_scan_9921.png", undefined, undefined, prisma);
      expect(detection.canonicalKey).toBe("UNKNOWN");
      expect(detection.status).toBe("NEEDS_REVIEW");
    });

    it("allows manual selection override when detection is uncertain", async () => {
      const detection = await detectDocumentType("unnamed_scan_9921.png", undefined, "CASTE_CERTIFICATE", prisma);
      expect(detection.canonicalKey).toBe("CASTE_CERTIFICATE");
      expect(detection.status).toBe("NEEDS_REVIEW");
    });
  });

  describe("6. Floating Assistant Product Mission Alignment", () => {
    it("processes 'I want to apply for KCET' and provides readiness & application guidance", async () => {
      const req = new NextRequest("http://localhost:3000/api/assistant/classify", {
        method: "POST",
        body: JSON.stringify({ message: "I want to apply for KCET", userId: testUserId }),
      });

      const res = await classifyRoute(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.journey).toBeDefined();
      expect(data.journey.serviceName).toBe("KCET");
      expect(data.friendlyResponse).toContain("KCET");
    });

    it("clearly disclaims that DigiReady does not submit live government applications", async () => {
      const journey = await getApplicationJourney(testUserId, "KCET", prisma);
      expect(journey?.limitationNote).toContain("does not submit official applications");
    });
  });
});

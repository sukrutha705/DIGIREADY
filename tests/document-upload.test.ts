import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";
import { getUserDocuments } from "../src/server/vault";
import {
  validateImageUpload,
  processDocumentUpload,
  updateDocumentMetadata,
  getDocumentImageStream,
} from "../src/server/documents/extraction/service";
import { detectDocumentType } from "../src/server/documents/extraction/detection";
import { extractFieldsForDocument } from "../src/server/documents/extraction/extractor";
import { getApplicationJourney } from "../src/server/journey/service";
import { JourneyStatuses } from "../src/server/journey/types";
import { GET as getImageStreamRoute } from "../src/app/api/documents/[id]/image/route";
import { PATCH as updateMetadataRoute } from "../src/app/api/documents/[id]/metadata/route";

describe("Phase 8: Document Image Upload, Extraction & Verification", () => {
  let uploadUserId: string;
  let isolatedUserId: string;

  // Real valid binary fixtures for tests
  const validJpegBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01,
    0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xd9,
  ]);

  const validPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
  ]);

  const validWebpBuffer = Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x18, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    0x56, 0x50, 0x38, 0x20, 0x0c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
  ]);

  const invalidPdfBuffer = Buffer.from("%PDF-1.4 Fake PDF Header Content");
  const invalidTextBuffer = Buffer.from("Hello world, this is a plain text file.");

  beforeAll(async () => {
    const uploadUser = await prisma.user.create({
      data: { displayName: "Upload Test Citizen" },
    });
    uploadUserId = uploadUser.id;

    const isolated = await prisma.user.create({
      data: { displayName: "Isolated Citizen Test User" },
    });
    isolatedUserId = isolated.id;

    // Create 3 baseline documents for KCET: Aadhaar, SSLC, PUC
    const aadhaarType = await prisma.documentType.findUnique({ where: { canonicalKey: "GOVERNMENT_IDENTITY_PROOF" } });
    const sslcType = await prisma.documentType.findUnique({ where: { canonicalKey: "SECONDARY_MARKS_CARD" } });
    const pucType = await prisma.documentType.findUnique({ where: { canonicalKey: "HIGHER_SECONDARY_MARKS_CARD" } });

    if (aadhaarType) {
      await prisma.document.create({
        data: {
          userId: uploadUserId,
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
    }

    if (sslcType) {
      await prisma.document.create({
        data: {
          userId: uploadUserId,
          documentTypeId: sslcType.id,
          displayName: "SSLC Marks Card",
          issuer: "Demo KSEEB",
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

    if (pucType) {
      await prisma.document.create({
        data: {
          userId: uploadUserId,
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
    if (uploadUserId) {
      await prisma.user.delete({ where: { id: uploadUserId } }).catch(() => {});
    }
    if (isolatedUserId) {
      await prisma.user.delete({ where: { id: isolatedUserId } }).catch(() => {});
    }
  });

  describe("1. Image Validation & Magic Byte Checking", () => {
    it("accepts valid JPEG image buffer with magic bytes", () => {
      const res = validateImageUpload(validJpegBuffer, "doc.jpg", "image/jpeg");
      expect(res.valid).toBe(true);
      expect(res.mimeType).toBe("image/jpeg");
    });

    it("accepts valid PNG image buffer with magic bytes", () => {
      const res = validateImageUpload(validPngBuffer, "doc.png", "image/png");
      expect(res.valid).toBe(true);
      expect(res.mimeType).toBe("image/png");
    });

    it("accepts valid WEBP image buffer with magic bytes", () => {
      const res = validateImageUpload(validWebpBuffer, "doc.webp", "image/webp");
      expect(res.valid).toBe(true);
      expect(res.mimeType).toBe("image/webp");
    });

    it("rejects non-image files such as PDF even with .jpg extension (magic-byte validation)", () => {
      const res = validateImageUpload(invalidPdfBuffer, "fake_doc.jpg", "image/jpeg");
      expect(res.valid).toBe(false);
      expect(res.error).toContain("Unsupported file format");
    });

    it("rejects plain text files", () => {
      const res = validateImageUpload(invalidTextBuffer, "notes.txt", "text/plain");
      expect(res.valid).toBe(false);
      expect(res.error).toContain("Unsupported file format");
    });

    it("rejects files exceeding 10MB size limit", () => {
      const oversizedBuffer = Buffer.alloc(10 * 1024 * 1024 + 1024); // 10MB + 1KB
      oversizedBuffer[0] = 0xff;
      oversizedBuffer[1] = 0xd8;
      oversizedBuffer[2] = 0xff;
      const res = validateImageUpload(oversizedBuffer, "huge.jpg", "image/jpeg");
      expect(res.valid).toBe(false);
      expect(res.error).toContain("10 MB limit");
    });
  });

  describe("2. Deterministic Document Type Detection", () => {
    it("detects Income Certificate from filename cues", async () => {
      const res = await detectDocumentType("income_certificate_2024.jpg", undefined, undefined, prisma);
      expect(res.canonicalKey).toBe("INCOME_CERTIFICATE");
      expect(res.confidence).toBeGreaterThanOrEqual(0.8);
      expect(res.status).toBe("SUCCESS");
    });

    it("detects SSLC 10th Marks Card from cues", async () => {
      const res = await detectDocumentType("my_sslc_marks_card.png", undefined, undefined, prisma);
      expect(res.canonicalKey).toBe("SECONDARY_MARKS_CARD");
      expect(res.status).toBe("SUCCESS");
    });

    it("detects 2nd PUC 12th Marks Card from cues", async () => {
      const res = await detectDocumentType("2nd_puc_marks_statement.webp", undefined, undefined, prisma);
      expect(res.canonicalKey).toBe("HIGHER_SECONDARY_MARKS_CARD");
      expect(res.status).toBe("SUCCESS");
    });

    it("honors explicit user documentTypeOverride", async () => {
      const res = await detectDocumentType("random_image.jpg", undefined, "CASTE_CERTIFICATE", prisma);
      expect(res.canonicalKey).toBe("CASTE_CERTIFICATE");
      expect(res.confidence).toBe(1.0);
    });

    it("returns NEEDS_REVIEW when document cannot be confidently identified", async () => {
      const res = await detectDocumentType("scan_123456789_unnamed.jpg", undefined, undefined, prisma);
      expect(res.canonicalKey).toBe("UNKNOWN");
      expect(res.status).toBe("NEEDS_REVIEW");
      expect(res.warnings.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("3. Schema-Specific Field Extraction", () => {
    it("extracts schema fields for Income Certificate", () => {
      const res = extractFieldsForDocument({
        canonicalKey: "INCOME_CERTIFICATE",
        displayName: "Income Certificate",
        fileName: "income.jpg",
      });

      expect(res.documentTypeKey).toBe("INCOME_CERTIFICATE");
      expect(res.fields.find((f) => f.fieldName === "applicantName")).toBeDefined();
      expect(res.fields.find((f) => f.fieldName === "annualIncome")).toBeDefined();
      expect(res.fields.find((f) => f.fieldName === "certificateRef")).toBeDefined();
    });

    it("extracts schema fields for 10th SSLC Marks Card", () => {
      const res = extractFieldsForDocument({
        canonicalKey: "SECONDARY_MARKS_CARD",
        displayName: "SSLC Marks Card",
        fileName: "sslc.png",
      });

      expect(res.fields.find((f) => f.fieldName === "candidateName")).toBeDefined();
      expect(res.fields.find((f) => f.fieldName === "fatherName")).toBeDefined();
      expect(res.fields.find((f) => f.fieldName === "dateOfBirth")).toBeDefined();
      expect(res.fields.find((f) => f.fieldName === "board")).toBeDefined();
      expect(res.fields.find((f) => f.fieldName === "registrationNumber")).toBeDefined();
    });
  });

  describe("4. End-to-End Image Upload, Storage & Readiness Integration", () => {
    let uploadedDocId: string;

    it("uploads an Income Certificate image, stores it securely, and links metadata", async () => {
      const journeyBefore = await getApplicationJourney(uploadUserId, "KCET", prisma);
      expect(journeyBefore?.availableCount).toBe(3);
      expect(journeyBefore?.missingCount).toBe(1);

      const result = await processDocumentUpload(
        validJpegBuffer,
        "income_certificate_demo.jpg",
        "image/jpeg",
        uploadUserId,
        { duplicateResolution: "keep_both" },
        prisma
      );

      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      expect(result.document?.documentTypeKey).toBe("INCOME_CERTIFICATE");
      expect(result.document?.imageStorageKey).toBeDefined();
      expect(result.document?.mimeType).toBe("image/jpeg");

      uploadedDocId = result.document!.id;

      // Check Application Journey was updated: Income Certificate is now available (4/4)!
      const journeyAfter = await getApplicationJourney(uploadUserId, "KCET", prisma);
      expect(journeyAfter?.availableCount).toBe(4);
      expect(journeyAfter?.missingCount).toBe(0);
      expect([
        JourneyStatuses.READY_TO_APPLY,
        JourneyStatuses.READY_FOR_VERIFICATION,
        JourneyStatuses.NEEDS_ATTENTION,
      ]).toContain(journeyAfter?.status);
    });

    it("GET /api/documents/[id]/image streams the original image buffer with proper headers", async () => {
      const req = new NextRequest(`http://localhost:3000/api/documents/${uploadedDocId}/image?userId=${uploadUserId}`);
      const res = await getImageStreamRoute(req, {
        params: Promise.resolve({ id: uploadedDocId }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/jpeg");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    });

    it("enforces cross-user isolation: isolated user cannot access demo user's image", async () => {
      const req = new NextRequest(`http://localhost:3000/api/documents/${uploadedDocId}/image?userId=${isolatedUserId}`);
      const res = await getImageStreamRoute(req, {
        params: Promise.resolve({ id: uploadedDocId }),
      });

      // Must return 404 because isolated user does not own the document
      expect(res.status).toBe(404);
    });

    it("allows citizen to correct metadata while preserving original image completely untouched", async () => {
      const streamBefore = await getDocumentImageStream(uploadUserId, uploadedDocId, prisma);
      expect(streamBefore).not.toBeNull();

      // Update metadata
      const patchReq = new NextRequest(`http://localhost:3000/api/documents/${uploadedDocId}/metadata`, {
        method: "PATCH",
        body: JSON.stringify({
          userId: uploadUserId,
          corrections: [
            { fieldName: "applicantName", correctedValue: "Sukrutha K" },
          ],
        }),
      });

      const patchRes = await updateMetadataRoute(patchReq, {
        params: Promise.resolve({ id: uploadedDocId }),
      });
      expect(patchRes.status).toBe(200);
      const patchData = await patchRes.json();
      expect(patchData.success).toBe(true);

      // Verify original image stream remains 100% identical byte-for-byte
      const streamAfter = await getDocumentImageStream(uploadUserId, uploadedDocId, prisma);
      expect(streamAfter?.buffer.equals(streamBefore!.buffer)).toBe(true);

      // Verify DocumentField is marked as user corrected
      const userDocs = await getUserDocuments(uploadUserId, undefined, prisma);
      const doc = userDocs.find((d) => d.id === uploadedDocId);
      const nameField = doc?.fields.find((f) => f.fieldName === "applicantName");
      expect(nameField?.isUserCorrected).toBe(true);
    });

    it("detects duplicates and supports replace_existing resolution", async () => {
      // Attempt upload without resolution option -> detects duplicate
      const dupCheck = await processDocumentUpload(
        validPngBuffer,
        "income_certificate_duplicate.png",
        "image/png",
        uploadUserId,
        {},
        prisma
      );

      expect(dupCheck.duplicateDetected).toBe(true);
      expect(dupCheck.existingDocument).toBeDefined();

      // Upload with replace_existing
      const replaceRes = await processDocumentUpload(
        validPngBuffer,
        "income_certificate_duplicate.png",
        "image/png",
        uploadUserId,
        { duplicateResolution: "replace_existing" },
        prisma
      );

      expect(replaceRes.success).toBe(true);
      expect(replaceRes.document?.id).toBeDefined();
    });
  });
});

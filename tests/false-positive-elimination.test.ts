import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import {
  validateImageUpload,
  processDocumentUpload,
} from "../src/server/documents/extraction/service";
import { detectDocumentType } from "../src/server/documents/extraction/detection";
import { extractFieldsForDocument } from "../src/server/documents/extraction/extractor";
import { inspectImageQuality } from "../src/server/documents/ocr/quality";

describe("Phase 11: Real Document Image Detection, OCR Extraction & False-Positive Elimination", () => {
  let testUserId: string;

  const validJpegBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01,
    0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xd9,
  ]);

  const validPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
  ]);

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { displayName: "False Positive Test User" },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
  });

  describe("1. Random / Blank / Unrelated Images Must NEVER Be Classified as Documents", () => {
    it("random image is NOT classified as Demo Identity Card", async () => {
      const res = await detectDocumentType("IMG_20240815_landscape.jpg", undefined, undefined, prisma);
      expect(res.canonicalKey).not.toContain("DEMO");
      expect(res.canonicalKey).not.toContain("IDENTITY");
      expect(res.displayName).not.toContain("Demo");
      expect(res.status).toBe("NEEDS_REVIEW");
      expect(res.canonicalKey).toBe("UNKNOWN");
    });

    it("blank image is NOT classified as a document", async () => {
      const res = await detectDocumentType("blank.png", "", undefined, prisma);
      expect(res.canonicalKey).toBe("UNKNOWN");
      expect(res.status).toBe("NEEDS_REVIEW");
    });

    it("random filename with no document keywords returns UNKNOWN", async () => {
      const res = await detectDocumentType("DSC_0001.jpg", "beautiful sunset over mountains", undefined, prisma);
      expect(res.canonicalKey).toBe("UNKNOWN");
      expect(res.status).toBe("NEEDS_REVIEW");
    });
  });

  describe("2. Random Images Do NOT Generate Fabricated Fields", () => {
    it("random image does NOT generate applicant name", () => {
      const res = extractFieldsForDocument({
        canonicalKey: "UNKNOWN",
        displayName: "Unidentified Document",
        fileName: "random_photo.jpg",
      });
      expect(res.status).toBe("NEEDS_REVIEW");
      const nameField = res.fields.find((f) => f.fieldName === "applicantName");
      expect(nameField).toBeUndefined();
    });

    it("random image does NOT generate DOB", () => {
      const res = extractFieldsForDocument({
        canonicalKey: "UNKNOWN",
        displayName: "Unidentified Document",
        fileName: "random_photo.jpg",
      });
      const dobField = res.fields.find((f) => f.fieldName === "dateOfBirth");
      expect(dobField).toBeUndefined();
    });

    it("random image does NOT generate salary/income", () => {
      const res = extractFieldsForDocument({
        canonicalKey: "UNKNOWN",
        displayName: "Unidentified Document",
        fileName: "random_photo.jpg",
      });
      const incomeField = res.fields.find((f) => f.fieldName === "annualIncome");
      expect(incomeField).toBeUndefined();
    });

    it("random image does NOT generate certificate number", () => {
      const res = extractFieldsForDocument({
        canonicalKey: "UNKNOWN",
        displayName: "Unidentified Document",
        fileName: "random_photo.jpg",
      });
      const certField = res.fields.find((f) => f.fieldName === "certificateRef");
      expect(certField).toBeUndefined();
    });
  });

  describe("3. NEEDS_REVIEW and Confidence Behavior", () => {
    it("unknown image returns NEEDS_REVIEW extraction status", () => {
      const res = extractFieldsForDocument({
        canonicalKey: "UNKNOWN",
        displayName: "Unidentified Document",
        fileName: "random.jpg",
      });
      expect(res.status).toBe("NEEDS_REVIEW");
      expect(res.confidence).toBe(0.0);
    });

    it("identified document type without OCR text returns NEEDS_REVIEW", () => {
      const res = extractFieldsForDocument({
        canonicalKey: "GOVERNMENT_IDENTITY_PROOF",
        displayName: "Government Identity Proof",
        fileName: "aadhaar.jpg",
        // No rawText = no OCR evidence
      });
      // Fields exist but are UNCONFIRMED, overall status NEEDS_REVIEW
      expect(res.status).toBe("NEEDS_REVIEW");
      const nameField = res.fields.find((f) => f.fieldName === "fullName");
      expect(nameField?.value).toBe(""); // No fabricated name
      expect(nameField?.status).toBe("UNCONFIRMED");
    });

    it("fields are extracted ONLY from actual OCR evidence", () => {
      const ocrText = "Unique Identification Authority of India\nName: Priya Sharma\nDOB: 15/06/1995\nGender: Female\nAddress: 42 MG Road, Bengaluru";
      const res = extractFieldsForDocument({
        canonicalKey: "GOVERNMENT_IDENTITY_PROOF",
        displayName: "Government Identity Proof",
        fileName: "aadhaar.jpg",
        rawText: ocrText,
      });
      expect(res.status).toBe("SUCCESS");
      const nameField = res.fields.find((f) => f.fieldName === "fullName");
      expect(nameField?.status).toBe("FOUND");
      expect(nameField?.value).toBe("Priya Sharma");
      expect(nameField?.confidence).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe("4. Manual Document Selection Does NOT Fabricate Fields", () => {
    it("manual selection without OCR evidence still results in UNCONFIRMED fields", () => {
      const res = extractFieldsForDocument({
        canonicalKey: "INCOME_CERTIFICATE",
        displayName: "Income Certificate",
        fileName: "random_photo.jpg",
        // Manual override = type is known, but no OCR evidence
      });
      expect(res.documentTypeKey).toBe("INCOME_CERTIFICATE");
      const nameField = res.fields.find((f) => f.fieldName === "applicantName");
      expect(nameField?.value).toBe(""); // No fabricated name
      const incomeField = res.fields.find((f) => f.fieldName === "annualIncome");
      expect(incomeField?.value).toBe(""); // No fabricated income
    });
  });

  describe("5. Image Quality Inspection", () => {
    it("detects empty buffer as unreadable", () => {
      const res = inspectImageQuality(Buffer.alloc(0), "image/jpeg");
      expect(res.status).toBe("IMAGE_UNREADABLE");
      expect(res.isValid).toBe(false);
    });

    it("detects extremely small file as low quality", () => {
      const tinyBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
      const res = inspectImageQuality(tinyBuffer, "image/jpeg");
      expect(res.status).toBe("IMAGE_LOW_QUALITY");
      expect(res.isValid).toBe(false);
    });

    it("accepts normal JPEG buffer as valid", () => {
      // Create a buffer with enough varied bytes
      const normalBuffer = Buffer.alloc(5000);
      normalBuffer[0] = 0xff;
      normalBuffer[1] = 0xd8;
      normalBuffer[2] = 0xff;
      for (let i = 3; i < normalBuffer.length; i++) {
        normalBuffer[i] = (i * 37 + 17) % 256;
      }
      const res = inspectImageQuality(normalBuffer, "image/jpeg");
      expect(res.isValid).toBe(true);
    });
  });

  describe("6. Evidence-Based Document Detection", () => {
    it("requires multiple evidence cues for Aadhaar classification", async () => {
      // Single weak keyword should NOT classify
      const weak = await detectDocumentType("doc.jpg", "Name", undefined, prisma);
      expect(weak.canonicalKey).toBe("UNKNOWN");
    });

    it("classifies correctly with strong Aadhaar evidence", async () => {
      const strong = await detectDocumentType(
        "doc.jpg",
        "Unique Identification Authority of India\nAadhaar\n1234 5678 9012\nName: Test\nDOB: 01/01/2000\nAddress: 123 Street",
        undefined,
        prisma
      );
      expect(strong.canonicalKey).toBe("GOVERNMENT_IDENTITY_PROOF");
      expect(strong.status).toBe("SUCCESS");
    });

    it("classifies Income Certificate with textual evidence", async () => {
      const res = await detectDocumentType(
        "doc.jpg",
        "Income Certificate\nAnnual Income: Rs. 250000\nApplicant: Suresh\nTahsildar\nRevenue Department",
        undefined,
        prisma
      );
      expect(res.canonicalKey).toBe("INCOME_CERTIFICATE");
      expect(res.status).toBe("SUCCESS");
    });

    it("classifies SSLC marks card with textual evidence", async () => {
      const res = await detectDocumentType(
        "doc.jpg",
        "SSLC Marks Card\nKarnataka Secondary Education Examination Board\nCandidate Name: Test\nRegistration No: SSLC-2022-1234",
        undefined,
        prisma
      );
      expect(res.canonicalKey).toBe("SECONDARY_MARKS_CARD");
      expect(res.status).toBe("SUCCESS");
    });

    it("empty OCR text returns UNKNOWN", async () => {
      const res = await detectDocumentType("photo.jpg", "", undefined, prisma);
      expect(res.canonicalKey).toBe("UNKNOWN");
      expect(res.status).toBe("NEEDS_REVIEW");
    });
  });

  describe("7. Original Image Preservation", () => {
    it("original image buffer remains byte-for-byte unchanged after upload processing", async () => {
      const originalCopy = Buffer.from(validJpegBuffer);
      await processDocumentUpload(
        validJpegBuffer,
        "income_cert_test.jpg",
        "image/jpeg",
        testUserId,
        { duplicateResolution: "keep_both" },
        prisma
      );
      expect(validJpegBuffer.equals(originalCopy)).toBe(true);
    });
  });

  describe("8. Demo Seed Data Isolation", () => {
    it("demo seed records use ISSUED source, not UPLOADED", async () => {
      const issuedDocs = await prisma.document.findMany({
        where: { source: "ISSUED" },
      });
      // Seed documents should exist
      expect(issuedDocs.length).toBeGreaterThanOrEqual(1);
      // All seed documents should have proper issuer names, not OCR-derived
      for (const doc of issuedDocs) {
        expect(doc.issuer).toBeTruthy();
      }
    });

    it("uploaded documents use UPLOADED source", async () => {
      const uploadedDocs = await prisma.document.findMany({
        where: { source: "UPLOADED", userId: testUserId },
      });
      for (const doc of uploadedDocs) {
        expect(doc.source).toBe("UPLOADED");
        expect(doc.imageStorageKey).toBeTruthy();
      }
    });
  });

  describe("9. Successful Extraction Requires Real Evidence", () => {
    it("extraction with genuine OCR text achieves SUCCESS status", () => {
      const res = extractFieldsForDocument({
        canonicalKey: "INCOME_CERTIFICATE",
        displayName: "Income Certificate",
        fileName: "income.jpg",
        rawText: "Income Certificate\nApplicant Name: Ramesh Kumar\nFather Name: Suresh Kumar\nAnnual Income: Rs. 350000",
      });
      expect(res.status).toBe("SUCCESS");
      expect(res.confidence).toBeGreaterThan(0);
      const nameField = res.fields.find((f) => f.fieldName === "applicantName");
      expect(nameField?.value).toBe("Ramesh Kumar");
      expect(nameField?.status).toBe("FOUND");
    });

    it("extraction without OCR does NOT produce SUCCESS for document types", () => {
      const res = extractFieldsForDocument({
        canonicalKey: "INCOME_CERTIFICATE",
        displayName: "Income Certificate",
        fileName: "income.jpg",
      });
      expect(res.status).toBe("NEEDS_REVIEW");
    });
  });

  describe("10. No Forbidden Phrases in Extraction", () => {
    it("never generates 'Demo Identity Card' document type", async () => {
      const res = await detectDocumentType("photo.jpg", "random text about nothing", undefined, prisma);
      expect(res.displayName).not.toContain("Demo");
      expect(res.canonicalKey).not.toContain("DEMO");
    });

    it("UNKNOWN extraction does not claim extraction succeeded", () => {
      const res = extractFieldsForDocument({
        canonicalKey: "UNKNOWN",
        displayName: "Unidentified Document",
        fileName: "mystery.jpg",
      });
      expect(res.status).not.toBe("SUCCESS");
    });
  });
});

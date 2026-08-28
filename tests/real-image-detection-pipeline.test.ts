import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import {
  processDocumentUpload,
  validateImageUpload,
  getDocumentImageStream,
} from "../src/server/documents/extraction/service";
import { detectDocumentType } from "../src/server/documents/extraction/detection";
import { extractFieldsForDocument } from "../src/server/documents/extraction/extractor";
import { verifyDocument } from "../src/server/verification/verifier";
import { setOCRProvider, LocalTesseractOCRProvider } from "../src/server/documents/ocr/provider";

describe("Phase 13: Real Image Document Detection & Truthful Extraction Pipeline", () => {
  let testUserId: string;

  const validJpegBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01,
    0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xd9,
  ]);

  /** Helper to create buffer with JPEG markers and varied byte content */
  function createJpegBuffer(sizeKb = 4): Buffer {
    const buf = Buffer.alloc(sizeKb * 1024);
    buf[0] = 0xff;
    buf[1] = 0xd8;
    buf[2] = 0xff;
    for (let i = 3; i < buf.length - 2; i++) {
      buf[i] = (i * 31 + 13) % 254;
    }
    buf[buf.length - 2] = 0xff;
    buf[buf.length - 1] = 0xd9;
    return buf;
  }

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { displayName: "Real Pipeline Test User" },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    setOCRProvider(new LocalTesseractOCRProvider());
  });

  describe("1. Random / Unrelated Image Upload Protection", () => {
    it("random landscape photograph is NOT classified as any document type", async () => {
      const ocrMock = {
        async extractText() {
          return {
            text: "Blue sky, mountain view, beautiful sunset with clouds and trees.",
            confidence: 0.8,
            lines: ["Blue sky, mountain view, beautiful sunset with clouds and trees."],
            warnings: [],
          };
        },
      };
      setOCRProvider(ocrMock as any);

      const buf = createJpegBuffer(8);
      const res = await processDocumentUpload(
        buf,
        "sunset_trip_photo.jpg",
        "image/jpeg",
        testUserId,
        { duplicateResolution: "keep_both" },
        prisma
      );

      expect(res.success).toBe(true);
      expect(res.document?.documentTypeKey).toBe("UNKNOWN");
      expect(res.document?.displayName).toBe("Unidentified Document");
      expect(res.document?.extractionStatus).toBe("NEEDS_REVIEW");
      expect(res.document?.extractionConfidence).toBe(0);

      // Verify NO fabricated fields exist
      const fields = res.document?.fields || [];
      expect(fields.length).toBe(0);
    });

    it("casual text with 'Name: John, Salary: 50000' is NOT classified as an Income Certificate", async () => {
      const ocrMock = {
        async extractText() {
          return {
            text: "Employee Note\nName: John Doe\nDesignation: Engineer\nSalary: 50000\nDepartment: IT",
            confidence: 0.85,
            lines: ["Employee Note", "Name: John Doe", "Designation: Engineer", "Salary: 50000", "Department: IT"],
            warnings: [],
          };
        },
      };
      setOCRProvider(ocrMock as any);

      const buf = createJpegBuffer(8);
      const detection = await detectDocumentType("work_note.jpg", "Employee Note\nName: John Doe\nSalary: 50000", undefined, prisma);
      expect(detection.canonicalKey).toBe("UNKNOWN");
      expect(detection.status).toBe("NEEDS_REVIEW");

      const res = await processDocumentUpload(
        buf,
        "work_note.jpg",
        "image/jpeg",
        testUserId,
        { duplicateResolution: "keep_both" },
        prisma
      );

      expect(res.document?.documentTypeKey).toBe("UNKNOWN");
      expect(res.document?.extractionStatus).toBe("NEEDS_REVIEW");
    });

    it("filename containing 'income_certificate.jpg' alone does NOT classify a non-document image", async () => {
      const ocrMock = {
        async extractText() {
          return {
            text: "Just a random selfie in a room with no document text.",
            confidence: 0.7,
            lines: ["Just a random selfie in a room with no document text."],
            warnings: [],
          };
        },
      };
      setOCRProvider(ocrMock as any);

      const detection = await detectDocumentType("income_certificate_scan.jpg", "Just a random selfie with no document text.", undefined, prisma);
      expect(detection.canonicalKey).toBe("UNKNOWN");
      expect(detection.status).toBe("NEEDS_REVIEW");
    });
  });

  describe("2. Genuine Document Detection & Evidence-Based Field Extraction", () => {
    it("genuine Income Certificate is detected and extracts real fields", async () => {
      const incomeOcr =
        "Government of Karnataka\nDepartment of Revenue\nINCOME CERTIFICATE\nCertificate No: RD0012345678\nApplicant Name: Sukrutha K\nFather Name: Kumar K\nAnnual Family Income: Rs. 150000\nValid For: 5 Years\nTahsildar, Bengaluru South";

      const ocrMock = {
        async extractText() {
          return {
            text: incomeOcr,
            confidence: 0.92,
            lines: incomeOcr.split("\n"),
            warnings: [],
          };
        },
      };
      setOCRProvider(ocrMock as any);

      const detection = await detectDocumentType("doc_scan.jpg", incomeOcr, undefined, prisma);
      expect(detection.canonicalKey).toBe("INCOME_CERTIFICATE");
      expect(detection.status).toBe("SUCCESS");

      const buf = createJpegBuffer(8);
      const res = await processDocumentUpload(
        buf,
        "my_document.jpg",
        "image/jpeg",
        testUserId,
        { duplicateResolution: "keep_both" },
        prisma
      );

      expect(res.document?.documentTypeKey).toBe("INCOME_CERTIFICATE");
      expect(res.document?.extractionStatus).toBe("SUCCESS");

      const nameField = res.document?.fields.find((f) => f.fieldName === "applicantName");
      expect(nameField?.status).toBe("FOUND");
      expect(nameField?.value).toBe("Sukrutha K");

      const incomeField = res.document?.fields.find((f) => f.fieldName === "annualIncome");
      expect(incomeField?.status).toBe("FOUND");
      expect(incomeField?.value).toBe("₹ 1,50,000");

      const certField = res.document?.fields.find((f) => f.fieldName === "certificateRef");
      expect(certField?.status).toBe("FOUND");
      expect(certField?.value).toBe("RD0012345678");
    });

    it("genuine 10th SSLC Marks Card is detected and extracts real fields", async () => {
      const sslcOcr =
        "Karnataka Secondary Education Examination Board\nSECONDARY SCHOOL LEAVING CERTIFICATE\nSSLC EXAMINATION MARKS CARD\nCandidate Name: Sukrutha K\nFather Name: Kumar K\nDate of Birth: 15/06/2006\nRegistration No: 202208812\nSchool: National High School\nGrand Total: 580";

      const detection = await detectDocumentType("marks.png", sslcOcr, undefined, prisma);
      expect(detection.canonicalKey).toBe("SECONDARY_MARKS_CARD");
      expect(detection.status).toBe("SUCCESS");

      const extraction = extractFieldsForDocument({
        canonicalKey: "SECONDARY_MARKS_CARD",
        displayName: "10th / Secondary Marks Card",
        fileName: "marks.png",
        rawText: sslcOcr,
      });

      expect(extraction.status).toBe("SUCCESS");
      expect(extraction.fields.find((f) => f.fieldName === "candidateName")?.value).toBe("Sukrutha K");
      expect(extraction.fields.find((f) => f.fieldName === "fatherName")?.value).toBe("Kumar K");
      expect(extraction.fields.find((f) => f.fieldName === "dateOfBirth")?.value).toBe("15/06/2006");
      expect(extraction.fields.find((f) => f.fieldName === "registrationNumber")?.value).toBe("202208812");
    });

    it("missing fields on genuine document are marked UNCONFIRMED with empty value", () => {
      // Income certificate where certificate number is obscured
      const partialOcr = "Department of Revenue\nINCOME CERTIFICATE\nApplicant Name: Rahul Sharma\nAnnual Family Income: Rs. 200000\nTahsildar";

      const extraction = extractFieldsForDocument({
        canonicalKey: "INCOME_CERTIFICATE",
        displayName: "Income Certificate",
        fileName: "doc.jpg",
        rawText: partialOcr,
      });

      const nameField = extraction.fields.find((f) => f.fieldName === "applicantName");
      expect(nameField?.status).toBe("FOUND");
      expect(nameField?.value).toBe("Rahul Sharma");

      const fatherField = extraction.fields.find((f) => f.fieldName === "fatherName");
      expect(fatherField?.status).toBe("UNCONFIRMED");
      expect(fatherField?.value).toBe(""); // Never fabricated!
    });
  });

  describe("3. Manual Document Type Selection Behavior", () => {
    it("manual selection of Income Certificate without OCR evidence results in NEEDS_REVIEW and unconfirmed fields", async () => {
      const res = await detectDocumentType("blank_image.jpg", "", "INCOME_CERTIFICATE", prisma);
      expect(res.canonicalKey).toBe("INCOME_CERTIFICATE");
      expect(res.status).toBe("NEEDS_REVIEW");
      expect(res.confidence).toBeLessThan(0.5);

      const extraction = extractFieldsForDocument({
        canonicalKey: "INCOME_CERTIFICATE",
        displayName: "Income Certificate",
        fileName: "blank_image.jpg",
        rawText: "", // Zero OCR text
      });

      expect(extraction.status).toBe("NEEDS_REVIEW");
      const nameField = extraction.fields.find((f) => f.fieldName === "applicantName");
      expect(nameField?.status).toBe("UNCONFIRMED");
      expect(nameField?.value).toBe(""); // NEVER fabricated!

      const incomeField = extraction.fields.find((f) => f.fieldName === "annualIncome");
      expect(incomeField?.status).toBe("UNCONFIRMED");
      expect(incomeField?.value).toBe("");
    });
  });

  describe("4. Verification & Readiness Impact", () => {
    it("UNKNOWN document fails verification and does NOT mark ready for review", async () => {
      const unkDoc = await prisma.document.create({
        data: {
          userId: testUserId,
          documentTypeId: (await prisma.documentType.findUnique({ where: { canonicalKey: "UNKNOWN" } }))!.id,
          displayName: "Unidentified Document",
          source: "UPLOADED",
          issuer: "Unknown Authority",
          extractionStatus: "NEEDS_REVIEW",
          extractionConfidence: 0,
        },
      });

      const verification = await verifyDocument(testUserId, unkDoc.id, prisma);
      expect(["UNSUPPORTED_DOCUMENT", "NEEDS_REVIEW"]).toContain(verification.status);
      expect(verification.status).not.toBe("READY_FOR_REVIEW");

      await prisma.document.delete({ where: { id: unkDoc.id } });
    });
  });
});

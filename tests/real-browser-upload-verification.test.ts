import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { prisma } from "../src/lib/prisma";
import { processDocumentUpload } from "../src/server/documents/extraction/service";
import { getOCRProvider, _getWorkerForTest } from "../src/server/documents/ocr/provider";

describe("Phase 14: Real Image OCR Performance & Browser Flow Verification", () => {
  let testUserId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { displayName: "Performance Measurement User" },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
  });

  it("measures cold vs warm OCR performance on genuine document image", async () => {
    const docPath = path.join(process.cwd(), "test_income_cert.png");
    const docBuffer = fs.readFileSync(docPath);

    // 1. First (Cold) upload: worker initializes and processes image
    const tColdStart = Date.now();
    const coldResult = await processDocumentUpload(
      docBuffer,
      "income_certificate_scan.png",
      "image/png",
      testUserId,
      { duplicateResolution: "keep_both" },
      prisma
    );
    const coldDuration = Date.now() - tColdStart;

    console.info(`[MEASUREMENT] Cold upload duration: ${coldDuration} ms`);

    expect(coldResult.success).toBe(true);
    expect(coldResult.document?.documentTypeKey).toBe("INCOME_CERTIFICATE");
    expect(coldResult.document?.extractionStatus).toBe("SUCCESS");
    expect(coldResult.document?.fields.find((f) => f.fieldName === "applicantName")?.value).toBe("Sukrutha K");
    expect(coldResult.document?.fields.find((f) => f.fieldName === "annualIncome")?.value).toBe("₹ 1,80,000");
    expect(coldResult.document?.fields.find((f) => f.fieldName === "certificateRef")?.value).toBe("RD0088776655");

    // 2. Second (Warm) upload: worker is already initialized and in memory
    const tWarmStart = Date.now();
    const warmResult = await processDocumentUpload(
      docBuffer,
      "income_certificate_scan_2.png",
      "image/png",
      testUserId,
      { duplicateResolution: "keep_both" },
      prisma
    );
    const warmDuration = Date.now() - tWarmStart;

    console.info(`[MEASUREMENT] Warm upload duration: ${warmDuration} ms`);

    expect(warmResult.success).toBe(true);
    expect(warmResult.document?.documentTypeKey).toBe("INCOME_CERTIFICATE");
    expect(warmResult.document?.extractionStatus).toBe("SUCCESS");
    // Warm upload should complete very quickly
    expect(warmDuration).toBeLessThan(12_000);
  });

  it("verifies random image returns UNKNOWN with 0 fields and does not hang", async () => {
    const randPath = path.join(process.cwd(), "test_random_image.jpg");
    const randBuffer = fs.readFileSync(randPath);

    const tRandStart = Date.now();
    const randResult = await processDocumentUpload(
      randBuffer,
      "sunset_photo.jpg",
      "image/jpeg",
      testUserId,
      { duplicateResolution: "keep_both" },
      prisma
    );
    const randDuration = Date.now() - tRandStart;

    console.info(`[MEASUREMENT] Random image processing duration: ${randDuration} ms`);

    expect(randResult.success).toBe(true);
    expect(randResult.document?.documentTypeKey).toBe("UNKNOWN");
    expect(randResult.document?.extractionStatus).toBe("NEEDS_REVIEW");
    expect(randResult.document?.fields.length).toBe(0);
  });
});

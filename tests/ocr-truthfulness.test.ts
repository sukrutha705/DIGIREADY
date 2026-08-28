import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { processDocumentUpload } from "../src/server/documents/extraction/service";

describe("Phase 15: OCR Truthfulness & False Positive Elimination", () => {
  let testUserId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { displayName: "Truthfulness Test User" },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
  });

  it("1. Random photograph returns UNKNOWN/NEEDS_REVIEW with 0 extracted fields", async () => {
    // Generate a synthetic landscape image
    const landscapeSvg = `
      <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="800" height="300" fill="#0284c7"/>
        <rect y="300" width="800" height="300" fill="#15803d"/>
        <circle cx="400" cy="200" r="80" fill="#facc15"/>
        <polygon points="100,300 250,150 400,300" fill="#475569"/>
        <polygon points="300,300 450,120 600,300" fill="#334155"/>
      </svg>
    `;
    const landscapeBuffer = await sharp(Buffer.from(landscapeSvg)).jpeg().toBuffer();

    const result = await processDocumentUpload(
      landscapeBuffer,
      "scenery_photo.jpg",
      "image/jpeg",
      testUserId,
      { duplicateResolution: "keep_both" },
      prisma
    );

    expect(result.success).toBe(true);
    expect(result.document?.documentTypeKey).toBe("UNKNOWN");
    expect(result.document?.extractionStatus).toBe("NEEDS_REVIEW");
    expect(result.document?.fields.length).toBe(0);
  });

  it("2. Casual text note does not become a government document", async () => {
    const noteSvg = `
      <svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="400" fill="#fef08a"/>
        <text x="30" y="50" font-family="Arial, sans-serif" font-size="20" fill="#1e293b">Grocery Shopping List</text>
        <text x="30" y="90" font-family="Arial, sans-serif" font-size="16" fill="#334155">- Milk 2 Liters</text>
        <text x="30" y="130" font-family="Arial, sans-serif" font-size="16" fill="#334155">- Bread and Eggs</text>
        <text x="30" y="170" font-family="Arial, sans-serif" font-size="16" fill="#334155">- Meeting at 4:00 PM</text>
      </svg>
    `;
    const noteBuffer = await sharp(Buffer.from(noteSvg)).png().toBuffer();

    const result = await processDocumentUpload(
      noteBuffer,
      "grocery_list.png",
      "image/png",
      testUserId,
      { duplicateResolution: "keep_both" },
      prisma
    );

    expect(result.success).toBe(true);
    expect(result.document?.documentTypeKey).toBe("UNKNOWN");
    expect(result.document?.extractionStatus).toBe("NEEDS_REVIEW");
    expect(result.document?.fields.length).toBe(0);
  });

  it("3. Genuine Income Certificate extracts income and name truthfully, missing fields remain unconfirmed", async () => {
    // Has income certificate header, applicant name, and annual income, but NO father name
    const partialDocSvg = `
      <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="800" height="600" fill="white"/>
        <text x="400" y="80" font-family="Arial, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="#1e3a8a">GOVERNMENT OF KARNATAKA</text>
        <text x="400" y="120" font-family="Arial, sans-serif" font-size="20" font-weight="bold" text-anchor="middle" fill="#1e3a8a">REVENUE DEPARTMENT</text>
        <text x="400" y="170" font-family="Arial, sans-serif" font-size="26" font-weight="bold" text-anchor="middle" fill="#b91c1c">INCOME CERTIFICATE</text>
        <text x="80" y="240" font-family="Arial, sans-serif" font-size="18" fill="black">Certificate No: RD9911223344</text>
        <text x="80" y="290" font-family="Arial, sans-serif" font-size="18" fill="black">Applicant Name: Ananya Sharma</text>
        <text x="80" y="340" font-family="Arial, sans-serif" font-size="18" fill="black">Annual Family Income: Rs. 240000</text>
        <text x="80" y="390" font-family="Arial, sans-serif" font-size="18" fill="black">Valid For: 5 Years</text>
        <text x="600" y="500" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="black">Tahsildar</text>
        <text x="600" y="530" font-family="Arial, sans-serif" font-size="16" fill="#4b5563">Bengaluru East</text>
      </svg>
    `;
    const docBuffer = await sharp(Buffer.from(partialDocSvg)).png().toBuffer();

    const result = await processDocumentUpload(
      docBuffer,
      "income_cert_scanned.png",
      "image/png",
      testUserId,
      { duplicateResolution: "keep_both" },
      prisma
    );

    expect(result.success).toBe(true);
    expect(result.document?.documentTypeKey).toBe("INCOME_CERTIFICATE");
    expect(result.document?.extractionStatus).toBe("SUCCESS");

    // Confirmed fields from OCR text
    const nameField = result.document?.fields.find((f) => f.fieldName === "applicantName");
    expect(nameField?.status).toBe("FOUND");
    expect(nameField?.value).toBe("Ananya Sharma");

    const incomeField = result.document?.fields.find((f) => f.fieldName === "annualIncome");
    expect(incomeField?.status).toBe("FOUND");
    expect(incomeField?.value).toBe("₹ 2,40,000");

    const certRefField = result.document?.fields.find((f) => f.fieldName === "certificateRef");
    expect(certRefField?.status).toBe("FOUND");
    expect(certRefField?.value).toBe("RD9911223344");

    // Unconfirmed field (not in OCR text) must NOT be fabricated
    const fatherField = result.document?.fields.find((f) => f.fieldName === "fatherName");
    expect(fatherField?.status).toBe("UNCONFIRMED");
    expect(fatherField?.value).toBe("");
  });

  it("4. Misleadingly named blank image does NOT force document detection", async () => {
    // White blank image with a misleading official-sounding filename
    const blankSvg = `<svg width="500" height="500" xmlns="http://www.w3.org/2000/svg"><rect width="500" height="500" fill="white"/></svg>`;
    const blankBuffer = await sharp(Buffer.from(blankSvg)).jpeg().toBuffer();

    const result = await processDocumentUpload(
      blankBuffer,
      "kseeb_secondary_school_leaving_certificate_10th_marks_card_aadhaar.jpg",
      "image/jpeg",
      testUserId,
      { duplicateResolution: "keep_both" },
      prisma
    );

    expect(result.success).toBe(true);
    expect(result.document?.documentTypeKey).toBe("UNKNOWN");
    expect(result.document?.extractionStatus).toBe("NEEDS_REVIEW");
    expect(result.document?.fields.length).toBe(0);
  });

  it("5. Real upload does NOT leak seeded demo citizen identity data", async () => {
    const randomSvg = `
      <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="400" fill="#64748b"/>
        <circle cx="200" cy="200" r="100" fill="#38bdf8"/>
      </svg>
    `;
    const randomBuffer = await sharp(Buffer.from(randomSvg)).png().toBuffer();

    const result = await processDocumentUpload(
      randomBuffer,
      "user_upload_test.png",
      "image/png",
      testUserId,
      { duplicateResolution: "keep_both" },
      prisma
    );

    expect(result.success).toBe(true);
    // Ensure no demo fields like "Demo Citizen", "John Doe", "Demo Candidate"
    const fields = result.document?.fields || [];
    for (const field of fields) {
      expect(field.value.toLowerCase()).not.toContain("demo");
    }

    // Verify identity evidence in database for this document has no demo entries
    const evidences = await prisma.identityEvidence.findMany({
      where: { documentId: result.document?.id },
    });
    expect(evidences.length).toBe(0);
  });
});


import { describe, it, expect } from "vitest";
import { prisma } from "../src/lib/prisma";

describe("Phase 2: Synthetic Document Vault & Domain Models", () => {
  it("verifies synthetic demo user exists", async () => {
    const demoUser = await prisma.user.findFirst({
      where: { displayName: { contains: "Demo Citizen" } },
    });
    expect(demoUser).toBeDefined();
    expect(demoUser?.displayName).toContain("Demo Citizen");
  });

  it("verifies canonical document types are seeded", async () => {
    const docTypes = await prisma.documentType.findMany({
      include: { aliases: true },
    });
    expect(docTypes.length).toBeGreaterThanOrEqual(10);

    const higherSec = docTypes.find(
      (d) => d.canonicalKey === "HIGHER_SECONDARY_MARKS_CARD"
    );
    expect(higherSec).toBeDefined();
    expect(higherSec?.category).toBe("EDUCATION");
    expect(higherSec?.aliases.length).toBeGreaterThanOrEqual(4);
  });

  it("verifies User -> Document relationship and vault documents", async () => {
    const userWithDocs = await prisma.user.findFirst({
      include: {
        documents: {
          include: {
            documentType: true,
            fields: true,
          },
        },
      },
    });

    expect(userWithDocs).not.toBeNull();
    expect(userWithDocs?.documents.length).toBeGreaterThanOrEqual(6);

    // Verify all documents belong to the user
    for (const doc of userWithDocs!.documents) {
      expect(doc.userId).toBe(userWithDocs!.id);
      expect(doc.documentType).toBeDefined();
      expect(doc.issuer).toContain("Demo");
    }
  });

  it("verifies Document -> DocumentType relationship", async () => {
    const doc = await prisma.document.findFirst({
      where: { displayName: "2nd PUC Marks Card" },
      include: { documentType: true },
    });

    expect(doc).not.toBeNull();
    expect(doc?.documentType.canonicalKey).toBe("HIGHER_SECONDARY_MARKS_CARD");
  });

  it("verifies both ISSUED and UPLOADED document sources work", async () => {
    const issuedDocs = await prisma.document.findMany({
      where: { source: "ISSUED" },
    });
    const uploadedDocs = await prisma.document.findMany({
      where: { source: "UPLOADED" },
    });

    expect(issuedDocs.length).toBeGreaterThan(0);
    expect(uploadedDocs.length).toBeGreaterThan(0);
  });

  it("verifies Document -> DocumentFields metadata", async () => {
    const sslcDoc = await prisma.document.findFirst({
      where: { displayName: "Class 10 SSLC Marks Card" },
      include: { fields: true },
    });

    expect(sslcDoc).not.toBeNull();
    expect(sslcDoc?.fields.length).toBeGreaterThanOrEqual(3);

    const nameField = sslcDoc?.fields.find((f) => f.fieldName === "candidateName");
    expect(nameField?.normalizedValue).toBe("DEMO CITIZEN");

    const dobField = sslcDoc?.fields.find((f) => f.fieldName === "dateOfBirth");
    expect(dobField?.normalizedValue).toBe("2006-05-15");
  });
});

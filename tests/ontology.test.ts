import { describe, it, expect } from "vitest";
import { normalizeDocumentName, resolveDocumentType } from "../src/server/ontology";
import { prisma } from "../src/lib/prisma";

describe("Phase 2: Document Normalization & Ontology Resolution", () => {
  it("normalizes names by trimming, lowercasing, and stripping special characters", () => {
    expect(normalizeDocumentName("  2nd PUC Marks Card!!  ")).toBe("2nd puc marks card");
    expect(normalizeDocumentName("CLASS-XII   MARKS CARD")).toBe("class xii marks card");
    expect(normalizeDocumentName("")).toBe("");
  });

  it("resolves canonical keys directly", async () => {
    const docType = await resolveDocumentType("HIGHER_SECONDARY_MARKS_CARD", prisma);
    expect(docType).not.toBeNull();
    expect(docType?.canonicalKey).toBe("HIGHER_SECONDARY_MARKS_CARD");
    expect(docType?.displayName).toBe("Higher Secondary Marks Card");
  });

  it("resolves display names with case and spacing variations", async () => {
    const docType = await resolveDocumentType("Higher Secondary Marks Card", prisma);
    expect(docType).not.toBeNull();
    expect(docType?.canonicalKey).toBe("HIGHER_SECONDARY_MARKS_CARD");

    const lowerCaseDocType = await resolveDocumentType("secondary marks card", prisma);
    expect(lowerCaseDocType?.canonicalKey).toBe("SECONDARY_MARKS_CARD");
  });

  it("resolves aliases deterministically to canonical types", async () => {
    // Aliases for HIGHER_SECONDARY_MARKS_CARD
    const pucAlias1 = await resolveDocumentType("2nd PUC Marks Card", prisma);
    expect(pucAlias1?.canonicalKey).toBe("HIGHER_SECONDARY_MARKS_CARD");

    const pucAlias2 = await resolveDocumentType("PUC II Marks Card", prisma);
    expect(pucAlias2?.canonicalKey).toBe("HIGHER_SECONDARY_MARKS_CARD");

    const pucAlias3 = await resolveDocumentType("12th Marks Card", prisma);
    expect(pucAlias3?.canonicalKey).toBe("HIGHER_SECONDARY_MARKS_CARD");

    const pucAlias4 = await resolveDocumentType("Class XII Marks Card", prisma);
    expect(pucAlias4?.canonicalKey).toBe("HIGHER_SECONDARY_MARKS_CARD");

    // Aliases for SECONDARY_MARKS_CARD
    const sslcAlias = await resolveDocumentType("SSLC Marks Card", prisma);
    expect(sslcAlias?.canonicalKey).toBe("SECONDARY_MARKS_CARD");

    const class10Alias = await resolveDocumentType("Class 10 Marks Card", prisma);
    expect(class10Alias?.canonicalKey).toBe("SECONDARY_MARKS_CARD");

    // Aliases for STUDY_CERTIFICATE
    const studyAlias = await resolveDocumentType("Study Certificate (7 Years)", prisma);
    expect(studyAlias?.canonicalKey).toBe("STUDY_CERTIFICATE");
  });

  it("returns null for unknown or unmapped document names", async () => {
    const unknown1 = await resolveDocumentType("Random Unregistered Document", prisma);
    expect(unknown1).toBeNull();

    const empty = await resolveDocumentType("", prisma);
    expect(empty).toBeNull();
  });
});

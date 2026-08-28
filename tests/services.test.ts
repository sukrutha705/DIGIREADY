import { describe, it, expect } from "vitest";
import { prisma } from "../src/lib/prisma";
import {
  getServiceByKey,
  getServiceRequirements,
  resolveRequirementsForService,
} from "../src/server/service-requirements";

describe("Phase 3: Generic Service + Requirements Engine", () => {
  it("verifies seeded services exist in database", async () => {
    const services = await prisma.service.findMany();
    expect(services.length).toBeGreaterThanOrEqual(3);

    const kcet = services.find((s) => s.serviceKey === "KCET_APPLICATION");
    expect(kcet).toBeDefined();
    expect(kcet?.name).toBe("KCET Application");
    expect(kcet?.category).toBe("EXAMINATION");
    expect(kcet?.providerName).toBe("Demo Karnataka Examination Authority");

    const scholarship = services.find((s) => s.serviceKey === "SCHOLARSHIP_APPLICATION");
    expect(scholarship).toBeDefined();
    expect(scholarship?.category).toBe("SCHOLARSHIP");

    const incomeApp = services.find((s) => s.serviceKey === "INCOME_CERTIFICATE_APPLICATION");
    expect(incomeApp).toBeDefined();
    expect(incomeApp?.category).toBe("CERTIFICATE");
  });

  it("verifies serviceKey uniqueness constraint", async () => {
    const existing = await prisma.service.findFirst();
    expect(existing).not.toBeNull();

    await expect(
      prisma.service.create({
        data: {
          slug: "duplicate-service",
          serviceKey: existing!.serviceKey,
          name: "Duplicate Service",
          shortDescription: "Test",
          category: "OTHER",
          providerName: "Demo Authority",
        },
      })
    ).rejects.toThrow();
  });

  it("retrieves service and requirements via getServiceByKey", async () => {
    const service = await getServiceByKey("KCET_APPLICATION", prisma);
    expect(service).not.toBeNull();
    expect(service?.serviceKey).toBe("KCET_APPLICATION");
    expect(service?.active).toBe(true);

    const unknown = await getServiceByKey("UNKNOWN_SERVICE", prisma);
    expect(unknown).toBeNull();
  });

  it("retrieves service requirements in ascending sortOrder", async () => {
    const reqs = await getServiceRequirements("KCET_APPLICATION", prisma);
    expect(reqs.length).toBe(6);

    // Verify ordering
    for (let i = 0; i < reqs.length - 1; i++) {
      expect(reqs[i].sortOrder).toBeLessThanOrEqual(reqs[i + 1].sortOrder);
    }

    expect(reqs[0].sortOrder).toBe(1);
    expect(reqs[0].requirementKey).toBe("KCET_GOVT_ID");
  });

  it("preserves requirement types: REQUIRED, OPTIONAL, and CONDITIONAL", async () => {
    const reqs = await getServiceRequirements("KCET_APPLICATION", prisma);

    const required = reqs.filter((r) => r.requirementType === "REQUIRED");
    const optional = reqs.filter((r) => r.requirementType === "OPTIONAL");
    const conditional = reqs.filter((r) => r.requirementType === "CONDITIONAL");

    expect(required.length).toBe(3);
    expect(optional.length).toBe(1);
    expect(conditional.length).toBe(2);

    const studyReq = conditional.find((r) => r.requirementKey === "KCET_STUDY_CERT");
    expect(studyReq?.conditionKey).toBe("DOMICILE_ELIGIBILITY_CLAUSE");

    const casteReq = conditional.find((r) => r.requirementKey === "KCET_CASTE_CERT");
    expect(casteReq?.conditionKey).toBe("CATEGORY_RESERVATION_CLAIM");
  });

  it("verifies every requirement has a valid RequirementSource with provenance", async () => {
    const reqs = await prisma.serviceRequirement.findMany({
      include: { source: true },
    });
    expect(reqs.length).toBeGreaterThan(0);

    for (const req of reqs) {
      expect(req.source).toBeDefined();
      expect(["MOCK_REFERENCE", "MOCK_API"]).toContain(req.source.sourceType);
      expect(req.source.notes).toContain("Synthetic");
    }
  });

  it("verifies every requirement references an existing canonical DocumentType by ID and canonicalKey", async () => {
    const reqs = await prisma.serviceRequirement.findMany({
      include: { documentType: true },
    });

    for (const req of reqs) {
      expect(req.documentType).toBeDefined();
      expect(req.documentType.id).toBe(req.documentTypeId);
      // Canonical key must be upper snake case and defined
      expect(req.documentType.canonicalKey).toMatch(/^[A-Z_]+$/);
    }
  });

  it("verifies the same DocumentType is reused across multiple services", async () => {
    const govtIdType = await prisma.documentType.findUnique({
      where: { canonicalKey: "GOVERNMENT_IDENTITY_PROOF" },
      include: { serviceRequirements: true },
    });

    expect(govtIdType).not.toBeNull();
    // Reused across multiple services (KCET, Scholarship, Income, EPFO, Passport, Pension)
    expect(govtIdType?.serviceRequirements.length).toBeGreaterThanOrEqual(3);
  });

  it("resolves structured requirements via resolveRequirementsForService DTO", async () => {
    const result = await resolveRequirementsForService("SCHOLARSHIP_APPLICATION", prisma);
    expect(result).not.toBeNull();
    expect(result?.serviceKey).toBe("SCHOLARSHIP_APPLICATION");
    expect(result?.serviceName).toBe("Government Scholarship Application");
    expect(result?.category).toBe("SCHOLARSHIP");
    expect(result?.requirements.length).toBe(4);

    const higherSecReq = result?.requirements.find(
      (r) => r.documentTypeKey === "HIGHER_SECONDARY_MARKS_CARD"
    );
    expect(higherSecReq).toBeDefined();
    expect(higherSecReq?.requirementType).toBe("REQUIRED");
    expect(higherSecReq?.source.sourceType).toBe("MOCK_REFERENCE");

    const unknownResult = await resolveRequirementsForService("NON_EXISTENT_SERVICE", prisma);
    expect(unknownResult).toBeNull();
  });

  it("executes generically for all registered services without service-specific branching", async () => {
    const allServices = await prisma.service.findMany();
    for (const svc of allServices) {
      const resolved = await resolveRequirementsForService(svc.serviceKey, prisma);
      expect(resolved).not.toBeNull();
      expect(resolved?.serviceKey).toBe(svc.serviceKey);
      expect(Array.isArray(resolved?.requirements)).toBe(true);
    }
  });
});

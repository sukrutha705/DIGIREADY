import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import { getApplicationJourney } from "../src/server/journey/service";
import { getDemoUser } from "../src/server/vault";

describe("Phase 9: Universal Application Journey Engine", () => {
  let demoUserId: string;

  beforeAll(async () => {
    const user = await getDemoUser(prisma);
    expect(user).toBeDefined();
    demoUserId = user.id;

    // Reset dynamically uploaded documents to ensure clean baseline
    await prisma.documentField.deleteMany({
      where: { document: { userId: demoUserId, imageStorageKey: { not: null } } },
    });
    await prisma.document.deleteMany({
      where: { userId: demoUserId, imageStorageKey: { not: null } },
    });
  });

  it("computes application journey for JEE Main without hardcoded logic", async () => {
    const journey = await getApplicationJourney(demoUserId, "jee-main", prisma);
    expect(journey).not.toBeNull();
    expect(journey?.serviceName).toBe("JEE Main");
    expect(journey?.requiredCount).toBe(3);
    expect(journey?.availableCount).toBe(3);
    expect(journey?.missingCount).toBe(0);
    expect(journey?.limitationNote).toBeDefined();

    // Since demo user has all 3 required documents and no conflicts in initial vault, status is READY_TO_APPLY
    expect(journey?.status).toBe("READY_TO_APPLY");
    expect(journey?.consistency?.hasConflicts).toBe(false);
  });

  it("computes application journey for KCET with missing income certificate", async () => {
    const journey = await getApplicationJourney(demoUserId, "kcet", prisma);
    expect(journey).not.toBeNull();
    expect(journey?.serviceName).toBe("KCET");
    expect(journey?.status).toBe("MISSING_DOCUMENTS");
    expect(journey?.missingDocuments.some((d) => d.documentType === "INCOME_CERTIFICATE")).toBe(true);
    expect(journey?.nextActions.some((a) => a.type === "GUIDANCE")).toBe(true);
  });

  it("computes application journey for Passport with all required documents available", async () => {
    const journey = await getApplicationJourney(demoUserId, "passport", prisma);
    expect(journey).not.toBeNull();
    expect(journey?.serviceName).toBe("Passport");
    expect(journey?.requiredCount).toBe(3);
    expect(journey?.availableCount).toBe(3);
    expect(journey?.missingCount).toBe(0);
    expect(journey?.status).toBe("READY_TO_APPLY");
  });

  it("computes application journey for UPSC Civil Services with missing degree certificate", async () => {
    const journey = await getApplicationJourney(demoUserId, "upsc-civil-services", prisma);
    expect(journey).not.toBeNull();
    expect(journey?.serviceName).toBe("UPSC Civil Services");
    expect(journey?.status).toBe("MISSING_DOCUMENTS");
    expect(journey?.missingDocuments.some((d) => d.documentType === "DEGREE_CERTIFICATE")).toBe(true);
  });

  it("confirms document sharing is NEVER a mandatory requirement or gate for application readiness", async () => {
    const journey = await getApplicationJourney(demoUserId, "jee-main", prisma);
    expect(journey).not.toBeNull();

    // Verify nextActions do NOT require sharing to achieve readiness
    const mandatoryShareAction = journey?.nextActions.find(
      (a) => a.type === ("SHARE" as any) && (a as any).required === true
    );
    expect(mandatoryShareAction).toBeUndefined();
  });

  it("returns null for unknown services without crashing", async () => {
    const journey = await getApplicationJourney(demoUserId, "unknown-service-abc-123", prisma);
    expect(journey).toBeNull();
  });
});

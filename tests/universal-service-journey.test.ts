import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import { getDemoUser } from "../src/server/vault";
import { getApplicationJourney, JOURNEY_LIMITATION_NOTE } from "../src/server/journey/service";

describe("Phase 9.1 — Universal Application Journey Engine", () => {
  let demoUserId: string;

  beforeAll(async () => {
    const user = await getDemoUser(prisma);
    expect(user).toBeDefined();
    demoUserId = user.id;
  });

  it("resolves journey for JEE Main with correct metadata and requirements", async () => {
    const journey = await getApplicationJourney(demoUserId, "jee-main", prisma);
    expect(journey).not.toBeNull();
    expect(journey?.serviceId).toBe("jee-main");
    expect(journey?.serviceName).toContain("JEE Main");
    expect(journey?.requiredCount).toBeGreaterThanOrEqual(3);
    expect(journey?.limitationNote).toBe(JOURNEY_LIMITATION_NOTE);
    expect(journey?.officialApplicationUrl || journey?.officialWebsite).toMatch(/^https:\/\//);
  });

  it("resolves journey for NEET UG with correct requirements", async () => {
    const journey = await getApplicationJourney(demoUserId, "neet-ug", prisma);
    expect(journey).not.toBeNull();
    expect(journey?.serviceId).toBe("neet-ug");
    expect(journey?.serviceName).toContain("NEET UG");
    expect(journey?.requiredCount).toBeGreaterThanOrEqual(3);
  });

  it("resolves journey for UPSC Civil Services with steps and checklist", async () => {
    const journey = await getApplicationJourney(demoUserId, "upsc-civil-services", prisma);
    expect(journey).not.toBeNull();
    expect(journey?.serviceId).toBe("upsc-civil-services");
    expect(journey?.serviceName).toContain("UPSC");
    expect(journey?.requiredCount).toBeGreaterThanOrEqual(3);
  });

  it("resolves journey for PM-KISAN scheme", async () => {
    const journey = await getApplicationJourney(demoUserId, "pm-kisan", prisma);
    expect(journey).not.toBeNull();
    expect(journey?.serviceId).toBe("pm-kisan");
    expect(journey?.serviceName).toMatch(/PM[- ]Kisan/i);
  });

  it("resolves journey for Passport application", async () => {
    const journey = await getApplicationJourney(demoUserId, "passport", prisma);
    expect(journey).not.toBeNull();
    expect(journey?.serviceId).toBe("passport");
    expect(journey?.serviceName).toContain("Passport");
    expect(journey?.requiredCount).toBeGreaterThanOrEqual(3);
  });

  it("gracefully returns null for unsupported or non-existent service journeys", async () => {
    const invalidJourney = await getApplicationJourney(demoUserId, "random-fake-service-slug", prisma);
    expect(invalidJourney).toBeNull();
  });
});

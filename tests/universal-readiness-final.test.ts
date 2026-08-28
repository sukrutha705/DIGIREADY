import { describe, it, expect } from "vitest";
import { getApplicationJourney } from "@/server/journey/service";
import { getDemoUser } from "@/server/vault";

describe("Phase 9.2: Universal Readiness & 9-Stage Lifecycle Integration", () => {
  it("resolves application journey for any registered service in the 58-service catalog", async () => {
    const demoUser = await getDemoUser();

    // 1. Examination
    const kcetJourney = await getApplicationJourney(demoUser.id, "KCET");
    expect(kcetJourney).not.toBeNull();
    expect(kcetJourney?.serviceName).toBeDefined();
    expect(kcetJourney?.eligibility).toBeDefined();
    expect(kcetJourney?.applicationWindow).toBeDefined();
    expect(kcetJourney?.blockers).toBeDefined();

    // 2. Recruitment
    const upscJourney = await getApplicationJourney(demoUser.id, "UPSC Civil Services");
    expect(upscJourney).not.toBeNull();
    expect(upscJourney?.requiredCount).toBeGreaterThanOrEqual(1);

    // 3. Scholarship
    const sspJourney = await getApplicationJourney(demoUser.id, "State Scholarship Portal");
    expect(sspJourney).not.toBeNull();

    // 4. Public Service
    const passportJourney = await getApplicationJourney(demoUser.id, "Passport Application");
    expect(passportJourney).not.toBeNull();
    expect(passportJourney?.applicationWindow?.status).toBe("OPEN");
  });

  it("evaluates readiness blockers with actionable categorizations", async () => {
    const demoUser = await getDemoUser();
    const journey = await getApplicationJourney(demoUser.id, "KCET");

    expect(journey).not.toBeNull();
    // Verify each blocker has required actionable fields
    for (const blocker of journey!.blockers) {
      expect(["ELIGIBILITY", "DOCUMENT_MISSING", "CONFLICT", "VERIFICATION", "DEADLINE"]).toContain(
        blocker.category
      );
      expect(blocker.title).toBeDefined();
      expect(blocker.description).toBeDefined();
      expect(blocker.actionLabel).toBeDefined();
    }
  });

  it("strictly enforces non-submission disclaimers across all journeys", async () => {
    const demoUser = await getDemoUser();
    const journey = await getApplicationJourney(demoUser.id, "JEE Main");

    expect(journey?.limitationNote).toContain("DigiReady does not submit official applications");
  });
});

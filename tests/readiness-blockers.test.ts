import { describe, it, expect } from "vitest";
import { getApplicationJourney } from "@/server/journey/service";
import { getDemoUser } from "@/server/vault";

describe("Phase 9.2: Readiness Blockers Intelligence Subsystem", () => {
  it("identifies missing document blocker with guidance action", async () => {
    const demoUser = await getDemoUser();
    const journey = await getApplicationJourney(demoUser.id, "KCET");

    expect(journey).not.toBeNull();
    // Check if any blockers exist
    if (journey?.missingCount && journey.missingCount > 0) {
      const missingBlocker = journey.blockers.find((b) => b.category === "DOCUMENT_MISSING");
      expect(missingBlocker).toBeDefined();
      expect(missingBlocker?.actionType).toBe("GUIDANCE");
    }
  });

  it("identifies conflict blocker when cross-document inconsistencies exist", async () => {
    const demoUser = await getDemoUser();
    const journey = await getApplicationJourney(demoUser.id, "KCET");

    expect(journey).not.toBeNull();
    if (journey?.consistency?.hasConflicts) {
      const conflictBlocker = journey.blockers.find((b) => b.category === "CONFLICT");
      expect(conflictBlocker).toBeDefined();
      expect(conflictBlocker?.actionType).toBe("CONFLICT_GUIDANCE");
      expect(conflictBlocker?.actionHref).toContain("#conflicts");
    }
  });
});

import { describe, it, expect } from "vitest";
import { getApplicationJourney } from "@/server/journey/service";
import { getDemoUser } from "@/server/vault";
import { evaluateServiceEligibility } from "@/server/eligibility/service";
import { getApplicationWindowInfo } from "@/server/application-window/service";

describe("Phase 9.2: Master Final Product 90-Second Demo Flow", () => {
  it("executes the complete 9-stage readiness pipeline end-to-end", async () => {
    const demoUser = await getDemoUser();

    // 1. Service Requirements & Overview
    const eligibility = await evaluateServiceEligibility(demoUser.id, "KCET");
    expect(eligibility).toBeDefined();

    // 2. Application Window Intelligence
    const windowInfo = await getApplicationWindowInfo("KCET");
    expect(windowInfo.status).toBeDefined();
    expect(windowInfo.disclaimer).toBeDefined();

    // 3. End-to-End Application Journey with 9-Stage Progress
    const journey = await getApplicationJourney(demoUser.id, "KCET");
    expect(journey).not.toBeNull();
    expect(journey?.serviceName).toContain("KCET");
    expect(journey?.requiredCount).toBeGreaterThanOrEqual(4);
    expect(journey?.blockers).toBeDefined();
    expect(journey?.limitationNote).toContain("DigiReady does not submit");
  });
});

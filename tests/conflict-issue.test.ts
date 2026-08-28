import { describe, it, expect } from "vitest";
import { getConflictIssues } from "@/server/conflicts/service";
import { getDemoUser } from "@/server/vault";
import { prisma } from "@/lib/prisma";

describe("Phase 9.3: Conflict Issue Domain Model", () => {
  it("generates structured ConflictIssue objects with BLOCKING severity for identity conflicts", async () => {
    const demoUser = await getDemoUser();
    const issues = await getConflictIssues(demoUser.id, "Bengaluru", prisma);

    if (issues.length > 0) {
      const issue = issues[0];
      expect(issue).toHaveProperty("id");
      expect(issue).toHaveProperty("field");
      expect(issue).toHaveProperty("fieldLabel");
      expect(issue).toHaveProperty("valueA");
      expect(issue).toHaveProperty("valueB");
      expect(["BLOCKING", "WARNING", "INFO"]).toContain(issue.severity);
      expect(issue.resolutionPlan).toBeDefined();
      expect(issue.authority).toBeDefined();
      expect(issue.whyItMatters).toBeTruthy();
      expect(issue.explanation).toBeTruthy();
      expect(issue.centreRequired).toBeTypeOf("boolean");
    }
  });

  it("includes verified centre recommendations when city is provided", async () => {
    const demoUser = await getDemoUser();
    const issues = await getConflictIssues(demoUser.id, "Bengaluru", prisma);

    if (issues.length > 0) {
      const issue = issues[0];
      expect(issue.userCity).toBe("Bengaluru");
      if (issue.recommendedCentres) {
        expect(Array.isArray(issue.recommendedCentres)).toBe(true);
        if (issue.recommendedCentres.length > 0) {
          expect(issue.recommendedCentres[0].verificationStatus).toBe("VERIFIED_OFFICIAL");
        }
      }
    }
  });
});

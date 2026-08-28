import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import { evaluateServiceReadiness } from "../src/server/readiness";

describe("Phase 9.1 — Universal Service Readiness Engine", () => {
  let demoUserId: string;

  beforeAll(async () => {
    const demoUser = await prisma.user.findFirst({
      where: { displayName: { contains: "Demo Citizen" } },
    });
    if (!demoUser) {
      throw new Error("Seeded Demo Citizen not found. Please run seed script.");
    }
    demoUserId = demoUser.id;
  });

  it("evaluates KCET readiness successfully for demo user", async () => {
    const report = await evaluateServiceReadiness(demoUserId, "KCET_APPLICATION");
    expect(report).toBeDefined();
    expect(report.serviceKey).toBe("KCET_APPLICATION");
    expect(["COMPLETE", "INCOMPLETE"]).toContain(report.overallStatus);
    expect(report.requiredSatisfied).toBeGreaterThanOrEqual(3);
  });

  it("evaluates NEET UG readiness universally for demo user", async () => {
    const report = await evaluateServiceReadiness(demoUserId, "NEET_UG_APPLICATION");
    expect(report).toBeDefined();
    expect(report.serviceKey).toBe("NEET_UG_APPLICATION");
    expect(report.serviceName).toContain("NEET");
    expect(report.requiredTotal).toBeGreaterThanOrEqual(3);
    expect(report.requirements.length).toBeGreaterThanOrEqual(3);
  });

  it("evaluates JEE Main readiness universally for demo user", async () => {
    const report = await evaluateServiceReadiness(demoUserId, "JEE_MAIN_APPLICATION");
    expect(report).toBeDefined();
    expect(report.serviceKey).toBe("JEE_MAIN_APPLICATION");
    expect(report.requiredTotal).toBeGreaterThanOrEqual(3);
  });

  it("evaluates Passport application readiness universally for demo user", async () => {
    const report = await evaluateServiceReadiness(demoUserId, "PASSPORT_APPLICATION");
    expect(report).toBeDefined();
    expect(report.serviceKey).toBe("PASSPORT_APPLICATION");
    expect(report.serviceName).toContain("Passport");
    expect(report.requiredTotal).toBeGreaterThanOrEqual(3);
  });

  it("evaluates Income Certificate application readiness for demo user", async () => {
    const report = await evaluateServiceReadiness(demoUserId, "INCOME_CERTIFICATE_APPLICATION");
    expect(report).toBeDefined();
    expect(report.serviceKey).toBe("INCOME_CERTIFICATE_APPLICATION");
    expect(report.requiredTotal).toBe(2);
    expect(report.requiredSatisfied).toBe(2);
    expect(report.overallStatus).toBe("COMPLETE");
  });

  it("evaluates UPSC Civil Services readiness for demo user", async () => {
    const report = await evaluateServiceReadiness(demoUserId, "UPSC_CIVIL_SERVICES");
    expect(report).toBeDefined();
    expect(report.serviceKey).toBe("UPSC_CIVIL_SERVICES");
    expect(report.serviceName).toContain("UPSC");
    // Demo user has 10th and Govt ID, but is missing Degree certificate
    expect(report.requirements.length).toBeGreaterThanOrEqual(3);
    expect(report.requiredTotal).toBe(3);
  });

  it("evaluates readiness by slug as well as serviceKey", async () => {
    const reportBySlug = await evaluateServiceReadiness(demoUserId, "kcet");
    const reportByKey = await evaluateServiceReadiness(demoUserId, "KCET_APPLICATION");
    expect(reportBySlug.serviceKey).toBe(reportByKey.serviceKey);
    expect(reportBySlug.overallStatus).toBe(reportByKey.overallStatus);
  });
});

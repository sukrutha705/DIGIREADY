import { describe, it, expect } from "vitest";
import { getServiceByName, getAllRegisteredServices } from "@/server/services/registry";
import { getServiceEligibilityRule } from "@/server/eligibility/rules";
import { evaluateApplicationWindow } from "@/server/application-window/engine";

describe("Phase 9.2: Dedicated Service Detail Subsystem", () => {
  it("resolves service detail metadata for KCET", async () => {
    const service = await getServiceByName("KCET");
    expect(service).not.toBeNull();
    expect(service?.serviceName).toBeDefined();
    expect(service?.requiredDocuments.length).toBeGreaterThanOrEqual(4);

    const eligibility = getServiceEligibilityRule(service!.slug || service!.serviceId);
    expect(eligibility).toBeDefined();
    expect(eligibility.minEducationQualification).toBe("12TH_PASS");

    const windowInfo = evaluateApplicationWindow(service!.slug || service!.serviceId);
    expect(windowInfo.status).toBeDefined();
  });

  it("resolves service detail metadata for Passport Application", async () => {
    const service = await getServiceByName("Passport Application");
    expect(service).not.toBeNull();
    expect(service?.serviceName).toBeDefined();

    const windowInfo = evaluateApplicationWindow(service!.slug || service!.serviceId);
    expect(windowInfo.status).toBe("OPEN");
  });

  it("verifies 58 registered services exist with valid slugs and requirement definitions", async () => {
    const allServices = await getAllRegisteredServices();
    expect(allServices.length).toBeGreaterThanOrEqual(58);

    for (const s of allServices) {
      expect(s.slug).toBeDefined();
      expect(s.name || s.shortName).toBeDefined();
      expect(s.category).toBeDefined();
    }
  });
});

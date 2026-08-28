import { describe, it, expect } from "vitest";
import { DEMO_SERVICE_REQUIREMENTS } from "../src/server/services/requirements";

describe("Phase 9.1 — Service Data Integrity & Provenance", () => {
  const allServices = Object.values(DEMO_SERVICE_REQUIREMENTS);

  it("every service must have non-empty mandatory metadata", () => {
    for (const svc of allServices) {
      expect(svc.serviceId, `Service ID required for ${svc.serviceName}`).toBeTruthy();
      expect(svc.slug, `Slug required for ${svc.serviceName}`).toBeTruthy();
      expect(svc.serviceKey, `ServiceKey required for ${svc.serviceName}`).toBeTruthy();
      expect(svc.serviceName, `ServiceName required for ${svc.slug}`).toBeTruthy();
      expect(svc.category, `Category required for ${svc.serviceName}`).toBeTruthy();
      expect(svc.description, `Description required for ${svc.serviceName}`).toBeTruthy();
      expect(svc.availabilityStatus, `Status required for ${svc.serviceName}`).toBeTruthy();
    }
  });

  it("every official website must be a valid secure URL", () => {
    for (const svc of allServices) {
      if (svc.officialWebsite) {
        expect(svc.officialWebsite, `Official website for ${svc.serviceName} must be HTTPS`).toMatch(/^https:\/\//);
        expect(svc.officialWebsite).not.toContain("localhost");
        expect(svc.officialWebsite).not.toContain("example.com");
      }
    }
  });

  it("verified services must have authoritative provenance metadata", () => {
    const verified = allServices.filter((s) => s.provenanceStatus === "VERIFIED_OFFICIAL");
    expect(verified.length).toBeGreaterThanOrEqual(45);

    for (const svc of verified) {
      expect(svc.authority, `Authority required for verified service ${svc.serviceName}`).toBeTruthy();
      expect(svc.jurisdiction, `Jurisdiction required for verified service ${svc.serviceName}`).toBeTruthy();
    }
  });

  it("every document requirement must define valid documentType and displayName", () => {
    for (const svc of allServices) {
      for (const req of svc.requiredDocuments) {
        expect(req.documentType, `DocType missing in ${svc.serviceName}`).toBeTruthy();
        expect(req.displayName, `DisplayName missing in ${svc.serviceName}`).toBeTruthy();
        expect(typeof req.required).toBe("boolean");
        if (req.priority !== undefined) {
          expect(typeof req.priority).toBe("number");
        }
      }
    }
  });

  it("every service with requirements must have unique document types", () => {
    for (const svc of allServices) {
      const types = svc.requiredDocuments.map((r) => r.documentType);
      const uniqueTypes = new Set(types);
      expect(uniqueTypes.size, `Duplicate doc types in ${svc.serviceName}`).toBe(types.length);
    }
  });

  it("all service slugs and keys must be unique across the registry", () => {
    const slugs = allServices.map((s) => s.slug);
    const uniqueSlugs = new Set(slugs);
    expect(uniqueSlugs.size).toBe(slugs.length);

    const keys = allServices.map((s) => s.serviceKey);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });
});

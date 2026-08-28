import { describe, it, expect } from "vitest";
import { getAllServices, getServiceBySlug, getServicesByCategory } from "../src/server/services/registry";
import { DEMO_SERVICE_REQUIREMENTS } from "../src/server/services/requirements";

describe("Phase 9.1 — Service Registry Expansion", () => {
  it("should contain at least 50 verified Indian services in in-memory catalog", () => {
    const services = Object.values(DEMO_SERVICE_REQUIREMENTS);
    expect(services.length).toBeGreaterThanOrEqual(50);
  });

  it("should contain at least 50 verified Indian services in getAllServices()", async () => {
    const services = await getAllServices();
    expect(services.length).toBeGreaterThanOrEqual(50);
  });

  it("should cover all primary citizen service categories", async () => {
    const services = await getAllServices();
    const categories = new Set(services.map((s) => s.category));

    expect(categories.has("EXAMINATION")).toBe(true);
    expect(categories.has("RECRUITMENT")).toBe(true);
    expect(categories.has("SCHOLARSHIP")).toBe(true);
    expect(categories.has("GOVERNMENT_SCHEME")).toBe(true);
    expect(categories.has("CERTIFICATE")).toBe(true);
    expect(categories.has("GOVERNMENT_SERVICE")).toBe(true);
    expect(categories.has("EMPLOYMENT")).toBe(true);
  });

  it("should provide valid metadata for all major examination services", async () => {
    const examSlugs = [
      "kcet",
      "jee-main",
      "jee-advanced",
      "neet-ug",
      "cuet-ug",
      "gate",
      "ugc-net",
      "csir-net",
      "clat",
      "cat",
      "cmat",
      "xat",
      "nift-entrance",
      "nid-dat",
      "ailet",
      "comedk-uget",
    ];

    for (const slug of examSlugs) {
      const svc = await getServiceBySlug(slug);
      expect(svc, `Service ${slug} should exist`).toBeDefined();
      expect(svc?.category).toBe("EXAMINATION");
      expect(svc?.officialWebsite).toMatch(/^https:\/\//);
      expect(svc?.requiredDocuments.length).toBeGreaterThan(0);
    }
  });

  it("should provide valid metadata for recruitment examination services", async () => {
    const recruitmentSlugs = [
      "upsc-civil-services",
      "upsc-engineering-services",
      "nda",
      "cds",
      "ssc-cgl",
      "ssc-chsl",
      "ssc-mts",
      "ssc-gd",
      "ibps-po",
      "ibps-clerk",
      "sbi-po",
      "sbi-clerk",
      "rrb-ntpc",
      "rrb-group-d",
    ];

    for (const slug of recruitmentSlugs) {
      const svc = await getServiceBySlug(slug);
      expect(svc, `Recruitment service ${slug} should exist`).toBeDefined();
      expect(svc?.category).toBe("RECRUITMENT");
      expect(svc?.authority).toBeDefined();
    }
  });

  it("should provide valid metadata for government schemes and citizen benefits", async () => {
    const schemeSlugs = [
      "pm-kisan",
      "pm-jay",
      "pm-awas-yojana",
      "sukanya-samriddhi",
      "pm-svanidhi",
      "mudra-loan",
      "pm-ujjwala",
    ];

    for (const slug of schemeSlugs) {
      const svc = await getServiceBySlug(slug);
      expect(svc, `Scheme ${slug} should exist`).toBeDefined();
      expect(svc?.category).toBe("GOVERNMENT_SCHEME");
      expect(svc?.officialWebsite).toMatch(/^https:\/\//);
    }
  });

  it("should correctly retrieve services by category", async () => {
    const exams = await getServicesByCategory("EXAMINATION");
    expect(exams.length).toBeGreaterThanOrEqual(15);
    for (const s of exams) {
      expect(s.category).toBe("EXAMINATION");
    }

    const schemes = await getServicesByCategory("GOVERNMENT_SCHEME");
    expect(schemes.length).toBeGreaterThanOrEqual(6);
    for (const s of schemes) {
      expect(s.category).toBe("GOVERNMENT_SCHEME");
    }
  });
});

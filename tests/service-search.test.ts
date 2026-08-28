import { describe, it, expect } from "vitest";
import { searchServices } from "../src/server/services/registry";

describe("Phase 9.1 — Multi-Facet Service Search & Discovery", () => {
  it("should find examinations by official acronym query", async () => {
    const jeeResults = await searchServices("JEE");
    expect(jeeResults.length).toBeGreaterThanOrEqual(2);
    expect(jeeResults.some((s) => s.slug === "jee-main")).toBe(true);
    expect(jeeResults.some((s) => s.slug === "jee-advanced")).toBe(true);

    const neetResults = await searchServices("NEET");
    expect(neetResults.some((s) => s.slug === "neet-ug")).toBe(true);

    const upscResults = await searchServices("UPSC");
    expect(upscResults.length).toBeGreaterThanOrEqual(2);
    expect(upscResults.some((s) => s.slug === "upsc-civil-services")).toBe(true);
  });

  it("should find services by natural keyword query", async () => {
    const kisanResults = await searchServices("kisan");
    expect(kisanResults.some((s) => s.slug === "pm-kisan")).toBe(true);

    const awasResults = await searchServices("housing");
    expect(awasResults.some((s) => s.slug === "pm-awas-yojana")).toBe(true);

    const passportResults = await searchServices("passport");
    expect(passportResults.some((s) => s.slug === "passport")).toBe(true);
  });

  it("should filter search results by category", async () => {
    const examResults = await searchServices("service", { category: "EXAMINATION" });
    for (const r of examResults) {
      expect(r.category).toBe("EXAMINATION");
    }

    const schemeResults = await searchServices("", { category: "GOVERNMENT_SCHEME" });
    expect(schemeResults.length).toBeGreaterThanOrEqual(6);
    for (const r of schemeResults) {
      expect(r.category).toBe("GOVERNMENT_SCHEME");
    }
  });

  it("should filter search results by availability status", async () => {
    const supported = await searchServices("", { status: "SUPPORTED" });
    expect(supported.length).toBeGreaterThanOrEqual(50);
    for (const s of supported) {
      expect(s.availabilityStatus).toBe("SUPPORTED");
    }

    const comingSoon = await searchServices("", { status: "COMING_SOON" });
    expect(comingSoon.length).toBeGreaterThanOrEqual(1);
    for (const s of comingSoon) {
      expect(s.availabilityStatus).toBe("COMING_SOON");
    }
  });

  it("should filter search results by jurisdiction", async () => {
    const karnataka = await searchServices("", { jurisdiction: "Karnataka" });
    expect(karnataka.length).toBeGreaterThanOrEqual(4);
    for (const s of karnataka) {
      expect(s.jurisdiction?.toLowerCase()).toContain("karnataka");
    }
  });

  it("should return empty array for non-existent service query", async () => {
    const results = await searchServices("nonexistentqueryxyz9999");
    expect(results).toHaveLength(0);
  });

  it("should return all services when query is empty string", async () => {
    const all = await searchServices("");
    expect(all.length).toBeGreaterThanOrEqual(50);
  });
});

import { describe, it, expect } from "vitest";
import { prisma } from "../src/lib/prisma";
import {
  getServiceBySlug,
  getServiceByKey,
  getServiceByName,
  getServiceRequirement,
  getAllServices,
  getServicesByCategory,
  searchServices,
} from "../src/server/services/registry";

describe("Phase 9: Universal Service Registry", () => {
  it("retrieves services by slug across examinations, scholarships, and government services", async () => {
    const kcet = await getServiceBySlug("kcet", prisma);
    expect(kcet).not.toBeNull();
    expect(kcet?.serviceName).toBe("KCET");
    expect(kcet?.category).toBe("EXAMINATION");

    const jee = await getServiceBySlug("jee-main", prisma);
    expect(jee).not.toBeNull();
    expect(jee?.shortName).toBe("JEE Main");

    const neet = await getServiceBySlug("neet-ug", prisma);
    expect(neet).not.toBeNull();
    expect(neet?.serviceName).toBe("NEET UG");

    const upsc = await getServiceBySlug("upsc-civil-services", prisma);
    expect(upsc).not.toBeNull();
    expect(upsc?.authority).toBe("Union Public Service Commission");

    const nsp = await getServiceBySlug("nsp", prisma);
    expect(nsp).not.toBeNull();
    expect(nsp?.category).toBe("SCHOLARSHIP");

    const passport = await getServiceBySlug("passport", prisma);
    expect(passport).not.toBeNull();
    expect(passport?.category).toBe("GOVERNMENT_SERVICE");
  });

  it("retrieves services by serviceKey", async () => {
    const kcet = await getServiceByKey("KCET_APPLICATION", prisma);
    expect(kcet).not.toBeNull();
    expect(kcet?.slug).toBe("kcet");

    const jee = await getServiceByKey("JEE_MAIN_APPLICATION", prisma);
    expect(jee).not.toBeNull();
    expect(jee?.slug).toBe("jee-main");
  });

  it("retrieves services by display name and aliases", async () => {
    const upsc = await getServiceByName("UPSC Civil Services", prisma);
    expect(upsc).not.toBeNull();
    expect(upsc?.slug).toBe("upsc-civil-services");

    const ssp = await getServiceByName("State Scholarship Portal", prisma);
    expect(ssp).not.toBeNull();
    expect(ssp?.slug).toBe("ssp");
  });

  it("returns null for unknown services without throwing", async () => {
    const unknown = await getServiceBySlug("non-existent-exam-xyz", prisma);
    expect(unknown).toBeNull();

    const syncUnknown = getServiceRequirement("non-existent-exam-xyz");
    expect(syncUnknown).toBeNull();
  });

  it("lists all registered services with requirements metadata", async () => {
    const all = await getAllServices(prisma);
    expect(all.length).toBeGreaterThanOrEqual(15);
    expect(all.some((s) => s.slug === "kcet")).toBe(true);
    expect(all.some((s) => s.slug === "jee-main")).toBe(true);
    expect(all.some((s) => s.slug === "neet-ug")).toBe(true);
    expect(all.some((s) => s.slug === "passport")).toBe(true);
    expect(all.some((s) => s.slug === "state-police")).toBe(true);
    expect(all.some((s) => s.slug === "driving-license")).toBe(true);
  });

  it("filters services by category", async () => {
    const exams = await getServicesByCategory("EXAMINATION", prisma);
    expect(exams.length).toBeGreaterThanOrEqual(5);
    expect(exams.every((s) => s.category === "EXAMINATION")).toBe(true);

    const scholarships = await getServicesByCategory("SCHOLARSHIP", prisma);
    expect(scholarships.length).toBeGreaterThanOrEqual(2);
    expect(scholarships.every((s) => s.category === "SCHOLARSHIP")).toBe(true);

    const certs = await getServicesByCategory("CERTIFICATE", prisma);
    expect(certs.length).toBeGreaterThanOrEqual(2);
    expect(certs.every((s) => s.category === "CERTIFICATE")).toBe(true);
  });

  it("searches services with keyword and authority matching", async () => {
    const ntaMatches = await searchServices("National Testing Agency", undefined, prisma);
    expect(ntaMatches.length).toBeGreaterThanOrEqual(2);
    expect(ntaMatches.some((s) => s.slug === "jee-main" || s.slug === "neet-ug")).toBe(true);

    const cseMatches = await searchServices("civil services", undefined, prisma);
    expect(cseMatches.length).toBeGreaterThanOrEqual(1);
    expect(cseMatches.some((s) => s.slug === "upsc-civil-services")).toBe(true);
  });

  it("marks prototype availability statuses clearly (SUPPORTED, COMING_SOON, NOT_CURRENTLY_SUPPORTED)", async () => {
    const all = await getAllServices(prisma);
    const police = all.find((s) => s.slug === "state-police");
    expect(police?.availabilityStatus).toBe("COMING_SOON");

    const dl = all.find((s) => s.slug === "driving-license");
    expect(dl?.availabilityStatus).toBe("NOT_CURRENTLY_SUPPORTED");

    const kcet = all.find((s) => s.slug === "kcet");
    expect(kcet?.availabilityStatus).toBe("SUPPORTED");
  });
});

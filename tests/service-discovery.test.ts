import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import { getDemoUser } from "../src/server/vault";
import {
  getUserActivePreparations,
  addUserActivePreparation,
  removeUserActivePreparation,
} from "../src/server/services/active";
import { getAllServices, searchServices } from "../src/server/services/registry";

describe("Phase 9: Service Discovery & Active Preparation Management", () => {
  let demoUserId: string;

  beforeAll(async () => {
    const user = await getDemoUser(prisma);
    expect(user).toBeDefined();
    demoUserId = user.id;
  });

  describe("Service Discovery & Filtering", () => {
    it("returns all registered services with requirements breakdown", async () => {
      const services = await getAllServices(prisma);
      expect(services.length).toBeGreaterThanOrEqual(15);

      const kcet = services.find((s) => s.slug === "kcet");
      expect(kcet).toBeDefined();
      expect(kcet?.requiredDocumentsCount).toBeGreaterThanOrEqual(3);
      expect(kcet?.totalDocumentsCount).toBeGreaterThanOrEqual(5);
    });

    it("filters services by category properly", async () => {
      const exams = await searchServices("", { category: "EXAMINATION" }, prisma);
      expect(exams.length).toBeGreaterThanOrEqual(5);
      expect(exams.every((e) => e.category === "EXAMINATION")).toBe(true);

      const scholarships = await searchServices("", { category: "SCHOLARSHIP" }, prisma);
      expect(scholarships.length).toBeGreaterThanOrEqual(2);
      expect(scholarships.every((s) => s.category === "SCHOLARSHIP")).toBe(true);
    });

    it("searches services across names, keywords, and authorities", async () => {
      const upscQuery = await searchServices("UPSC", undefined, prisma);
      expect(upscQuery.length).toBeGreaterThanOrEqual(1);

      const stateQuery = await searchServices("Karnataka", undefined, prisma);
      expect(stateQuery.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Active Preparation Management", () => {
    it("retrieves seeded active preparations for demo user with readiness summary", async () => {
      const active = await getUserActivePreparations(demoUserId, prisma);
      expect(active.length).toBeGreaterThanOrEqual(1);
      expect(active.some((p) => p.slug === "kcet")).toBe(true);

      const kcetPrep = active.find((p) => p.slug === "kcet");
      expect(kcetPrep?.readinessSummary).toBeDefined();
      expect(kcetPrep?.readinessSummary?.requiredCount).toBeGreaterThanOrEqual(4);
    });

    it("adds a new active preparation for a user", async () => {
      const added = await addUserActivePreparation(demoUserId, "jee-main", prisma);
      expect(added).not.toBeNull();
      expect(added?.slug).toBe("jee-main");
      expect(added?.serviceName).toBe("JEE Main");
      expect(added?.readinessSummary).toBeDefined();

      const activeList = await getUserActivePreparations(demoUserId, prisma);
      expect(activeList.some((p) => p.slug === "jee-main")).toBe(true);
    });

    it("removes an active preparation cleanly", async () => {
      // Add and then remove
      await addUserActivePreparation(demoUserId, "gate", prisma);
      let active = await getUserActivePreparations(demoUserId, prisma);
      expect(active.some((p) => p.slug === "gate")).toBe(true);

      const removed = await removeUserActivePreparation(demoUserId, "gate", prisma);
      expect(removed).toBe(true);

      active = await getUserActivePreparations(demoUserId, prisma);
      expect(active.some((p) => p.slug === "gate")).toBe(false);
    });
  });
});

import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import { getServiceReadiness } from "../src/server/services/readiness";
import { getDemoUser } from "../src/server/vault";

describe("Phase 9: Universal Readiness Engine", () => {
  let demoUserId: string;

  beforeAll(async () => {
    const user = await getDemoUser(prisma);
    expect(user).toBeDefined();
    demoUserId = user.id;
  });

  it("evaluates JEE Main readiness for demo citizen (has ID + 10th + 12th)", async () => {
    const readiness = await getServiceReadiness(demoUserId, "jee-main", prisma);
    expect(readiness).not.toBeNull();
    expect(readiness?.serviceName).toBe("JEE Main");
    expect(readiness?.requiredCount).toBe(3); // Identity + 10th + 12th
    expect(readiness?.availableCount).toBe(3);
    expect(readiness?.missingCount).toBe(0);
    expect(readiness?.ready).toBe(true);
  });

  it("evaluates NEET UG readiness for demo citizen", async () => {
    const readiness = await getServiceReadiness(demoUserId, "neet-ug", prisma);
    expect(readiness).not.toBeNull();
    expect(readiness?.serviceName).toBe("NEET UG");
    expect(readiness?.requiredCount).toBe(3); // Identity + 10th + 12th
    expect(readiness?.availableCount).toBe(3);
    expect(readiness?.ready).toBe(true);
  });

  it("evaluates CUET UG readiness for demo citizen", async () => {
    const readiness = await getServiceReadiness(demoUserId, "cuet-ug", prisma);
    expect(readiness).not.toBeNull();
    expect(readiness?.serviceName).toBe("CUET UG");
    expect(readiness?.requiredCount).toBe(3);
    expect(readiness?.availableCount).toBe(3);
    expect(readiness?.ready).toBe(true);
  });

  it("evaluates UPSC CSE readiness for demo citizen (missing degree certificate)", async () => {
    const readiness = await getServiceReadiness(demoUserId, "upsc-civil-services", prisma);
    expect(readiness).not.toBeNull();
    expect(readiness?.serviceName).toBe("UPSC Civil Services");
    expect(readiness?.requiredCount).toBe(3); // Identity + 10th + Degree
    expect(readiness?.ready).toBe(false);
    expect(readiness?.missingCount).toBe(1);

    const missingDoc = readiness?.documents.find((d) => d.status === "MISSING");
    expect(missingDoc?.documentType).toBe("DEGREE_CERTIFICATE");
  });

  it("evaluates Passport application readiness for demo citizen (has ID + 10th + Address proof)", async () => {
    const readiness = await getServiceReadiness(demoUserId, "passport", prisma);
    expect(readiness).not.toBeNull();
    expect(readiness?.serviceName).toBe("Passport");
    expect(readiness?.requiredCount).toBe(3); // Identity + 10th + Address
    expect(readiness?.availableCount).toBe(3);
    expect(readiness?.missingCount).toBe(0);
    expect(readiness?.ready).toBe(true);
  });

  it("evaluates EPFO PF Transfer readiness for demo citizen", async () => {
    const readiness = await getServiceReadiness(demoUserId, "epfo", prisma);
    expect(readiness).not.toBeNull();
    expect(readiness?.serviceName).toBe("EPFO PF Transfer");
    expect(readiness?.requiredCount).toBe(1); // Identity proof
    expect(readiness?.availableCount).toBe(1);
    expect(readiness?.ready).toBe(true);
  });

  it("evaluates KCET readiness for demo citizen (missing income certificate)", async () => {
    const readiness = await getServiceReadiness(demoUserId, "kcet", prisma);
    expect(readiness).not.toBeNull();
    expect(readiness?.serviceName).toBe("KCET");
    expect(readiness?.requiredCount).toBe(4);
    expect(readiness?.availableCount).toBe(3);
    expect(readiness?.missingCount).toBe(1);
    expect(readiness?.ready).toBe(false);

    const missingDoc = readiness?.documents.find((d) => d.required && d.status === "MISSING");
    expect(missingDoc?.documentType).toBe("INCOME_CERTIFICATE");
  });
});

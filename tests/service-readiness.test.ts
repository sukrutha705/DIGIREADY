import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import { getServiceRequirement, getAllServiceRequirements } from "../src/server/services/registry";
import { getServiceReadiness } from "../src/server/services/readiness";
import { getDemoUser } from "../src/server/vault";
import { classifyIntent } from "../src/server/assistant/classifier";
import { IntentTypes } from "../src/server/assistant/types";

describe("Phase 7.2: Service Requirement & Document Readiness Engine", () => {
  let demoUserId: string;

  beforeAll(async () => {
    const user = await getDemoUser(prisma);
    expect(user).toBeDefined();
    demoUserId = user.id;
  });

  describe("Service Requirement Registry", () => {
    it("retrieves known service requirements by exact name", () => {
      const kcet = getServiceRequirement("KCET");
      expect(kcet).not.toBeNull();
      expect(kcet?.serviceId).toBe("kcet");
      expect(kcet?.requiredDocuments.length).toBeGreaterThanOrEqual(4);
    });

    it("retrieves service requirements case-insensitively", () => {
      const kcetLower = getServiceRequirement("kcet");
      const kcetUpper = getServiceRequirement("KCET");
      expect(kcetLower).toEqual(kcetUpper);
    });

    it("resolves service requirements by known aliases", () => {
      const cetAlias = getServiceRequirement("karnataka cet");
      expect(cetAlias?.serviceId).toBe("kcet");

      const scholAlias = getServiceRequirement("scholarship application");
      expect(scholAlias?.serviceId).toBe("scholarship");

      const pfAlias = getServiceRequirement("pf transfer");
      expect(pfAlias?.serviceId).toBe("epfo");
    });

    it("returns null for unknown services without throwing", () => {
      const unknown = getServiceRequirement("NON_EXISTENT_EXAM_999");
      expect(unknown).toBeNull();
    });

    it("lists all registered demo service requirements", () => {
      const all = getAllServiceRequirements();
      expect(all.length).toBeGreaterThanOrEqual(6);
      expect(all.some((s) => s.serviceId === "kcet")).toBe(true);
      expect(all.some((s) => s.serviceId === "passport")).toBe(true);
    });
  });

  describe("Readiness Engine: getServiceReadiness", () => {
    it("evaluates KCET readiness for demo citizen (missing income certificate)", async () => {
      const readiness = await getServiceReadiness(demoUserId, "KCET", prisma);

      expect(readiness).not.toBeNull();
      expect(readiness?.serviceName).toBe("KCET");
      expect(readiness?.requiredCount).toBe(4); // Govt ID, 10th, 12th, Income Cert
      expect(readiness?.availableCount).toBe(3); // Demo user has Govt ID, 10th, 12th
      expect(readiness?.missingCount).toBe(1); // Income Cert is missing
      expect(readiness?.ready).toBe(false);

      const incomeDoc = readiness?.documents.find((d) => d.documentType === "INCOME_CERTIFICATE");
      expect(incomeDoc?.status).toBe("MISSING");

      const govtIdDoc = readiness?.documents.find((d) => d.documentType === "GOVERNMENT_IDENTITY_PROOF");
      expect(govtIdDoc?.status).toBe("AVAILABLE");
      expect(govtIdDoc?.documentId).toBeDefined();
    });

    it("evaluates Income Certificate application readiness for demo citizen (all required available)", async () => {
      const readiness = await getServiceReadiness(demoUserId, "Income Certificate", prisma);

      expect(readiness).not.toBeNull();
      expect(readiness?.serviceName).toBe("Income Certificate");
      expect(readiness?.requiredCount).toBe(2); // Govt ID, Address Proof
      expect(readiness?.availableCount).toBe(2);
      expect(readiness?.missingCount).toBe(0);
      expect(readiness?.ready).toBe(true);
    });

    it("evaluates Passport application readiness for demo citizen", async () => {
      const readiness = await getServiceReadiness(demoUserId, "Passport", prisma);

      expect(readiness).not.toBeNull();
      expect(readiness?.serviceName).toBe("Passport");
      expect(readiness?.requiredCount).toBe(3); // Govt ID, 10th marks card, Address proof
      expect(readiness?.availableCount).toBe(3);
      expect(readiness?.missingCount).toBe(0);
      expect(readiness?.ready).toBe(true);
    });

    it("returns null when evaluating readiness for an unknown service", async () => {
      const readiness = await getServiceReadiness(demoUserId, "UNKNOWN_SERVICE", prisma);
      expect(readiness).toBeNull();
    });
  });

  describe("Assistant Intent & Routing Separation", () => {
    it("classifies 'I want to apply for KCET' as APPLY_FOR_SERVICE with KCET entity", () => {
      const intent = classifyIntent("I want to apply for KCET");
      expect(intent.intent).toBe(IntentTypes.APPLY_FOR_SERVICE);
      expect(intent.service).toBe("KCET");
    });

    it("classifies document check queries separately without service requirement routing", () => {
      const intent = classifyIntent("Do I have my income certificate?");
      expect(intent.intent).toBe(IntentTypes.CHECK_DOCUMENT);
      expect(intent.document).toBe("income certificate");
      expect(intent.service).toBeUndefined();
    });

    it("handles apply query without service entity gracefully", () => {
      const intent = classifyIntent("I want to apply for something");
      expect(intent.intent).toBe(IntentTypes.APPLY_FOR_SERVICE);
      expect(intent.service).toBeUndefined();
    });
  });
});

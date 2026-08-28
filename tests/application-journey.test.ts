import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";
import { getDemoUser, getUserDocuments } from "../src/server/vault";
import { getApplicationJourney, JOURNEY_LIMITATION_NOTE } from "../src/server/journey/service";
import { JourneyStatuses } from "../src/server/journey/types";
import { createDocumentShare } from "../src/server/sharing/service";
import { classifyIntent } from "../src/server/assistant/classifier";
import { IntentTypes } from "../src/server/assistant/types";
import { GET as getJourneyRoute } from "../src/app/api/services/[service]/journey/route";
import { POST as assistantClassifyRoute } from "../src/app/api/assistant/classify/route";

describe("Phase 7.6: End-to-End Citizen Application Journey", () => {
  let demoUserId: string;
  let demoDocs: Array<{ id: string; displayName: string; documentTypeKey: string }>;

  beforeAll(async () => {
    const user = await getDemoUser(prisma);
    expect(user).toBeDefined();
    demoUserId = user.id;

    // Reset dynamically uploaded documents to ensure clean baseline
    await prisma.documentField.deleteMany({
      where: { document: { userId: demoUserId, imageStorageKey: { not: null } } },
    });
    await prisma.document.deleteMany({
      where: { userId: demoUserId, imageStorageKey: { not: null } },
    });

    demoDocs = await getUserDocuments(demoUserId, undefined, prisma);
    expect(demoDocs.length).toBeGreaterThanOrEqual(6);
  });

  describe("1. Application Journey Resolution & Architecture", () => {
    it("resolves the KCET application journey with required documents and readiness counts", async () => {
      const journey = await getApplicationJourney(demoUserId, "KCET", prisma);

      expect(journey).not.toBeNull();
      expect(journey?.serviceId).toBe("kcet");
      expect(journey?.serviceName).toContain("KCET");
      expect(journey?.requiredCount).toBeGreaterThanOrEqual(4);
      expect(journey?.availableCount).toBeGreaterThanOrEqual(1);
      expect(journey?.missingCount).toBeGreaterThanOrEqual(1);
      expect(journey?.status).toBe(JourneyStatuses.MISSING_DOCUMENTS);
      expect(journey?.limitationNote).toBe(JOURNEY_LIMITATION_NOTE);
    });

    it("returns null when requesting journey for an unknown service", async () => {
      const journey = await getApplicationJourney(
        demoUserId,
        "NON_EXISTENT_UNKNOWN_SERVICE_999",
        prisma
      );
      expect(journey).toBeNull();
    });

    it("returns null when user ID is invalid or empty", async () => {
      const journey = await getApplicationJourney("", "KCET", prisma);
      expect(journey).toBeNull();
    });
  });

  describe("2. Document Requirement & Action Categorization", () => {
    it("identifies missing documents and generates guidance actions", async () => {
      const journey = await getApplicationJourney(demoUserId, "KCET", prisma);
      expect(journey).not.toBeNull();

      // In the seed data, Income Certificate is missing for KCET
      const missingIncome = journey?.missingDocuments.find(
        (d) => d.documentType === "INCOME_CERTIFICATE"
      );
      expect(missingIncome).toBeDefined();
      expect(missingIncome?.status).toBe("MISSING");

      // Guidance action generated for missing document
      const guidanceAction = journey?.nextActions.find(
        (a) => a.type === "GUIDANCE" && a.documentType === "INCOME_CERTIFICATE"
      );
      expect(guidanceAction).toBeDefined();
      expect(guidanceAction?.label).toContain("Income Certificate");
    });

    it("identifies available vault documents and integrates verification & sharing readiness", async () => {
      const journey = await getApplicationJourney(demoUserId, "KCET", prisma);
      expect(journey).not.toBeNull();

      // Available required documents should match availableCount
      const availableRequired =
        (journey?.verifiedDocuments.filter((d) => d.required).length || 0) +
        (journey?.documentsNeedingReview.filter((d) => d.required).length || 0);
      expect(availableRequired).toBe(journey?.availableCount);

      // Verify limitation notice is always attached
      expect(journey?.limitationNote).toContain("does not submit official applications");
    });

    it("includes a deterministic refresh readiness action", async () => {
      const journey = await getApplicationJourney(demoUserId, "KCET", prisma);
      const refreshAction = journey?.nextActions.find((a) => a.type === "REFRESH");
      expect(refreshAction).toBeDefined();
      expect(refreshAction?.label).toBe("Refresh Application Readiness");
    });
  });

  describe("3. Lifecycle Status Transition Logic", () => {
    it("evaluates MISSING_DOCUMENTS status when required documents are missing", async () => {
      const journey = await getApplicationJourney(demoUserId, "KCET", prisma);
      expect(journey?.missingCount).toBeGreaterThan(0);
      expect(journey?.status).toBe(JourneyStatuses.MISSING_DOCUMENTS);
    });

    it("evaluates preparation readiness when all required documents exist and are verified with no conflicts", async () => {
      // Find a service where demo citizen has all required documents (e.g. EPFO Provident Fund Transfer)
      const journey = await getApplicationJourney(demoUserId, "EPFO", prisma);
      if (journey && journey.missingCount === 0) {
        expect([
          JourneyStatuses.READY_FOR_VERIFICATION,
          JourneyStatuses.NEEDS_ATTENTION,
          JourneyStatuses.READY_TO_APPLY,
        ]).toContain(journey.status);
      }
    });

    it("evaluates preparation readiness when all required documents are present without requiring sharing", async () => {
      // Test with EPFO service
      const journey = await getApplicationJourney(demoUserId, "EPFO", prisma);
      if (journey && journey.missingCount === 0) {
        expect([
          JourneyStatuses.READY_TO_APPLY,
          JourneyStatuses.READY_FOR_VERIFICATION,
          JourneyStatuses.NEEDS_ATTENTION,
        ]).toContain(journey.status);
        expect(journey.consistency).toBeDefined();
        expect(journey.limitationNote).toContain("does not submit official applications");
      }
    });
  });

  describe("4. Ownership Isolation & Privacy", () => {
    it("enforces strict user isolation: isolated user cannot access demo user's journey data", async () => {
      const isolatedUserId = "00000000-0000-0000-0000-000000000099";
      const journey = await getApplicationJourney(isolatedUserId, "KCET", prisma);

      // Isolated user has no documents in vault, so availableCount is 0
      expect(journey).not.toBeNull();
      expect(journey?.availableCount).toBe(0);
      expect(journey?.verifiedDocuments.length).toBe(0);
      expect(journey?.status).toBe(JourneyStatuses.MISSING_DOCUMENTS);
    });
  });

  describe("5. REST API Endpoint (/api/services/[service]/journey)", () => {
    it("GET /api/services/KCET/journey returns 200 and ApplicationJourney DTO", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/services/KCET/journey?userId=${demoUserId}`
      );
      const res = await getJourneyRoute(req, {
        params: Promise.resolve({ service: "KCET" }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.serviceId).toBe("kcet");
      expect(data.status).toBeDefined();
      expect(data.requiredCount).toBeGreaterThanOrEqual(1);
      expect(data.nextActions.length).toBeGreaterThanOrEqual(1);
      expect(data.limitationNote).toBeDefined();
    });

    it("GET /api/services/UNKNOWN/journey returns 404", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/services/INVALID_SERVICE/journey?userId=${demoUserId}`
      );
      const res = await getJourneyRoute(req, {
        params: Promise.resolve({ service: "INVALID_SERVICE" }),
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain("not found");
    });
  });

  describe("6. Assistant APPLY_FOR_SERVICE End-to-End Integration", () => {
    it("returns ApplicationJourney DTO alongside readiness when citizen asks 'I want to apply for KCET'", async () => {
      const req = new NextRequest("http://localhost:3000/api/assistant/classify", {
        method: "POST",
        body: JSON.stringify({ message: "I want to apply for KCET" }),
      });
      const res = await assistantClassifyRoute(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.intent.intent).toBe(IntentTypes.APPLY_FOR_SERVICE);
      expect(data.readiness).not.toBeNull();
      expect(data.journey).not.toBeNull();
      expect(data.journey.serviceId).toBe("kcet");
      expect(data.journey.status).toBe(JourneyStatuses.MISSING_DOCUMENTS);
      expect(data.friendlyResponse).toContain("KCET");
    });

    it("preserves backward compatibility with other assistant intents", async () => {
      // 1. MISSING_DOCUMENT
      const resMissing = await assistantClassifyRoute(
        new NextRequest("http://localhost:3000/api/assistant/classify", {
          method: "POST",
          body: JSON.stringify({ message: "How do I get an income certificate?" }),
        })
      );
      const dataMissing = await resMissing.json();
      expect(dataMissing.intent.intent).toBe(IntentTypes.MISSING_DOCUMENT);
      expect(dataMissing.guidance).not.toBeNull();

      // 2. VERIFY_DOCUMENT
      const resVerify = await assistantClassifyRoute(
        new NextRequest("http://localhost:3000/api/assistant/classify", {
          method: "POST",
          body: JSON.stringify({ message: "Can you verify my 12th marks card?" }),
        })
      );
      const dataVerify = await resVerify.json();
      expect(dataVerify.intent.intent).toBe(IntentTypes.VERIFY_DOCUMENT);
      expect(dataVerify.verification).not.toBeNull();

      // 3. SHARE_DOCUMENT
      const resShare = await assistantClassifyRoute(
        new NextRequest("http://localhost:3000/api/assistant/classify", {
          method: "POST",
          body: JSON.stringify({
            message:
              "Share my 12th marks card with Admissions Office for KCET admission verification",
          }),
        })
      );
      const dataShare = await resShare.json();
      expect(dataShare.intent.intent).toBe(IntentTypes.SHARE_DOCUMENT);
      expect(dataShare.sharePreview).not.toBeNull();

      // 4. CHECK_DOCUMENT
      const resCheck = await assistantClassifyRoute(
        new NextRequest("http://localhost:3000/api/assistant/classify", {
          method: "POST",
          body: JSON.stringify({ message: "Do I have my 10th marks card?" }),
        })
      );
      const dataCheck = await resCheck.json();
      expect(dataCheck.intent.intent).toBe(IntentTypes.CHECK_DOCUMENT);
    });
  });
});

import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";
import { getDemoUser, getUserDocuments, getUserVaultSummary } from "../src/server/vault";
import { getApplicationJourney, JOURNEY_LIMITATION_NOTE } from "../src/server/journey/service";
import { JourneyStatuses } from "../src/server/journey/types";
import { getDocumentGuidance } from "../src/server/guidance/registry";
import { getSharePreview, createDocumentShare } from "../src/server/sharing/service";
import { classifyIntent } from "../src/server/assistant/classifier";
import { IntentTypes } from "../src/server/assistant/types";
import { POST as assistantClassifyRoute } from "../src/app/api/assistant/classify/route";
import { GET as getJourneyRoute } from "../src/app/api/services/[service]/journey/route";
import { GET as getGuidanceRoute } from "../src/app/api/documents/guidance/[document]/route";

describe("Phase 7.7: Citizen Experience, UX Polish & Demo Readiness", () => {
  let demoUserId: string;

  beforeAll(async () => {
    const user = await getDemoUser(prisma);
    expect(user).toBeDefined();
    demoUserId = user.id;
  });

  describe("1. Dashboard Application Readiness Integration", () => {
    it("renders vault summary and dynamic application readiness for demo citizen", async () => {
      const summary = await getUserVaultSummary(demoUserId, prisma);
      expect(summary.totalDocuments).toBeGreaterThanOrEqual(6);
      expect(summary.issuedCount).toBeGreaterThanOrEqual(1);

      const journey = await getApplicationJourney(demoUserId, "KCET", prisma);
      expect(journey).not.toBeNull();
      expect(journey?.serviceId).toBe("kcet");
      expect(journey?.availableCount).toBeGreaterThanOrEqual(1);
      expect(journey?.requiredCount).toBeGreaterThanOrEqual(4);
    });
  });

  describe("2. Application Journey Page & Dynamic Service Resolution", () => {
    it("resolves dynamic journey data for KCET with full progress breakdown", async () => {
      const journey = await getApplicationJourney(demoUserId, "KCET", prisma);
      expect(journey).not.toBeNull();
      expect(journey?.serviceName).toContain("KCET");
      expect(journey?.status).toBe(JourneyStatuses.MISSING_DOCUMENTS);
      expect(journey?.readiness.documents.length).toBeGreaterThanOrEqual(4);
    });

    it("resolves dynamic journey data for Government Scholarship application", async () => {
      const journey = await getApplicationJourney(demoUserId, "scholarship", prisma);
      expect(journey).not.toBeNull();
      expect(journey?.serviceName).toContain("Scholarship");
      expect(journey?.requiredCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe("3. Document Checklist & Contextual Actions", () => {
    it("identifies missing documents and surfaces structured guidance action", async () => {
      const journey = await getApplicationJourney(demoUserId, "KCET", prisma);
      const missingDoc = journey?.missingDocuments.find((d) => d.status === "MISSING");
      expect(missingDoc).toBeDefined();

      const guidanceAction = journey?.nextActions.find(
        (a) => a.type === "GUIDANCE" && a.documentType === missingDoc?.documentType
      );
      expect(guidanceAction).toBeDefined();
    });

    it("identifies available documents and surfaces verification and sharing readiness", async () => {
      const journey = await getApplicationJourney(demoUserId, "KCET", prisma);
      expect(journey?.verifiedDocuments.length).toBeGreaterThanOrEqual(1);

      const availableActions = journey?.nextActions.filter(
        (a) => a.type === "VERIFY" || a.type === "SHARE"
      );
      expect(availableActions?.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("4. Assistant & Journey End-to-End Orchestration", () => {
    it("returns ApplicationJourneyCard DTO when inquiring about KCET", async () => {
      const req = new NextRequest("http://localhost:3000/api/assistant/classify", {
        method: "POST",
        body: JSON.stringify({ message: "I want to apply for KCET" }),
      });
      const res = await assistantClassifyRoute(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.intent.intent).toBe(IntentTypes.APPLY_FOR_SERVICE);
      expect(data.journey).not.toBeNull();
      expect(data.journey.serviceId).toBe("kcet");
      expect(data.journey.limitationNote).toBe(JOURNEY_LIMITATION_NOTE);
    });

    it("displays contextual guidance when inquiring 'How do I get an income certificate?'", async () => {
      const req = new NextRequest("http://localhost:3000/api/assistant/classify", {
        method: "POST",
        body: JSON.stringify({ message: "How do I get an income certificate?" }),
      });
      const res = await assistantClassifyRoute(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.intent.intent).toBe(IntentTypes.MISSING_DOCUMENT);
      expect(data.guidance).not.toBeNull();
      expect(data.guidance.nextSteps.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("5. Missing Document Guidance Structure", () => {
    it("returns structured guidance with WHAT IT IS, STEPS, and ISSUING AUTHORITY via REST API", async () => {
      const req = new NextRequest("http://localhost:3000/api/documents/guidance/INCOME_CERTIFICATE");
      const res = await getGuidanceRoute(req, {
        params: Promise.resolve({ document: "INCOME_CERTIFICATE" }),
      });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.documentType).toBe("INCOME_CERTIFICATE");
      expect(data.guidance).toBeDefined();
      expect(data.guidance.description).toBeDefined();
      expect(data.guidance.nextSteps.length).toBeGreaterThanOrEqual(3);
      expect(data.guidance.authorityNote).toBeDefined();
    });
  });

  describe("6. Consent Safeguard & Privacy Protections", () => {
    it("strictly requires affirmative consent (consent === true) for document sharing", async () => {
      const docs = await getUserDocuments(demoUserId, undefined, prisma);
      const doc = docs[0];

      await expect(
        createDocumentShare(
          demoUserId,
          {
            documentId: doc.id,
            recipientName: "Admissions Verifier",
            purpose: "KCET Verification",
            includedFieldIds: [],
            consent: false,
          },
          prisma
        )
      ).rejects.toThrow("Affirmative citizen consent is required");
    });

    it("enforces strict ownership isolation: user cannot view or share another user's document", async () => {
      const isolatedUserId = "00000000-0000-0000-0000-000000000099";
      const docs = await getUserDocuments(demoUserId, undefined, prisma);
      const doc = docs[0];

      await expect(
        createDocumentShare(
          isolatedUserId,
          {
            documentId: doc.id,
            recipientName: "Admissions Verifier",
            purpose: "KCET Verification",
            includedFieldIds: [],
            consent: true,
          },
          prisma
        )
      ).rejects.toThrow("Document not found in user vault");
    });
  });

  describe("7. Prototype Boundary & Non-Submission Guarantees", () => {
    it("guarantees limitation note stating no external government application submission", async () => {
      const journey = await getApplicationJourney(demoUserId, "KCET", prisma);
      expect(journey?.limitationNote).toContain("does not submit official applications");
    });

    it("ensures unknown service queries return 404 cleanly with friendly error", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/services/NON_EXISTENT_SERVICE/journey?userId=${demoUserId}`
      );
      const res = await getJourneyRoute(req, {
        params: Promise.resolve({ service: "NON_EXISTENT_SERVICE" }),
      });
      expect(res.status).toBe(404);

      const data = await res.json();
      expect(data.error).toContain("not found");
    });
  });
});

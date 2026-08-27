import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";
import { getDemoUser, getUserDocuments, getUserVaultSummary } from "../src/server/vault";
import { getApplicationJourney, JOURNEY_LIMITATION_NOTE } from "../src/server/journey/service";
import { JourneyStatuses } from "../src/server/journey/types";
import { createDocumentShare, getDocumentShareByToken, revokeDocumentShare } from "../src/server/sharing/service";
import { POST as demoResetRoute } from "../src/app/api/demo/reset/route";
import { GET as getJourneyRoute } from "../src/app/api/services/[service]/journey/route";
import { POST as assistantClassifyRoute } from "../src/app/api/assistant/classify/route";
import { GET as getShareTokenRoute } from "../src/app/api/shares/[token]/route";
import { POST as revokeShareRoute } from "../src/app/api/shares/[token]/revoke/route";
import { GET as getGuidanceRoute } from "../src/app/api/documents/guidance/[document]/route";

describe("Phase 7.9: Final Product Polish, Visual Consistency & Submission Readiness", () => {
  let demoUserId: string;

  beforeAll(async () => {
    const user = await getDemoUser(prisma);
    expect(user).toBeDefined();
    demoUserId = user.id;
  });

  describe("1. Demo Mode Route & Reset Determinism", () => {
    it("safely resets demo state and restores clean starting baseline", async () => {
      // Create a test share
      const docs = await getUserDocuments(demoUserId, undefined, prisma);
      await createDocumentShare(
        demoUserId,
        {
          documentId: docs[0].id,
          recipientName: "Admissions Verification",
          purpose: "Demo Reset Test",
          includedFieldIds: [],
          consent: true,
        },
        prisma
      );

      // Trigger reset
      const res = await demoResetRoute();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      // Verify baseline
      const journey = await getApplicationJourney(demoUserId, "KCET", prisma);
      expect(journey?.serviceId).toBe("kcet");
      expect(journey?.requiredCount).toBe(4);
      expect(journey?.availableCount).toBe(3);
      expect(journey?.missingCount).toBe(1);
      expect(journey?.status).toBe(JourneyStatuses.MISSING_DOCUMENTS);
    });
  });

  describe("2. Dashboard & Journey Route Integrity", () => {
    it("ensures dashboard summary matches application readiness", async () => {
      const summary = await getUserVaultSummary(demoUserId, prisma);
      const journey = await getApplicationJourney(demoUserId, "KCET", prisma);

      expect(summary.totalDocuments).toBeGreaterThanOrEqual(6);
      expect(journey?.availableCount).toBe(3);
      expect(journey?.missingCount).toBe(1);
    });

    it("GET /api/services/kcet/journey returns 200 with full DTO", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/services/kcet/journey?userId=${demoUserId}`
      );
      const res = await getJourneyRoute(req, {
        params: Promise.resolve({ service: "kcet" }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.serviceId).toBe("kcet");
      expect(data.nextActions.length).toBeGreaterThanOrEqual(1);
    });

    it("GET /api/services/UNKNOWN/journey returns 404 with safe error", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/services/UNKNOWN_NON_EXISTENT/journey?userId=${demoUserId}`
      );
      const res = await getJourneyRoute(req, {
        params: Promise.resolve({ service: "UNKNOWN_NON_EXISTENT" }),
      });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBeDefined();
      expect(data.error).not.toContain("Prisma");
    });
  });

  describe("3. Assistant Error Resilience & Intent Preservation", () => {
    it("processes 'I want to apply for KCET' returning journey, readiness, and natural response", async () => {
      const req = new NextRequest("http://localhost:3000/api/assistant/classify", {
        method: "POST",
        body: JSON.stringify({ message: "I want to apply for KCET" }),
      });
      const res = await assistantClassifyRoute(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.intent.intent).toBe("APPLY_FOR_SERVICE");
      expect(data.journey).not.toBeNull();
      expect(data.readiness).not.toBeNull();
      expect(data.friendlyResponse).toContain("KCET");
    });

    it("handles unexpected inquiries gracefully without errors", async () => {
      const req = new NextRequest("http://localhost:3000/api/assistant/classify", {
        method: "POST",
        body: JSON.stringify({ message: "Can you fly a rocket to Mars?" }),
      });
      const res = await assistantClassifyRoute(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.friendlyResponse).toBeDefined();
      expect(data.suggestions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("4. Security, Consent & Share Token Boundaries", () => {
    it("enforces mandatory affirmative consent, non-guessable tokens, view-only scope, and revocability", async () => {
      const docs = await getUserDocuments(demoUserId, undefined, prisma);
      const doc = docs.find((d) => d.fields.length > 0) || docs[0];

      // Missing consent fails
      await expect(
        createDocumentShare(
          demoUserId,
          {
            documentId: doc.id,
            recipientName: "Admissions Verifier",
            purpose: "KCET Admission",
            includedFieldIds: [],
            consent: false,
          },
          prisma
        )
      ).rejects.toThrow("Affirmative citizen consent is required");

      // Valid share with consent
      const share = await createDocumentShare(
        demoUserId,
        {
          documentId: doc.id,
          recipientName: "Admissions Verifier",
          purpose: "KCET Admission",
          includedFieldIds: doc.fields.slice(0, 1).map((f) => f.id),
          consent: true,
        },
        prisma
      );

      expect(share.shareToken).toMatch(/^dr_share_[a-f0-9]{32,}$/);
      expect(share.permissions.canView).toBe(true);
      expect(share.permissions.canDownload).toBe(false);

      // Token inspection before revocation
      const activeGrant = await getDocumentShareByToken(share.shareToken, prisma);
      expect(activeGrant?.status).toBe("ACTIVE");
      expect(activeGrant?.sharedFields.length).toBe(1);

      // Revoke token
      await revokeDocumentShare(demoUserId, share.id, prisma);

      // Token inspection after revocation -> 0 fields exposed
      const revokedGrant = await getDocumentShareByToken(share.shareToken, prisma);
      expect(revokedGrant?.status).toBe("REVOKED");
      expect(revokedGrant?.sharedFields.length).toBe(0);

      // Cleanup
      await prisma.documentShare.delete({ where: { id: share.id } });
    });

    it("enforces strict user isolation across sharing and vault queries", async () => {
      const isolatedUserId = "00000000-0000-0000-0000-000000000077";
      const docs = await getUserDocuments(demoUserId, undefined, prisma);

      await expect(
        createDocumentShare(
          isolatedUserId,
          {
            documentId: docs[0].id,
            recipientName: "Admissions Verifier",
            purpose: "KCET Admission",
            includedFieldIds: [],
            consent: true,
          },
          prisma
        )
      ).rejects.toThrow("Document not found in user vault");
    });
  });

  describe("5. Prototype Non-Submission Boundaries", () => {
    it("guarantees limitation note stating no external government application submission", async () => {
      const journey = await getApplicationJourney(demoUserId, "KCET", prisma);
      expect(journey?.limitationNote).toBe(JOURNEY_LIMITATION_NOTE);
      expect(journey?.limitationNote).toContain("does not submit official applications");
      expect(journey?.status).not.toBe("APPLICATION_SUBMITTED");
    });

    it("returns structured guidance for missing documents without fabricated statutory claims", async () => {
      const req = new NextRequest("http://localhost:3000/api/documents/guidance/INCOME_CERTIFICATE");
      const res = await getGuidanceRoute(req, {
        params: Promise.resolve({ document: "INCOME_CERTIFICATE" }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.guidance.nextSteps.length).toBeGreaterThanOrEqual(3);
      expect(data.guidance.authorityNote).toBeDefined();
    });
  });
});

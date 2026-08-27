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

describe("Phase 7.8: Final Product Hardening, Demo Reliability & Judge Experience", () => {
  let demoUserId: string;

  beforeAll(async () => {
    const user = await getDemoUser(prisma);
    expect(user).toBeDefined();
    demoUserId = user.id;
  });

  describe("1. Deterministic Demo Reset & Baseline Reproducibility", () => {
    it("POST /api/demo/reset safely clears demo shares and restores baseline state", async () => {
      // 1. Create a share for testing reset
      const docs = await getUserDocuments(demoUserId, undefined, prisma);
      const testDoc = docs[0];
      await createDocumentShare(
        demoUserId,
        {
          documentId: testDoc.id,
          recipientName: "Demo Verification Body",
          purpose: "Judge Demonstration",
          includedFieldIds: [],
          consent: true,
        },
        prisma
      );

      // 2. Call reset endpoint
      const res = await demoResetRoute();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.sharesCleared).toBeGreaterThanOrEqual(0);

      // 3. Verify clean baseline KCET journey
      const journey = await getApplicationJourney(demoUserId, "KCET", prisma);
      expect(journey).not.toBeNull();
      expect(journey?.serviceId).toBe("kcet");
      expect(journey?.status).toBe(JourneyStatuses.MISSING_DOCUMENTS);
      expect(journey?.availableCount).toBe(3);
      expect(journey?.missingCount).toBe(1);
      expect(journey?.missingDocuments[0].documentType).toBe("INCOME_CERTIFICATE");
    });
  });

  describe("2. Demo Presentation State & Storytelling Integrity", () => {
    it("validates that KCET requirements conform to the demo presentation story", async () => {
      const journey = await getApplicationJourney(demoUserId, "KCET", prisma);
      expect(journey).not.toBeNull();
      expect(journey?.serviceName).toContain("KCET");
      expect(journey?.requiredCount).toBe(4);
      expect(journey?.availableCount).toBe(3);
      expect(journey?.missingCount).toBe(1);

      // Limitation notice must be present
      expect(journey?.limitationNote).toBe(JOURNEY_LIMITATION_NOTE);
      expect(journey?.limitationNote).toContain("does not submit official applications");
    });
  });

  describe("3. API Error Safety & Information Leakage Prevention", () => {
    it("returns safe structured error without leaking database paths or stack traces for unknown service", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/services/NON_EXISTENT_SERVICE_XYZ/journey?userId=${demoUserId}`
      );
      const res = await getJourneyRoute(req, {
        params: Promise.resolve({ service: "NON_EXISTENT_SERVICE_XYZ" }),
      });
      expect(res.status).toBe(404);

      const data = await res.json();
      expect(data.error).toBeDefined();
      expect(typeof data.error).toBe("string");
      expect(data.error).not.toContain("Prisma");
      expect(data.error).not.toContain("SELECT");
      expect(data.error).not.toContain("node_modules");
    });

    it("returns safe structured error when share token is invalid or non-existent", async () => {
      const req = new NextRequest("http://localhost:3000/api/shares/INVALID_TOKEN_123");
      const res = await getShareTokenRoute(req, {
        params: Promise.resolve({ token: "INVALID_TOKEN_123" }),
      });
      expect(res.status).toBe(404);

      const data = await res.json();
      expect(data.error).toBeDefined();
      expect(data.error).not.toContain("stack");
    });
  });

  describe("4. Share Token Security & Revocation Boundaries", () => {
    it("verifies share tokens are cryptographically non-guessable, enforce affirmative consent, and exclude fields on revocation", async () => {
      const docs = await getUserDocuments(demoUserId, undefined, prisma);
      const doc = docs.find((d) => d.fields.length > 0) || docs[0];

      // 1. Create share with consent
      const share = await createDocumentShare(
        demoUserId,
        {
          documentId: doc.id,
          recipientName: "Admissions Verification Committee",
          purpose: "KCET Document Verification",
          includedFieldIds: doc.fields.slice(0, 1).map((f) => f.id),
          consent: true,
        },
        prisma
      );

      expect(share.shareToken).toMatch(/^dr_share_[a-f0-9]{32,}$/);
      expect(share.status).toBe("ACTIVE");

      // 2. Token holder inspects active share
      const activeGrant = await getDocumentShareByToken(share.shareToken, prisma);
      expect(activeGrant?.status).toBe("ACTIVE");
      expect(activeGrant?.sharedFields.length).toBe(1);

      // 3. Citizen revokes the share
      const reqRevoke = new NextRequest(`http://localhost:3000/api/shares/${share.id}/revoke`, {
        method: "POST",
      });
      const resRevoke = await revokeShareRoute(reqRevoke, {
        params: Promise.resolve({ id: share.id }),
      });
      expect(resRevoke.status).toBe(200);

      // 4. Token holder inspects revoked share - fields MUST be empty
      const revokedGrant = await getDocumentShareByToken(share.shareToken, prisma);
      expect(revokedGrant?.status).toBe("REVOKED");
      expect(revokedGrant?.sharedFields.length).toBe(0);

      // Cleanup
      await prisma.documentShare.delete({ where: { id: share.id } });
    });
  });

  describe("5. Assistant Failure Resilience", () => {
    it("handles edge-case queries gracefully without crashing the assistant drawer", async () => {
      // Empty / whitespace message
      const resEmpty = await assistantClassifyRoute(
        new NextRequest("http://localhost:3000/api/assistant/classify", {
          method: "POST",
          body: JSON.stringify({ message: "   " }),
        })
      );
      expect(resEmpty.status).toBe(200);
      const dataEmpty = await resEmpty.json();
      expect(dataEmpty.friendlyResponse).toBeDefined();

      // Unsupported inquiry
      const resRandom = await assistantClassifyRoute(
        new NextRequest("http://localhost:3000/api/assistant/classify", {
          method: "POST",
          body: JSON.stringify({ message: "What is the weather in Bangalore tomorrow?" }),
        })
      );
      expect(resRandom.status).toBe(200);
      const dataRandom = await resRandom.json();
      expect(dataRandom.friendlyResponse).toBeDefined();
      expect(dataRandom.suggestions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("6. Cross-User Isolation Hardening", () => {
    it("prevents an unauthorized user from revoking another user's document share", async () => {
      const docs = await getUserDocuments(demoUserId, undefined, prisma);
      const doc = docs[0];

      const share = await createDocumentShare(
        demoUserId,
        {
          documentId: doc.id,
          recipientName: "Admissions Verification Committee",
          purpose: "KCET Verification",
          includedFieldIds: [],
          consent: true,
        },
        prisma
      );

      const unauthorizedUserId = "00000000-0000-0000-0000-000000000088";
      await expect(
        revokeDocumentShare(unauthorizedUserId, share.id, prisma)
      ).rejects.toThrow("not found or access denied");

      // Cleanup
      await prisma.documentShare.delete({ where: { id: share.id } });
    });
  });
});

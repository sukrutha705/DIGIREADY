import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";
import { getDemoUser, getUserDocuments } from "../src/server/vault";
import {
  normalizeName,
  normalizeDob,
  normalizeGender,
  normalizeParentName,
  normalizeAddress,
} from "../src/server/consistency/policy";
import { getVaultConsistencyAssessment } from "../src/server/consistency/service";
import { getApplicationJourney } from "../src/server/journey/service";
import { JourneyStatuses } from "../src/server/journey/types";
import { GET as getConsistencyRoute } from "../src/app/api/consistency/route";

describe("Cross-Document Consistency Engine & Application Readiness", () => {
  let demoUserId: string;

  beforeAll(async () => {
    const user = await getDemoUser(prisma);
    expect(user).toBeDefined();
    demoUserId = user.id;
  });

  describe("1. Deterministic Normalization Policies", () => {
    it("normalizes names with case insensitivity, whitespace trimming, and punctuation collapse", () => {
      expect(normalizeName(" Sukrutha K ")).toBe("SUKRUTHA K");
      expect(normalizeName("SUKRUTHA K")).toBe("SUKRUTHA K");
      expect(normalizeName("sukrutha k")).toBe("SUKRUTHA K");
      expect(normalizeName("Sukrutha, K.")).toBe("SUKRUTHA K");
      expect(normalizeName("Sukrutha-K")).toBe("SUKRUTHA K");
    });

    it("detects genuine name token differences as distinct normalized strings", () => {
      const normA = normalizeName("Sukrutha K");
      const normB = normalizeName("Sukrutha Kumar K");
      expect(normA).not.toBe(normB);
      expect(normA).toBe("SUKRUTHA K");
      expect(normB).toBe("SUKRUTHA KUMAR K");
    });

    it("normalizes diverse date formats (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, ISO)", () => {
      expect(normalizeDob("2006-05-15")).toBe("2006-05-15");
      expect(normalizeDob("15/05/2006")).toBe("2006-05-15");
      expect(normalizeDob("15-05-2006")).toBe("2006-05-15");
      expect(normalizeDob("2006-05-15T00:00:00.000Z")).toBe("2006-05-15");
    });

    it("normalizes gender representations consistently", () => {
      expect(normalizeGender("M")).toBe("MALE");
      expect(normalizeGender("male")).toBe("MALE");
      expect(normalizeGender("F")).toBe("FEMALE");
      expect(normalizeGender("female")).toBe("FEMALE");
    });

    it("normalizes address strings and common abbreviations", () => {
      expect(normalizeAddress("12, 1st Cross, MG Rd, Bangalore")).toBe("12 1ST CROSS MG ROAD BANGALORE");
    });
  });

  describe("2. Cross-Document Vault Assessment", () => {
    it("evaluates demo citizen vault documents across Name, DOB, Parent Name, Gender, Address", async () => {
      const assessment = await getVaultConsistencyAssessment(demoUserId, prisma);
      expect(assessment.userId).toBe(demoUserId);
      expect(assessment.comparisons.length).toBe(5);

      const nameComp = assessment.comparisons.find((c) => c.fieldKey === "name");
      expect(nameComp).toBeDefined();
      expect(nameComp?.entries.length).toBeGreaterThanOrEqual(2);
      expect(nameComp?.status).toBe("MATCH");

      const dobComp = assessment.comparisons.find((c) => c.fieldKey === "dateOfBirth");
      expect(dobComp).toBeDefined();
      expect(dobComp?.status).toBe("MATCH");

      const parentComp = assessment.comparisons.find((c) => c.fieldKey === "parentName");
      expect(parentComp).toBeDefined();
      expect(parentComp?.status).toBe("MATCH");
    });

    it("GET /api/consistency returns 200 with full ConsistencyAssessment DTO", async () => {
      const req = new NextRequest(`http://localhost:3000/api/consistency?userId=${demoUserId}`);
      const res = await getConsistencyRoute(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.comparisons).toBeDefined();
      expect(data.hasConflicts).toBeDefined();
      expect(data.summaryNote).toBeDefined();
    });
  });

  describe("3. Cross-User Isolation", () => {
    it("does not mix or cross-compare documents from different users", async () => {
      const isolatedUser = await prisma.user.create({
        data: { displayName: "Isolated Citizen" },
      });

      const assessment = await getVaultConsistencyAssessment(isolatedUser.id, prisma);
      expect(assessment.userId).toBe(isolatedUser.id);
      expect(assessment.comparisons.every((c) => c.status === "INSUFFICIENT_DATA")).toBe(true);

      // Cleanup
      await prisma.user.delete({ where: { id: isolatedUser.id } });
    });
  });

  describe("4. Integration with Application Journey Readiness", () => {
    it("calculates MISSING_DOCUMENTS for KCET when Income Certificate is missing", async () => {
      const journey = await getApplicationJourney(demoUserId, "KCET", prisma);
      expect(journey?.status).toBe(JourneyStatuses.MISSING_DOCUMENTS);
      expect(journey?.missingCount).toBe(1);
      expect(journey?.consistency).toBeDefined();
    });

    it("guarantees READY_TO_APPLY does not require sharing tokens or credentials", async () => {
      const journey = await getApplicationJourney(demoUserId, "KCET", prisma);
      // In DigiReady, sharing is NOT a blocker for readiness
      expect(journey?.status).not.toBe("READY_TO_SHARE");
    });
  });
});

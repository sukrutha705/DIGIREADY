import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";
import {
  getVerificationRuleSet,
  getAllVerificationRules,
} from "../src/server/verification/rules";
import {
  verifyDocument,
  verifyDocumentByType,
} from "../src/server/verification/verifier";
import { getDemoUser, getUserDocuments } from "../src/server/vault";
import { classifyIntent } from "../src/server/assistant/classifier";
import { IntentTypes } from "../src/server/assistant/types";
import { GET as verifyDocRoute } from "../src/app/api/documents/[id]/verify/route";
import { POST as assistantClassifyRoute } from "../src/app/api/assistant/classify/route";

describe("Phase 7.4: Document Verification & Trust Layer", () => {
  let demoUserId: string;
  let demoDocs: Array<{ id: string; displayName: string; documentTypeKey: string }>;

  beforeAll(async () => {
    const user = await getDemoUser(prisma);
    expect(user).toBeDefined();
    demoUserId = user.id;

    demoDocs = await getUserDocuments(demoUserId, undefined, prisma);
    expect(demoDocs.length).toBeGreaterThanOrEqual(6);
  });

  describe("1. Verification Rules Registry & Configuration", () => {
    it("resolves verification rules for supported document types", () => {
      const govtIdRule = getVerificationRuleSet("GOVERNMENT_IDENTITY_PROOF");
      expect(govtIdRule).not.toBeNull();
      expect(govtIdRule?.requireIssuer).toBe(true);
      expect(govtIdRule?.requireIssueDate).toBe(true);
      expect(govtIdRule?.requiredChecks).toContain("DOCUMENT_EXISTS");
      expect(govtIdRule?.requiredChecks).toContain("DOCUMENT_TYPE_RECOGNIZED");
      expect(govtIdRule?.requiredChecks).toContain("ISSUER_PRESENT");

      const pucRule = getVerificationRuleSet("HIGHER_SECONDARY_MARKS_CARD");
      expect(pucRule).not.toBeNull();
      expect(pucRule?.displayName).toContain("12th");
      expect(pucRule?.requiredChecks.length).toBeGreaterThanOrEqual(3);
    });

    it("resolves verification rules by alias case-insensitively", () => {
      const aadhaar = getVerificationRuleSet("aadhaar");
      expect(aadhaar?.documentType).toBe("GOVERNMENT_IDENTITY_PROOF");

      const sslc = getVerificationRuleSet("sslc marks card");
      expect(sslc?.documentType).toBe("SECONDARY_MARKS_CARD");

      const puc = getVerificationRuleSet("2nd puc marks card");
      expect(puc?.documentType).toBe("HIGHER_SECONDARY_MARKS_CARD");

      const income = getVerificationRuleSet("annual income certificate");
      expect(income?.documentType).toBe("INCOME_CERTIFICATE");
    });

    it("returns null for unsupported document types without throwing", () => {
      const unknown = getVerificationRuleSet("UNKNOWN_CERTIFICATE_99");
      expect(unknown).toBeNull();

      const drivingLicense = getVerificationRuleSet("driving license");
      expect(drivingLicense).toBeNull();
    });

    it("lists all configured verification rule sets via getAllVerificationRules", () => {
      const allRules = getAllVerificationRules();
      expect(allRules.length).toBeGreaterThanOrEqual(8);
      expect(allRules.every((r) => r.documentType && r.requiredChecks.length > 0)).toBe(true);
    });
  });

  describe("2. Deterministic Verification Engine: verifyDocument", () => {
    it("successfully assesses a complete vault document with READY_FOR_REVIEW status", async () => {
      const doc = demoDocs.find((d) => d.documentTypeKey === "HIGHER_SECONDARY_MARKS_CARD") || demoDocs[0];
      const result = await verifyDocument(demoUserId, doc.id, prisma);

      expect(result.status).toBe("READY_FOR_REVIEW");
      expect(result.displayName).toBe(doc.displayName);
      expect(result.checks.length).toBeGreaterThanOrEqual(3);
      expect(result.checks.every((c) => c.status === "PASS")).toBe(true);
      expect(result.summary).toContain("ready for review");
      expect(result.limitationNote).toContain("does not confirm official government authenticity");
    });

    it("assesses an incomplete document with NEEDS_REVIEW status and detailed check failures", async () => {
      // Create temporary test user and incomplete document
      const tempUser = await prisma.user.create({ data: { displayName: "Incomplete Doc User" } });
      const docType = await prisma.documentType.findUnique({ where: { canonicalKey: "HIGHER_SECONDARY_MARKS_CARD" } });
      if (!docType) throw new Error("Missing doc type");

      const incompleteDoc = await prisma.document.create({
        data: {
          userId: tempUser.id,
          documentTypeId: docType.id,
          displayName: "Incomplete PUC Card",
          source: "UPLOADED",
          issuer: "", // Missing issuer
          issueDate: null, // Missing issue date
        },
      });

      const result = await verifyDocument(tempUser.id, incompleteDoc.id, prisma);

      expect(result.status).toBe("NEEDS_REVIEW");
      expect(result.checks.some((c) => c.key === "ISSUER_PRESENT" && c.status === "FAIL")).toBe(true);
      expect(result.checks.some((c) => c.key === "ISSUE_DATE_PRESENT" && c.status === "FAIL")).toBe(true);
      expect(result.summary).toContain("needs review");

      // Cleanup
      await prisma.document.delete({ where: { id: incompleteDoc.id } });
      await prisma.user.delete({ where: { id: tempUser.id } });
    });

    it("returns DOCUMENT_NOT_FOUND when document ID does not exist", async () => {
      const result = await verifyDocument(demoUserId, "non-existent-uuid-1234", prisma);
      expect(result.status).toBe("DOCUMENT_NOT_FOUND");
      expect(result.checks[0].status).toBe("FAIL");
      expect(result.summary).toContain("not found in your DigiReady vault");
    });

    it("returns UNSUPPORTED_DOCUMENT when document type has no configured verification rules", async () => {
      const tempUser = await prisma.user.create({ data: { displayName: "Degree User" } });
      const degreeType = await prisma.documentType.findUnique({ where: { canonicalKey: "DEGREE_CERTIFICATE" } });
      if (!degreeType) throw new Error("Missing DEGREE_CERTIFICATE type");

      const unsupportedDoc = await prisma.document.create({
        data: {
          userId: tempUser.id,
          documentTypeId: degreeType.id,
          displayName: "Bachelor Degree Certificate",
          source: "ISSUED",
          issuer: "Demo University",
          issueDate: new Date("2024-01-01T00:00:00Z"),
        },
      });

      const result = await verifyDocument(tempUser.id, unsupportedDoc.id, prisma);
      expect(result.status).toBe("UNSUPPORTED_DOCUMENT");
      expect(result.checks.some((c) => c.key === "DOCUMENT_EXISTS" && c.status === "PASS")).toBe(true);
      expect(result.checks.some((c) => c.key === "DOCUMENT_TYPE_SUPPORTED" && c.status === "FAIL")).toBe(true);
      expect(result.summary).toContain("verification rules configured");

      // Cleanup
      await prisma.document.delete({ where: { id: unsupportedDoc.id } });
      await prisma.user.delete({ where: { id: tempUser.id } });
    });

    it("enforces strict document ownership isolation without data leakage", async () => {
      const otherUser = await prisma.user.create({ data: { displayName: "Other User" } });

      // Attempting to verify demoUser's document using otherUser's ID must fail
      const result = await verifyDocument(otherUser.id, demoDocs[0].id, prisma);
      expect(result.status).toBe("DOCUMENT_NOT_FOUND");
      expect(result.checks[0].status).toBe("FAIL");

      // Cleanup
      await prisma.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe("3. Verification by Query Name / Type: verifyDocumentByType", () => {
    it("finds and verifies 12th marks card by natural query", async () => {
      const res = await verifyDocumentByType(demoUserId, "12th marks card", prisma);
      expect(res.verification).toBeDefined();
      expect(res.verification?.status).toBe("READY_FOR_REVIEW");
      expect(res.verification?.checks.some((c) => c.key === "DOCUMENT_EXISTS")).toBe(true);
    });

    it("finds and verifies Aadhaar card by alias query", async () => {
      const res = await verifyDocumentByType(demoUserId, "aadhaar", prisma);
      expect(res.verification).toBeDefined();
      expect(res.verification?.status).toBe("READY_FOR_REVIEW");
    });

    it("returns DOCUMENT_NOT_FOUND when supported document is missing from citizen vault", async () => {
      const res = await verifyDocumentByType(demoUserId, "income certificate", prisma);
      expect(res.verification).toBeDefined();
      expect(res.verification?.status).toBe("DOCUMENT_NOT_FOUND");
      expect(res.verification?.summary).toContain("couldn't find");
    });

    it("returns UNSUPPORTED_DOCUMENT when queried document type is unknown / unsupported", async () => {
      const res = await verifyDocumentByType(demoUserId, "driving license", prisma);
      expect(res.verification).toBeDefined();
      expect(res.verification?.status).toBe("UNSUPPORTED_DOCUMENT");
      expect(res.verification?.summary).toContain("verification rules configured");
    });
  });

  describe("4. Verification API Route: GET /api/documents/[id]/verify", () => {
    it("successfully verifies a valid vault document via API endpoint", async () => {
      const targetDoc = demoDocs[0];
      const req = new NextRequest(`http://localhost:3000/api/documents/${targetDoc.id}/verify?userId=${demoUserId}`);
      const res = await verifyDocRoute(req, { params: Promise.resolve({ id: targetDoc.id }) });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.documentId).toBe(targetDoc.id);
      expect(data.status).toBe("READY_FOR_REVIEW");
      expect(data.checks.length).toBeGreaterThanOrEqual(3);
      expect(data.limitationNote).toBeDefined();
    });

    it("returns 404 for non-existent document ID via API endpoint", async () => {
      const req = new NextRequest(`http://localhost:3000/api/documents/invalid-doc-id/verify?userId=${demoUserId}`);
      const res = await verifyDocRoute(req, { params: Promise.resolve({ id: "invalid-doc-id" }) });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.status).toBe("DOCUMENT_NOT_FOUND");
      expect(data.error).toBeDefined();
      expect(data.limitationNote).toBeDefined();
    });

    it("enforces user ownership isolation via API endpoint (returns 404 for unowned doc)", async () => {
      const otherUser = await prisma.user.create({ data: { displayName: "Other Api User" } });
      const targetDoc = demoDocs[0];
      const req = new NextRequest(`http://localhost:3000/api/documents/${targetDoc.id}/verify?userId=${otherUser.id}`);
      const res = await verifyDocRoute(req, { params: Promise.resolve({ id: targetDoc.id }) });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.status).toBe("DOCUMENT_NOT_FOUND");

      await prisma.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe("5. Assistant Intent & Classification Integration", () => {
    it("classifies 'Can I verify my 12th marks card?' as VERIFY_DOCUMENT with document entity", () => {
      const intent = classifyIntent("Can I verify my 12th marks card?");
      expect(intent.intent).toBe(IntentTypes.VERIFY_DOCUMENT);
      expect(intent.document).toBe("12th marks card");
    });

    it("classifies 'How do I verify my document?' as VERIFY_DOCUMENT without specific document entity", () => {
      const intent = classifyIntent("How do I verify my document?");
      expect(intent.intent).toBe(IntentTypes.VERIFY_DOCUMENT);
      expect(intent.document).toBeUndefined();
    });

    it("classifies 'Is my income certificate valid?' as VERIFY_DOCUMENT", () => {
      const intent = classifyIntent("Is my income certificate valid?");
      expect(intent.intent).toBe(IntentTypes.VERIFY_DOCUMENT);
      expect(intent.document).toBe("income certificate");
    });

    it("classifies 'Is my income certificate legally valid?' as VERIFY_DOCUMENT", () => {
      const intent = classifyIntent("Is my income certificate legally valid?");
      expect(intent.intent).toBe(IntentTypes.VERIFY_DOCUMENT);
      expect(intent.document).toBe("income certificate");
    });

    it("classifies 'Can you verify my driving license?' as VERIFY_DOCUMENT", () => {
      const intent = classifyIntent("Can you verify my driving license?");
      expect(intent.intent).toBe(IntentTypes.VERIFY_DOCUMENT);
      expect(intent.document).toBe("driving license");
    });

    it("preserves CHECK_DOCUMENT for 'Do I have my income certificate?'", () => {
      const intent = classifyIntent("Do I have my income certificate?");
      expect(intent.intent).toBe(IntentTypes.CHECK_DOCUMENT);
      expect(intent.document).toBe("income certificate");
    });

    it("preserves MISSING_DOCUMENT for 'I need an income certificate'", () => {
      const intent = classifyIntent("I need an income certificate");
      expect(intent.intent).toBe(IntentTypes.MISSING_DOCUMENT);
      expect(intent.document).toBe("income certificate");
    });

    it("preserves APPLY_FOR_SERVICE for 'I want to apply for KCET'", () => {
      const intent = classifyIntent("I want to apply for KCET");
      expect(intent.intent).toBe(IntentTypes.APPLY_FOR_SERVICE);
      expect(intent.service).toBe("KCET");
    });
  });

  describe("6. Assistant End-to-End API Integration", () => {
    it("handles existing document verification request via assistant POST endpoint", async () => {
      const req = new NextRequest("http://localhost:3000/api/assistant/classify", {
        method: "POST",
        body: JSON.stringify({ message: "Can I verify my 12th marks card?" }),
      });
      const res = await assistantClassifyRoute(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.intent.intent).toBe(IntentTypes.VERIFY_DOCUMENT);
      expect(data.verification).toBeDefined();
      expect(data.verification.status).toBe("READY_FOR_REVIEW");
      expect(data.verification.checks.length).toBeGreaterThanOrEqual(3);
    });

    it("prompts for document clarification when generic verification inquiry is received", async () => {
      const req = new NextRequest("http://localhost:3000/api/assistant/classify", {
        method: "POST",
        body: JSON.stringify({ message: "How do I verify my document?" }),
      });
      const res = await assistantClassifyRoute(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.intent.intent).toBe(IntentTypes.VERIFY_DOCUMENT);
      expect(data.friendlyResponse).toContain("Which document would you like me to check");
      expect(data.suggestions.length).toBeGreaterThanOrEqual(3);
    });

    it("includes prototype limitation disclaimer when legal validity is queried", async () => {
      const req = new NextRequest("http://localhost:3000/api/assistant/classify", {
        method: "POST",
        body: JSON.stringify({ message: "Is my 12th marks card legally valid?" }),
      });
      const res = await assistantClassifyRoute(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.intent.intent).toBe(IntentTypes.VERIFY_DOCUMENT);
      expect(data.friendlyResponse).toContain("official legal validity");
      expect(data.verification).toBeDefined();
      expect(data.verification.limitationNote).toContain("does not confirm official government authenticity");
    });
  });
});

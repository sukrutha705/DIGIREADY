import { describe, it, expect } from "vitest";
import { getDocumentGuidance, getAllDocumentGuidance } from "../src/server/guidance/registry";
import { classifyIntent } from "../src/server/assistant/classifier";
import { IntentTypes } from "../src/server/assistant/types";

describe("Phase 7.3: Missing Document Guidance Engine", () => {
  describe("Guidance Registry Lookup", () => {
    it("resolves Income Certificate case-insensitively and via canonical key", () => {
      const lower = getDocumentGuidance("income certificate");
      const upper = getDocumentGuidance("INCOME_CERTIFICATE");
      const title = getDocumentGuidance("Income Certificate");

      expect(lower).not.toBeNull();
      expect(lower?.documentType).toBe("INCOME_CERTIFICATE");
      expect(lower?.displayName).toBe("Income Certificate");
      expect(lower).toEqual(upper);
      expect(lower).toEqual(title);
    });

    it("resolves guidance by known aliases", () => {
      const aadhaar = getDocumentGuidance("aadhaar");
      expect(aadhaar?.documentType).toBe("GOVERNMENT_IDENTITY_PROOF");

      const sslc = getDocumentGuidance("sslc marks card");
      expect(sslc?.documentType).toBe("SECONDARY_MARKS_CARD");

      const puc = getDocumentGuidance("2nd puc marks card");
      expect(puc?.documentType).toBe("HIGHER_SECONDARY_MARKS_CARD");

      const domicile = getDocumentGuidance("domicile certificate");
      expect(domicile?.documentType).toBe("ADDRESS_PROOF");
    });

    it("returns null for unknown document types without throwing", () => {
      const unknown = getDocumentGuidance("random_unknown_doc_xyz");
      expect(unknown).toBeNull();
    });

    it("verifies all guidance entries contain description, purpose, and actionable steps", () => {
      const all = getAllDocumentGuidance();
      expect(all.length).toBeGreaterThanOrEqual(8);

      for (const entry of all) {
        expect(entry.documentType).toBeDefined();
        expect(entry.displayName).toBeDefined();
        expect(entry.description.length).toBeGreaterThan(10);
        expect(entry.purpose.length).toBeGreaterThan(10);
        expect(entry.nextSteps.length).toBeGreaterThanOrEqual(1);
        expect(entry.authorityNote).toBeDefined();
      }
    });
  });

  describe("Assistant Intent & Routing Flow", () => {
    it("classifies 'I need an income certificate' as MISSING_DOCUMENT with document entity", () => {
      const intent = classifyIntent("I need an income certificate");
      expect(intent.intent).toBe(IntentTypes.MISSING_DOCUMENT);
      expect(intent.document).toBe("income certificate");

      const guidance = getDocumentGuidance(intent.document!);
      expect(guidance).not.toBeNull();
      expect(guidance?.displayName).toBe("Income Certificate");
    });

    it("classifies 'My caste certificate is missing' as MISSING_DOCUMENT with document entity", () => {
      const intent = classifyIntent("My caste certificate is missing");
      expect(intent.intent).toBe(IntentTypes.MISSING_DOCUMENT);
      expect(intent.document).toBe("caste certificate");

      const guidance = getDocumentGuidance(intent.document!);
      expect(guidance?.documentType).toBe("CASTE_CERTIFICATE");
    });

    it("preserves CHECK_DOCUMENT behavior for 'Do I have my income certificate?'", () => {
      const intent = classifyIntent("Do I have my income certificate?");
      expect(intent.intent).toBe(IntentTypes.CHECK_DOCUMENT);
      expect(intent.document).toBe("income certificate");
    });

    it("preserves FIND_DOCUMENT behavior for 'Where is my Aadhaar?'", () => {
      const intent = classifyIntent("Where is my Aadhaar?");
      expect(intent.intent).toBe(IntentTypes.FIND_DOCUMENT);
      expect(intent.document).toBe("aadhaar");
    });

    it("preserves APPLY_FOR_SERVICE behavior for 'I want to apply for KCET'", () => {
      const intent = classifyIntent("I want to apply for KCET");
      expect(intent.intent).toBe(IntentTypes.APPLY_FOR_SERVICE);
      expect(intent.service).toBe("KCET");
    });

    it("handles missing document query for an unknown document gracefully", () => {
      const intent = classifyIntent("I don't have my mysterious certificate xyz");
      expect(intent.intent).toBe(IntentTypes.MISSING_DOCUMENT);
    });
  });
});

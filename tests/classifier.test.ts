import { describe, it, expect } from "vitest";
import { classifyIntent, normalizeMessage, extractService, extractDocument } from "../src/server/assistant/classifier";
import { IntentTypes } from "../src/server/assistant/types";

describe("Phase 7.1: Deterministic Intent Engine", () => {
  describe("normalizeMessage", () => {
    it("normalizes casing, whitespace, and punctuation", () => {
      expect(normalizeMessage("  I WANT to Apply for KCET!?? ")).toBe("i want to apply for kcet");
      expect(normalizeMessage("")).toBe("");
      expect(normalizeMessage("   ")).toBe("");
    });
  });

  describe("Entity Extraction", () => {
    it("extracts recognized services", () => {
      expect(extractService("i want to apply for kcet")).toBe("KCET");
      expect(extractService("what documents do i need for scholarship")).toBe("Government Scholarship");
      expect(extractService("need pf transfer help")).toBe("EPFO PF Transfer");
      expect(extractService("random text")).toBeUndefined();
    });

    it("extracts recognized documents", () => {
      expect(extractDocument("do i have my income certificate")).toBe("income certificate");
      expect(extractDocument("where is my 10th marks card")).toBe("10th marks card");
      expect(extractDocument("where is my aadhaar")).toBe("aadhaar");
      expect(extractDocument("random text")).toBeUndefined();
    });
  });

  describe("Intent Classification: APPLY_FOR_SERVICE", () => {
    it("classifies apply for KCET query", () => {
      const result = classifyIntent("I want to apply for KCET");
      expect(result.intent).toBe(IntentTypes.APPLY_FOR_SERVICE);
      expect(result.service).toBe("KCET");
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it("classifies 'how do i apply for KCET'", () => {
      const result = classifyIntent("How do I apply for KCET?");
      expect(result.intent).toBe(IntentTypes.APPLY_FOR_SERVICE);
      expect(result.service).toBe("KCET");
    });

    it("classifies 'what documents are required for KCET'", () => {
      const result = classifyIntent("What documents are required for KCET?");
      expect(result.intent).toBe(IntentTypes.APPLY_FOR_SERVICE);
      expect(result.service).toBe("KCET");
    });

    it("classifies scholarship application inquiry", () => {
      const result = classifyIntent("I need to apply for a scholarship");
      expect(result.intent).toBe(IntentTypes.APPLY_FOR_SERVICE);
      expect(result.service).toBe("Government Scholarship");
    });
  });

  describe("Intent Classification: CHECK_DOCUMENT", () => {
    it("classifies 'do i have my income certificate'", () => {
      const result = classifyIntent("Do I have my income certificate?");
      expect(result.intent).toBe(IntentTypes.CHECK_DOCUMENT);
      expect(result.document).toBe("income certificate");
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it("classifies 'is my marks card available'", () => {
      const result = classifyIntent("Is my marks card available?");
      expect(result.intent).toBe(IntentTypes.CHECK_DOCUMENT);
      expect(result.document).toBe("marks card");
    });

    it("classifies 'do I have an Aadhaar document'", () => {
      const result = classifyIntent("Do I have an Aadhaar document?");
      expect(result.intent).toBe(IntentTypes.CHECK_DOCUMENT);
      expect(result.document).toBe("aadhaar document");
    });
  });

  describe("Intent Classification: FIND_DOCUMENT", () => {
    it("classifies 'where is my Aadhaar'", () => {
      const result = classifyIntent("Where is my Aadhaar?");
      expect(result.intent).toBe(IntentTypes.FIND_DOCUMENT);
      expect(result.document).toBe("aadhaar");
    });

    it("classifies 'find my income certificate'", () => {
      const result = classifyIntent("Find my income certificate");
      expect(result.intent).toBe(IntentTypes.FIND_DOCUMENT);
      expect(result.document).toBe("income certificate");
    });

    it("classifies 'show me my marks card'", () => {
      const result = classifyIntent("Show me my marks card");
      expect(result.intent).toBe(IntentTypes.FIND_DOCUMENT);
      expect(result.document).toBe("marks card");
    });
  });

  describe("Intent Classification: MISSING_DOCUMENT", () => {
    it("classifies 'my income certificate is missing'", () => {
      const result = classifyIntent("My income certificate is missing");
      expect(result.intent).toBe(IntentTypes.MISSING_DOCUMENT);
      expect(result.document).toBe("income certificate");
    });

    it("classifies 'i don't have my caste certificate'", () => {
      const result = classifyIntent("I don't have my caste certificate");
      expect(result.intent).toBe(IntentTypes.MISSING_DOCUMENT);
      expect(result.document).toBe("caste certificate");
    });

    it("classifies 'cannot find my 10th marks card'", () => {
      const result = classifyIntent("Cannot find my 10th marks card");
      expect(result.intent).toBe(IntentTypes.MISSING_DOCUMENT);
      expect(result.document).toBe("10th marks card");
    });
  });

  describe("Intent Classification: VERIFY_DOCUMENT", () => {
    it("classifies 'how do i verify my document'", () => {
      const result = classifyIntent("How do I verify my document?");
      expect(result.intent).toBe(IntentTypes.VERIFY_DOCUMENT);
    });

    it("classifies 'can I verify my marks card'", () => {
      const result = classifyIntent("Can I verify my marks card?");
      expect(result.intent).toBe(IntentTypes.VERIFY_DOCUMENT);
      expect(result.document).toBe("marks card");
    });
  });

  describe("Intent Classification: SHARE_DOCUMENT", () => {
    it("classifies 'can I share my marks card'", () => {
      const result = classifyIntent("Can I share my marks card?");
      expect(result.intent).toBe(IntentTypes.SHARE_DOCUMENT);
      expect(result.document).toBe("marks card");
    });

    it("classifies 'I want to share my certificate'", () => {
      const result = classifyIntent("I want to share my certificate");
      expect(result.intent).toBe(IntentTypes.SHARE_DOCUMENT);
      expect(result.document).toBe("certificate");
    });

    it("classifies 'how do I share a document'", () => {
      const result = classifyIntent("How do I share a document?");
      expect(result.intent).toBe(IntentTypes.SHARE_DOCUMENT);
    });
  });

  describe("Intent Classification: GENERAL_HELP & Fallback", () => {
    it("classifies 'hello'", () => {
      const result = classifyIntent("Hello");
      expect(result.intent).toBe(IntentTypes.GENERAL_HELP);
    });

    it("classifies 'help me'", () => {
      const result = classifyIntent("Help me");
      expect(result.intent).toBe(IntentTypes.GENERAL_HELP);
    });

    it("classifies 'what can you do'", () => {
      const result = classifyIntent("What can you do?");
      expect(result.intent).toBe(IntentTypes.GENERAL_HELP);
    });

    it("classifies 'how does digiready work'", () => {
      const result = classifyIntent("How does DigiReady work?");
      expect(result.intent).toBe(IntentTypes.GENERAL_HELP);
    });
  });

  describe("Resilience & Edge Cases", () => {
    it("handles empty and whitespace input without throwing", () => {
      expect(classifyIntent("").intent).toBe(IntentTypes.GENERAL_HELP);
      expect(classifyIntent("   ").intent).toBe(IntentTypes.GENERAL_HELP);
    });

    it("handles random and unrecognized input gracefully", () => {
      const result = classifyIntent("xyzzy foobar blorp 12345");
      expect(result.intent).toBe(IntentTypes.GENERAL_HELP);
      expect(result.confidence).toBeLessThanOrEqual(0.6);
    });

    it("handles full uppercase and excessive punctuation", () => {
      const result = classifyIntent("!!! I WANT TO APPLY FOR KCET ???");
      expect(result.intent).toBe(IntentTypes.APPLY_FOR_SERVICE);
      expect(result.service).toBe("KCET");
    });
  });
});

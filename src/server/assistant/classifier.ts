import { AssistantIntent, IntentTypes } from "./types";
import { INTENT_PATTERNS, KNOWN_SERVICES, KNOWN_DOCUMENTS } from "./intents";

/**
 * Normalizes input text for deterministic matching:
 * - Trims whitespace
 * - Converts to lowercase
 * - Replaces punctuation with single spaces
 * - Collapses consecutive spaces
 */
export function normalizeMessage(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }
  return input
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extracts a recognized service entity from the normalized message.
 */
export function extractService(normalized: string): string | undefined {
  // Sort all aliases by length descending to match most specific service first (e.g. "jee advanced" before "jee")
  const allAliases: Array<{ key: string; alias: string }> = [];
  for (const svc of KNOWN_SERVICES) {
    for (const alias of svc.aliases) {
      allAliases.push({ key: svc.key, alias });
    }
  }
  allAliases.sort((a, b) => b.alias.length - a.alias.length);

  for (const item of allAliases) {
    const pattern = new RegExp(`\\b${item.alias.replace(/\s+/g, "\\s+")}\\b`, "i");
    if (pattern.test(normalized)) {
      return item.key;
    }
  }
  return undefined;
}

/**
 * Extracts a recognized document entity from the normalized message.
 */
export function extractDocument(normalized: string): string | undefined {
  // Sort by length descending to match more specific names first (e.g. "income certificate" before "certificate")
  const sortedDocs = [...KNOWN_DOCUMENTS].sort((a, b) => b.length - a.length);

  for (const doc of sortedDocs) {
    const pattern = new RegExp(`\\b${doc.replace(/\s+/g, "\\s+")}\\b`, "i");
    if (pattern.test(normalized)) {
      return doc;
    }
  }
  return undefined;
}

/**
 * Extracts a recipient entity from natural language messages.
 */
export function extractRecipient(message: string): string | undefined {
  if (!message || typeof message !== "string") {
    return undefined;
  }
  const match = message.match(/\b(?:with|to)\s+(?:the\s+)?([a-zA-Z0-9\s]+?)(?:\s+(?:for|as)\b|$)/i);
  if (match && match[1]) {
    const cleaned = match[1].trim();
    const lower = cleaned.toLowerCase();
    const stopWords = ["my", "a", "an", "the", "document", "documents", "this", "that", "these", "it"];
    if (cleaned.length > 1 && !stopWords.includes(lower)) {
      return cleaned
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
    }
  }
  return undefined;
}

/**
 * Extracts a sharing purpose from natural language messages.
 */
export function extractPurpose(message: string): string | undefined {
  if (!message || typeof message !== "string") {
    return undefined;
  }
  const match = message.match(/\b(?:for|as)\s+([a-zA-Z0-9\s]+?)$/i);
  if (match && match[1]) {
    const cleaned = match[1].trim();
    const lower = cleaned.toLowerCase();
    const stopWords = ["me", "you", "them", "us", "now", "it", "free", "sure"];
    if (cleaned.length > 2 && !stopWords.includes(lower)) {
      return cleaned;
    }
  }
  return undefined;
}

/**
 * Deterministically classifies natural-language citizen inquiries into structured intent DTOs.
 */
export function classifyIntent(message: string): AssistantIntent {
  const originalMessage = message ?? "";
  const normalized = normalizeMessage(originalMessage);

  if (!normalized) {
    return {
      intent: IntentTypes.GENERAL_HELP,
      confidence: 0.5,
      originalMessage,
    };
  }

  const extractedService = extractService(normalized);
  const extractedDocument = extractDocument(normalized);
  const extractedRecipient = extractRecipient(originalMessage);
  const extractedPurpose = extractPurpose(originalMessage);

  // 1. Check for explicit Share Document intent
  const sharePattern = INTENT_PATTERNS.find((p) => p.intent === IntentTypes.SHARE_DOCUMENT);
  if (sharePattern) {
    const hasPhrase = sharePattern.phrases.some((p) => normalized.includes(p));
    const hasRegex = sharePattern.regexPatterns.some((r) => r.test(normalized));
    const startsWithShare = normalized.startsWith("share ") || normalized.startsWith("share\t");
    if (hasPhrase || hasRegex || startsWithShare) {
      return {
        intent: IntentTypes.SHARE_DOCUMENT,
        document: extractedDocument,
        recipient: extractedRecipient,
        purpose: extractedPurpose,
        confidence: extractedDocument ? 0.95 : 0.85,
        originalMessage,
      };
    }
  }

  // 2. Check for explicit Verify Document intent
  const verifyPattern = INTENT_PATTERNS.find((p) => p.intent === IntentTypes.VERIFY_DOCUMENT);
  if (verifyPattern) {
    const hasPhrase = verifyPattern.phrases.some((p) => normalized.includes(p));
    const hasRegex = verifyPattern.regexPatterns.some((r) => r.test(normalized));
    if (hasPhrase || hasRegex) {
      return {
        intent: IntentTypes.VERIFY_DOCUMENT,
        document: extractedDocument,
        confidence: extractedDocument ? 0.92 : 0.85,
        originalMessage,
      };
    }
  }

  // 3. Check for explicit Missing Document intent
  const missingPattern = INTENT_PATTERNS.find((p) => p.intent === IntentTypes.MISSING_DOCUMENT);
  if (missingPattern) {
    const hasPhrase = missingPattern.phrases.some((p) => normalized.includes(p));
    const hasRegex = missingPattern.regexPatterns.some((r) => r.test(normalized));
    if (hasPhrase || hasRegex) {
      return {
        intent: IntentTypes.MISSING_DOCUMENT,
        document: extractedDocument,
        service: extractedService,
        confidence: extractedDocument ? 0.95 : 0.85,
        originalMessage,
      };
    }
  }

  // 4. Check for explicit Apply for Service intent
  const applyPattern = INTENT_PATTERNS.find((p) => p.intent === IntentTypes.APPLY_FOR_SERVICE);
  if (applyPattern) {
    const hasPhrase = applyPattern.phrases.some((p) => normalized.includes(p));
    const hasRegex = applyPattern.regexPatterns.some((r) => r.test(normalized));
    const hasServiceWithApply = Boolean(
      extractedService &&
      (normalized.includes("apply") || normalized.includes("application") || normalized.includes("for ") || normalized.includes("requirements"))
    );

    if (hasPhrase || hasRegex || hasServiceWithApply) {
      return {
        intent: IntentTypes.APPLY_FOR_SERVICE,
        service: extractedService,
        document: extractedDocument,
        confidence: extractedService ? 0.95 : 0.85,
        originalMessage,
      };
    }
  }

  // 5. Check for explicit Find Document intent
  const findPattern = INTENT_PATTERNS.find((p) => p.intent === IntentTypes.FIND_DOCUMENT);
  if (findPattern) {
    const hasPhrase = findPattern.phrases.some((p) => normalized.includes(p));
    const hasRegex = findPattern.regexPatterns.some((r) => r.test(normalized));
    if (hasPhrase || hasRegex) {
      return {
        intent: IntentTypes.FIND_DOCUMENT,
        document: extractedDocument,
        confidence: extractedDocument ? 0.92 : 0.85,
        originalMessage,
      };
    }
  }

  // 6. Check for explicit Check Document intent
  const checkPattern = INTENT_PATTERNS.find((p) => p.intent === IntentTypes.CHECK_DOCUMENT);
  if (checkPattern) {
    const hasPhrase = checkPattern.phrases.some((p) => normalized.includes(p));
    const hasRegex = checkPattern.regexPatterns.some((r) => r.test(normalized));
    if (hasPhrase || hasRegex) {
      return {
        intent: IntentTypes.CHECK_DOCUMENT,
        document: extractedDocument,
        confidence: extractedDocument ? 0.92 : 0.85,
        originalMessage,
      };
    }
  }

  // 7. Check for explicit General Help intent
  const helpPattern = INTENT_PATTERNS.find((p) => p.intent === IntentTypes.GENERAL_HELP);
  if (helpPattern) {
    const hasPhrase = helpPattern.phrases.some((p) => normalized.includes(p));
    const hasRegex = helpPattern.regexPatterns.some((r) => r.test(normalized));
    if (hasPhrase || hasRegex) {
      return {
        intent: IntentTypes.GENERAL_HELP,
        confidence: 0.85,
        originalMessage,
      };
    }
  }

  // 8. If a document entity is mentioned alone (e.g. "income certificate") -> CHECK_DOCUMENT
  if (extractedDocument) {
    return {
      intent: IntentTypes.CHECK_DOCUMENT,
      document: extractedDocument,
      confidence: 0.75,
      originalMessage,
    };
  }

  // 9. If a service entity is mentioned alone (e.g. "KCET") -> APPLY_FOR_SERVICE
  if (extractedService) {
    return {
      intent: IntentTypes.APPLY_FOR_SERVICE,
      service: extractedService,
      confidence: 0.75,
      originalMessage,
    };
  }

  // 10. Fallback to GENERAL_HELP
  return {
    intent: IntentTypes.GENERAL_HELP,
    confidence: 0.5,
    originalMessage,
  };
}

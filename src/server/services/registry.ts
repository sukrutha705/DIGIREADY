import { ServiceRequirement } from "./types";
import { DEMO_SERVICE_REQUIREMENTS } from "./requirements";
import { KNOWN_SERVICES } from "@/server/assistant/intents";

/**
 * Normalizes a service query string.
 */
function normalizeServiceKey(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }
  return input.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Retrieves service requirement specification by service name, key, or alias.
 * Returns null if the service is unknown.
 */
export function getServiceRequirement(serviceName: string): ServiceRequirement | null {
  if (!serviceName || typeof serviceName !== "string") {
    return null;
  }

  const normalized = normalizeServiceKey(serviceName);
  if (!normalized) {
    return null;
  }

  // 1. Direct key match (e.g. "kcet", "scholarship", "income_certificate", "passport", "epfo", "pension")
  const keyCandidate = normalized.replace(/\s+/g, "_");
  if (DEMO_SERVICE_REQUIREMENTS[keyCandidate]) {
    return DEMO_SERVICE_REQUIREMENTS[keyCandidate];
  }
  if (DEMO_SERVICE_REQUIREMENTS[normalized]) {
    return DEMO_SERVICE_REQUIREMENTS[normalized];
  }

  // 2. Match against display names
  for (const req of Object.values(DEMO_SERVICE_REQUIREMENTS)) {
    if (normalizeServiceKey(req.serviceName) === normalized) {
      return req;
    }
  }

  // 3. Match against KNOWN_SERVICES aliases from the intent layer
  for (const svc of KNOWN_SERVICES) {
    for (const alias of svc.aliases) {
      const normAlias = normalizeServiceKey(alias);
      if (normalized === normAlias || normalized.includes(normAlias) || normAlias.includes(normalized)) {
        // Map intent service key to requirement key
        const matched = Object.values(DEMO_SERVICE_REQUIREMENTS).find(
          (r) => normalizeServiceKey(r.serviceName) === normalizeServiceKey(svc.key)
        );
        if (matched) {
          return matched;
        }
      }
    }
  }

  return null;
}

/**
 * Retrieves all registered demo service requirement specifications.
 */
export function getAllServiceRequirements(): ServiceRequirement[] {
  return Object.values(DEMO_SERVICE_REQUIREMENTS);
}

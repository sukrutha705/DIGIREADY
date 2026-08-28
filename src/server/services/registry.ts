import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import { ServiceRequirement, DocumentRequirement } from "./types";
import { DEMO_SERVICE_REQUIREMENTS } from "./requirements";
import { KNOWN_SERVICES } from "@/server/assistant/intents";
import { ServiceDTO, ServiceSummary } from "@/types/service";

/**
 * Normalizes a service query string.
 */
export function normalizeServiceKey(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }
  return input.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Helper to map Prisma Service record to ServiceRequirement domain structure.
 */
function mapPrismaServiceToRequirement(service: any): ServiceRequirement {
  const reqDocs: DocumentRequirement[] = (service.requirements || []).map((r: any) => ({
    documentType: r.documentType?.canonicalKey || r.requirementKey,
    displayName: r.label || r.documentType?.displayName || r.requirementKey,
    required: r.required ?? r.requirementType === "REQUIRED",
    requirementCategory: r.requirementCategory || "DOCUMENT_REQUIREMENT",
    condition: r.condition || r.conditionKey || null,
    notes: r.notes || r.description || null,
    priority: r.priority || r.sortOrder || 0,
    sourceReference: r.sourceReference || r.source?.name || null,
    sourceTitle: r.sourceTitle || null,
    sourceUrl: r.sourceUrl || null,
    aliases: r.documentType?.aliases?.map((a: any) => a.alias) || [],
  }));

  return {
    serviceId: service.slug || service.serviceKey.toLowerCase(),
    slug: service.slug,
    serviceKey: service.serviceKey,
    serviceName: service.shortName || service.name,
    shortName: service.shortName,
    category: service.category,
    authority: service.authority,
    jurisdiction: service.jurisdiction,
    officialWebsite: service.officialWebsite,
    officialApplicationUrl: service.officialApplicationUrl,
    availabilityStatus: service.availabilityStatus,
    provenanceStatus: service.provenanceStatus,
    eligibilitySummary: service.eligibilitySummary,
    prototypeNotice: service.prototypeNotice,
    version: service.version,
    description: service.shortDescription || service.description,
    requiredDocuments: reqDocs,
  };
}

/**
 * Helper to map Prisma Service record to ServiceDTO for discovery and listing.
 */
function mapPrismaServiceToDTO(service: any): ServiceDTO {
  const requirements = service.requirements || [];
  const requiredCount = requirements.filter(
    (r: any) => r.required === true || r.requirementType === "REQUIRED"
  ).length;

  return {
    id: service.id,
    slug: service.slug,
    serviceKey: service.serviceKey,
    name: service.name,
    shortName: service.shortName,
    shortDescription: service.shortDescription,
    description: service.description,
    category: service.category,
    providerName: service.providerName,
    authority: service.authority,
    jurisdiction: service.jurisdiction,
    officialWebsite: service.officialWebsite,
    officialApplicationUrl: service.officialApplicationUrl,
    availabilityStatus: service.availabilityStatus || "SUPPORTED",
    provenanceStatus: service.provenanceStatus || "VERIFIED_OFFICIAL",
    eligibilitySummary: service.eligibilitySummary || null,
    prototypeNotice: service.prototypeNotice || null,
    version: service.version || "1.0.0",
    lastReviewedAt: service.lastReviewedAt ? service.lastReviewedAt.toISOString() : null,
    lastVerifiedAt: service.lastVerifiedAt ? service.lastVerifiedAt.toISOString() : null,
    active: service.active,
    requiredDocumentsCount: requiredCount,
    totalDocumentsCount: requirements.length,
    requirements: requirements.map((r: any) => ({
      id: r.id,
      requirementKey: r.requirementKey,
      documentTypeId: r.documentTypeId,
      documentTypeKey: r.documentType?.canonicalKey || "",
      documentTypeName: r.documentType?.displayName || r.label,
      documentTypeCategory: r.documentType?.category || "",
      label: r.label,
      description: r.description,
      requirementType: r.requirementType,
      requirementCategory: r.requirementCategory || "DOCUMENT_REQUIREMENT",
      required: r.required ?? r.requirementType === "REQUIRED",
      condition: r.condition || r.conditionKey || null,
      notes: r.notes || null,
      priority: r.priority || r.sortOrder || 0,
      conditionKey: r.conditionKey,
      sortOrder: r.sortOrder,
      sourceReference: r.sourceReference,
      sourceTitle: r.sourceTitle,
      sourceUrl: r.sourceUrl,
      source: {
        name: r.source?.name || "Official Reference",
        sourceType: r.source?.sourceType || "OFFICIAL_REFERENCE",
        referenceUrl: r.source?.referenceUrl || null,
        notes: r.source?.notes || null,
      },
    })),
  };
}

const serviceInclude = {
  requirements: {
    include: {
      documentType: {
        include: {
          aliases: true,
        },
      },
      source: true,
    },
    orderBy: {
      sortOrder: "asc" as const,
    },
  },
};

/**
 * Retrieves service requirement specification by slug (e.g. "kcet", "neet-ug", "jee-main").
 */
export async function getServiceBySlug(
  slug: string,
  db: PrismaClient = prisma
): Promise<ServiceRequirement | null> {
  if (!slug || typeof slug !== "string") {
    return null;
  }
  const cleanSlug = slug.toLowerCase().trim();

  try {
    const service = await db.service.findUnique({
      where: { slug: cleanSlug },
      include: serviceInclude,
    });
    if (service) {
      return mapPrismaServiceToRequirement(service);
    }
  } catch {
    // Fall back to in-memory registry
  }

  return getServiceRequirement(cleanSlug);
}

/**
 * Retrieves service requirement specification by key (e.g. "KCET_APPLICATION", "NEET_UG_APPLICATION").
 */
export async function getServiceByKey(
  serviceKey: string,
  db: PrismaClient = prisma
): Promise<ServiceRequirement | null> {
  if (!serviceKey || typeof serviceKey !== "string") {
    return null;
  }
  const cleanKey = serviceKey.trim().toUpperCase();

  try {
    const service = await db.service.findUnique({
      where: { serviceKey: cleanKey },
      include: serviceInclude,
    });
    if (service) {
      return mapPrismaServiceToRequirement(service);
    }
  } catch {
    // Fall back
  }

  return getServiceRequirement(serviceKey);
}

/**
 * Retrieves service requirement specification by display name.
 */
export async function getServiceByName(
  name: string,
  db: PrismaClient = prisma
): Promise<ServiceRequirement | null> {
  if (!name || typeof name !== "string") {
    return null;
  }
  const normalized = normalizeServiceKey(name);

  try {
    const services = await db.service.findMany({
      where: { active: true },
      include: serviceInclude,
    });

    // 1. Exact match on name, shortName, or slug
    const exact = services.find(
      (s) =>
        normalizeServiceKey(s.name) === normalized ||
        (s.shortName && normalizeServiceKey(s.shortName) === normalized) ||
        normalizeServiceKey(s.slug) === normalized
    );
    if (exact) {
      return mapPrismaServiceToRequirement(exact);
    }

    // 2. Exact alias match from KNOWN_SERVICES
    const allAliases: Array<{ key: string; slug?: string; alias: string }> = [];
    for (const ks of KNOWN_SERVICES) {
      for (const alias of ks.aliases) {
        allAliases.push({ key: ks.key, slug: (ks as any).slug, alias });
      }
    }
    allAliases.sort((a, b) => b.alias.length - a.alias.length);

    for (const item of allAliases) {
      const normAlias = normalizeServiceKey(item.alias);
      if (normalized === normAlias) {
        const matched = services.find(
          (s) =>
            (item.slug && s.slug === item.slug) ||
            normalizeServiceKey(s.name) === normalizeServiceKey(item.key) ||
            (s.shortName && normalizeServiceKey(s.shortName) === normalizeServiceKey(item.key)) ||
            normalizeServiceKey(s.slug) === normalizeServiceKey(item.key) ||
            normalizeServiceKey(s.name).startsWith(normalizeServiceKey(item.key))
        );
        if (matched) {
          return mapPrismaServiceToRequirement(matched);
        }
      }
    }

    // 3. Prefix / Substring alias match sorted by longest match
    for (const item of allAliases) {
      const normAlias = normalizeServiceKey(item.alias);
      if (normalized.includes(normAlias) || normAlias.includes(normalized)) {
        const matched = services.find(
          (s) =>
            (item.slug && s.slug === item.slug) ||
            normalizeServiceKey(s.name) === normalizeServiceKey(item.key) ||
            (s.shortName && normalizeServiceKey(s.shortName) === normalizeServiceKey(item.key)) ||
            normalizeServiceKey(s.slug) === normalizeServiceKey(item.key) ||
            normalizeServiceKey(s.name).startsWith(normalizeServiceKey(item.key))
        );
        if (matched) {
          return mapPrismaServiceToRequirement(matched);
        }
      }
    }
  } catch {
    // Fall back
  }

  return getServiceRequirement(name);
}

/**
 * Retrieves service requirement specification by alias.
 */
export async function getServiceByAlias(
  alias: string,
  db: PrismaClient = prisma
): Promise<ServiceRequirement | null> {
  return getServiceByName(alias, db);
}

/**
 * Retrieves all registered services as generic ServiceDTOs for display and listing.
 * Includes fallback to built-in requirements if database is empty or unavailable.
 */
export async function getAllServices(db: PrismaClient = prisma): Promise<ServiceDTO[]> {
  try {
    const services = await db.service.findMany({
      where: { active: true },
      include: serviceInclude,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    if (services.length > 0) {
      return services.map(mapPrismaServiceToDTO);
    }
  } catch {
    // Fall back to in-memory catalog
  }

  return Object.values(DEMO_SERVICE_REQUIREMENTS).map((req) => ({
    id: req.slug || req.serviceId,
    slug: req.slug || req.serviceId,
    serviceKey: req.serviceKey || req.serviceId.toUpperCase(),
    name: req.serviceName,
    shortName: req.shortName || req.serviceName,
    shortDescription: req.description || "",
    description: req.description || "",
    category: req.category || "OTHER",
    providerName: req.authority || "Government Authority",
    authority: req.authority || "Government Authority",
    jurisdiction: req.jurisdiction || "National",
    officialWebsite: req.officialWebsite || null,
    officialApplicationUrl: req.officialApplicationUrl || null,
    availabilityStatus: req.availabilityStatus || "SUPPORTED",
    provenanceStatus: req.provenanceStatus || "VERIFIED_OFFICIAL",
    eligibilitySummary: req.eligibilitySummary || null,
    prototypeNotice: req.prototypeNotice || null,
    version: req.version || "1.0.0",
    lastReviewedAt: null,
    lastVerifiedAt: null,
    active: true,
    requiredDocumentsCount: req.requiredDocuments.filter((d) => d.required).length,
    totalDocumentsCount: req.requiredDocuments.length,
    requirements: req.requiredDocuments.map((d, idx) => ({
      id: `${req.serviceId}-${d.documentType}`,
      requirementKey: d.documentType,
      documentTypeId: d.documentType,
      documentTypeKey: d.documentType,
      documentTypeName: d.displayName,
      documentTypeCategory: "IDENTITY",
      label: d.displayName,
      description: d.notes || "",
      requirementType: d.required ? "REQUIRED" : "OPTIONAL",
      requirementCategory: d.requirementCategory || "DOCUMENT_REQUIREMENT",
      required: d.required,
      condition: d.condition || null,
      conditionKey: d.condition || null,
      notes: d.notes || null,
      priority: d.priority || idx + 1,
      sortOrder: idx + 1,
      sourceReference: d.sourceReference || null,
      sourceTitle: d.sourceTitle || null,
      sourceUrl: d.sourceUrl || null,
      source: {
        name: d.sourceReference || "Official Reference",
        sourceType: "OFFICIAL_REFERENCE",
        referenceUrl: d.sourceUrl || null,
        notes: null,
      },
    })),
  }));
}

export const getAllRegisteredServices = getAllServices;

/**
 * Retrieves all registered services as simplified ServiceSummary items for quick listings.
 */
export async function getAllServiceSummaries(
  db: PrismaClient = prisma
): Promise<ServiceSummary[]> {
  try {
    const services = await db.service.findMany({
      where: { active: true },
      include: {
        requirements: {
          select: { id: true, required: true, requirementType: true },
        },
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    if (services.length > 0) {
      return services.map((s) => ({
        id: s.id,
        slug: s.slug,
        serviceKey: s.serviceKey,
        name: s.name,
        shortName: s.shortName,
        shortDescription: s.shortDescription,
        category: s.category,
        providerName: s.providerName,
        authority: s.authority,
        jurisdiction: s.jurisdiction,
        availabilityStatus: s.availabilityStatus,
        requiredDocumentsCount: s.requirements.filter(
          (r) => r.required === true || r.requirementType === "REQUIRED"
        ).length,
        totalDocumentsCount: s.requirements.length,
      }));
    }
  } catch {
    // Fall back to in-memory catalog
  }

  return Object.values(DEMO_SERVICE_REQUIREMENTS).map((req) => ({
    id: req.slug || req.serviceId,
    slug: req.slug || req.serviceId,
    serviceKey: req.serviceKey || req.serviceId.toUpperCase(),
    name: req.serviceName,
    shortName: req.shortName || req.serviceName,
    shortDescription: req.description || "",
    category: req.category || "OTHER",
    providerName: req.authority || "Government Authority",
    authority: req.authority || "Government Authority",
    jurisdiction: req.jurisdiction || "National",
    availabilityStatus: req.availabilityStatus || "SUPPORTED",
    requiredDocumentsCount: req.requiredDocuments.filter((d) => d.required).length,
    totalDocumentsCount: req.requiredDocuments.length,
  }));
}

/**
 * Retrieves services filtered by category.
 */
export async function getServicesByCategory(
  category: string,
  db: PrismaClient = prisma
): Promise<ServiceDTO[]> {
  const all = await getAllServices(db);
  const normCategory = category.toUpperCase().trim();
  if (normCategory === "ALL" || !normCategory) {
    return all;
  }
  return all.filter((s) => s.category.toUpperCase() === normCategory);
}

/**
 * Retrieves all currently supported services.
 */
export async function getSupportedServices(db: PrismaClient = prisma): Promise<ServiceDTO[]> {
  const all = await getAllServices(db);
  return all.filter((s) => s.availabilityStatus === "SUPPORTED");
}

/**
 * Retrieves services marked as Coming Soon.
 */
export async function getComingSoonServices(db: PrismaClient = prisma): Promise<ServiceDTO[]> {
  const all = await getAllServices(db);
  return all.filter((s) => s.availabilityStatus === "COMING_SOON");
}

/**
 * Retrieves services for a specific conducting authority.
 */
export async function getServicesByAuthority(
  authority: string,
  db: PrismaClient = prisma
): Promise<ServiceDTO[]> {
  const all = await getAllServices(db);
  const normAuth = normalizeServiceKey(authority);
  return all.filter((s) => s.authority && normalizeServiceKey(s.authority).includes(normAuth));
}

/**
 * Searches services with optional category, status, jurisdiction, and authority filters.
 */
export async function searchServices(
  query: string,
  options?: { category?: string; status?: string; jurisdiction?: string; authority?: string },
  db: PrismaClient = prisma
): Promise<ServiceDTO[]> {
  const all = await getAllServices(db);
  let filtered = all;

  if (options?.category && options.category.toUpperCase() !== "ALL") {
    const cat = options.category.toUpperCase().trim();
    filtered = filtered.filter((s) => s.category.toUpperCase() === cat);
  }

  if (options?.status && options.status.toUpperCase() !== "ALL") {
    const stat = options.status.toUpperCase().trim();
    filtered = filtered.filter((s) => s.availabilityStatus.toUpperCase() === stat);
  }

  if (options?.jurisdiction && options.jurisdiction.toUpperCase() !== "ALL") {
    const jur = normalizeServiceKey(options.jurisdiction);
    filtered = filtered.filter((s) => s.jurisdiction && normalizeServiceKey(s.jurisdiction).includes(jur));
  }

  if (options?.authority && options.authority.toUpperCase() !== "ALL") {
    const auth = normalizeServiceKey(options.authority);
    filtered = filtered.filter((s) => s.authority && normalizeServiceKey(s.authority).includes(auth));
  }

  if (!query || !query.trim()) {
    return filtered;
  }

  const normQuery = normalizeServiceKey(query);
  return filtered.filter((s) => {
    const normName = normalizeServiceKey(s.name);
    const normShortName = normalizeServiceKey(s.shortName || "");
    const normSlug = normalizeServiceKey(s.slug);
    const normDesc = normalizeServiceKey(s.shortDescription);
    const normAuth = normalizeServiceKey(s.authority || "");
    const normJur = normalizeServiceKey(s.jurisdiction || "");

    // Check alias match from KNOWN_SERVICES
    const matchedKnown = KNOWN_SERVICES.find(
      (ks) =>
        normalizeServiceKey(ks.key) === normName ||
        normalizeServiceKey(ks.key) === normSlug ||
        (s.shortName && normalizeServiceKey(ks.key) === normShortName)
    );
    const aliasMatch = matchedKnown?.aliases.some((a) => {
      const na = normalizeServiceKey(a);
      return na.includes(normQuery) || normQuery.includes(na);
    });

    return (
      normName.includes(normQuery) ||
      normShortName.includes(normQuery) ||
      normSlug.includes(normQuery) ||
      normDesc.includes(normQuery) ||
      normAuth.includes(normQuery) ||
      normJur.includes(normQuery) ||
      Boolean(aliasMatch)
    );
  });
}

/**
 * Synchronous & backward-compatible service requirement lookup.
 * Resolves by service name, key, slug, or alias.
 */
export function getServiceRequirement(serviceName: string): ServiceRequirement | null {
  if (!serviceName || typeof serviceName !== "string") {
    return null;
  }

  const normalized = normalizeServiceKey(serviceName);
  if (!normalized) {
    return null;
  }

  // 1. Direct key match (e.g. "kcet", "neet_ug", "jee_main", "scholarship", "income_certificate", "passport", "epfo", "pension")
  const keyCandidate = normalized.replace(/\s+/g, "_");
  const slugCandidate = normalized.replace(/\s+/g, "-");

  if (DEMO_SERVICE_REQUIREMENTS[slugCandidate]) {
    return DEMO_SERVICE_REQUIREMENTS[slugCandidate];
  }
  if (DEMO_SERVICE_REQUIREMENTS[keyCandidate]) {
    return DEMO_SERVICE_REQUIREMENTS[keyCandidate];
  }
  if (DEMO_SERVICE_REQUIREMENTS[normalized]) {
    return DEMO_SERVICE_REQUIREMENTS[normalized];
  }

  // 2. Match against display names, slugs, or shortNames
  for (const req of Object.values(DEMO_SERVICE_REQUIREMENTS)) {
    if (
      normalizeServiceKey(req.serviceName) === normalized ||
      (req.slug && normalizeServiceKey(req.slug) === normalized) ||
      (req.shortName && normalizeServiceKey(req.shortName) === normalized) ||
      (req.serviceKey && normalizeServiceKey(req.serviceKey) === normalized)
    ) {
      return req;
    }
  }

  // 3. Match against KNOWN_SERVICES aliases from the intent layer (sorted by length descending)
  const allAliases: Array<{ key: string; slug?: string; alias: string }> = [];
  for (const ks of KNOWN_SERVICES) {
    for (const alias of ks.aliases) {
      allAliases.push({ key: ks.key, slug: (ks as any).slug, alias });
    }
  }
  allAliases.sort((a, b) => b.alias.length - a.alias.length);

  // Exact alias match first
  for (const item of allAliases) {
    const normAlias = normalizeServiceKey(item.alias);
    if (normalized === normAlias) {
      const matched = Object.values(DEMO_SERVICE_REQUIREMENTS).find(
        (r) =>
          (item.slug && r.slug === item.slug) ||
          normalizeServiceKey(r.serviceName) === normalizeServiceKey(item.key) ||
          (r.shortName && normalizeServiceKey(r.shortName) === normalizeServiceKey(item.key)) ||
          (r.slug && normalizeServiceKey(r.slug) === normalizeServiceKey(item.key)) ||
          normalizeServiceKey(r.serviceName).startsWith(normalizeServiceKey(item.key))
      );
      if (matched) {
        return matched;
      }
    }
  }

  // Substring alias match
  for (const item of allAliases) {
    const normAlias = normalizeServiceKey(item.alias);
    if (normalized.includes(normAlias) || normAlias.includes(normalized)) {
      const matched = Object.values(DEMO_SERVICE_REQUIREMENTS).find(
        (r) =>
          (item.slug && r.slug === item.slug) ||
          normalizeServiceKey(r.serviceName) === normalizeServiceKey(item.key) ||
          (r.shortName && normalizeServiceKey(r.shortName) === normalizeServiceKey(item.key)) ||
          (r.slug && normalizeServiceKey(r.slug) === normalizeServiceKey(item.key)) ||
          normalizeServiceKey(r.serviceName).startsWith(normalizeServiceKey(item.key))
      );
      if (matched) {
        return matched;
      }
    }
  }

  return null;
}

/**
 * Retrieves all registered demo service requirement specifications.
 */
export function getAllServiceRequirements(): ServiceRequirement[] {
  // Return deduplicated list by serviceId
  const uniqueMap = new Map<string, ServiceRequirement>();
  for (const req of Object.values(DEMO_SERVICE_REQUIREMENTS)) {
    if (!uniqueMap.has(req.serviceId)) {
      uniqueMap.set(req.serviceId, req);
    }
  }
  return Array.from(uniqueMap.values());
}


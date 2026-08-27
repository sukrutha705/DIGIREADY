import { prisma } from "@/lib/prisma";
import type { PrismaClient, Service, ServiceRequirement, DocumentType, RequirementSource } from "@prisma/client";
import type { ServiceRequirementResult, ServiceRequirementItem } from "@/types/service";

export type ServiceRequirementWithRelations = ServiceRequirement & {
  documentType: DocumentType;
  source: RequirementSource;
};

export type ServiceWithRequirements = Service & {
  requirements: ServiceRequirementWithRelations[];
};

/**
 * Retrieves a service by its unique canonical serviceKey.
 * Generic and purely data-driven — contains no service-specific hardcoded branching.
 */
export async function getServiceByKey(
  serviceKey: string,
  db: PrismaClient = prisma
): Promise<Service | null> {
  const trimmed = serviceKey?.trim();
  if (!trimmed) {
    return null;
  }

  return db.service.findUnique({
    where: { serviceKey: trimmed },
  });
}

/**
 * Retrieves the ordered list of requirements for a given serviceKey,
 * including related canonical DocumentType and RequirementSource provenance.
 */
export async function getServiceRequirements(
  serviceKey: string,
  db: PrismaClient = prisma
): Promise<ServiceRequirementWithRelations[]> {
  const trimmed = serviceKey?.trim();
  if (!trimmed) {
    return [];
  }

  const service = await db.service.findUnique({
    where: { serviceKey: trimmed },
    include: {
      requirements: {
        orderBy: { sortOrder: "asc" },
        include: {
          documentType: true,
          source: true,
        },
      },
    },
  });

  return service ? service.requirements : [];
}

/**
 * Resolves full requirement metadata for a service into a clean, stable DTO shape
 * for downstream use.
 * 
 * Returns null if the service does not exist.
 */
export async function resolveRequirementsForService(
  serviceKey: string,
  db: PrismaClient = prisma
): Promise<ServiceRequirementResult | null> {
  const trimmed = serviceKey?.trim();
  if (!trimmed) {
    return null;
  }

  const service = await db.service.findUnique({
    where: { serviceKey: trimmed },
    include: {
      requirements: {
        orderBy: { sortOrder: "asc" },
        include: {
          documentType: true,
          source: true,
        },
      },
    },
  });

  if (!service) {
    return null;
  }

  const requirementItems: ServiceRequirementItem[] = service.requirements.map((req) => ({
    id: req.id,
    requirementKey: req.requirementKey,
    documentTypeId: req.documentTypeId,
    documentTypeKey: req.documentType.canonicalKey,
    documentTypeName: req.documentType.displayName,
    documentTypeCategory: req.documentType.category,
    label: req.label,
    description: req.description,
    requirementType: req.requirementType,
    conditionKey: req.conditionKey,
    sortOrder: req.sortOrder,
    source: {
      name: req.source.name,
      sourceType: req.source.sourceType,
      referenceUrl: req.source.referenceUrl,
      notes: req.source.notes,
    },
  }));

  return {
    serviceId: service.id,
    serviceKey: service.serviceKey,
    serviceName: service.name,
    shortDescription: service.shortDescription,
    category: service.category,
    providerName: service.providerName,
    active: service.active,
    requirements: requirementItems,
  };
}

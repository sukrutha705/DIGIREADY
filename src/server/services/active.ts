import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import { UserActiveServiceDTO } from "@/types/service";
import { getServiceReadiness } from "./readiness";
import { getVaultConsistencyAssessment } from "@/server/consistency";
import { normalizeServiceKey } from "./registry";

/**
 * Retrieves all active application preparations for a citizen with live readiness metrics.
 */
export async function getUserActivePreparations(
  userId: string,
  db: PrismaClient = prisma
): Promise<UserActiveServiceDTO[]> {
  if (!userId || typeof userId !== "string") {
    return [];
  }

  try {
    const activeRecords = await db.userActiveService.findMany({
      where: {
        userId,
        status: "ACTIVE",
      },
      include: {
        service: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (!activeRecords || activeRecords.length === 0) {
      return [];
    }

    const consistency = await getVaultConsistencyAssessment(userId, db);

    const preparations: UserActiveServiceDTO[] = [];

    for (const record of activeRecords) {
      const service = record.service;
      const readiness = await getServiceReadiness(userId, service.slug, db);

      const missingNames = readiness
        ? readiness.documents
            .filter((d) => d.required && d.status === "MISSING")
            .map((d) => d.displayName)
        : [];

      preparations.push({
        id: record.id,
        userId: record.userId,
        serviceId: service.id,
        slug: service.slug,
        serviceName: service.shortName || service.name,
        shortName: service.shortName,
        category: service.category,
        authority: service.authority,
        status: record.status,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
        readinessSummary: readiness
          ? {
              requiredCount: readiness.requiredCount,
              availableCount: readiness.availableCount,
              missingCount: readiness.missingCount,
              ready: readiness.ready && !consistency.hasConflicts,
              missingDocumentNames: missingNames,
              hasConflicts: consistency.hasConflicts,
            }
          : undefined,
      });
    }

    return preparations;
  } catch (error) {
    console.error("Failed to load user active preparations:", error);
    return [];
  }
}

/**
 * Adds or reactivates an application preparation for a citizen.
 */
export async function addUserActivePreparation(
  userId: string,
  serviceIdentifier: string,
  db: PrismaClient = prisma
): Promise<UserActiveServiceDTO | null> {
  if (!userId || !serviceIdentifier) {
    return null;
  }

  const cleanIdent = serviceIdentifier.trim();
  const normIdent = normalizeServiceKey(cleanIdent);

  // Find target service by slug, key, id, or name
  let targetService = await db.service.findFirst({
    where: {
      OR: [
        { slug: cleanIdent.toLowerCase() },
        { serviceKey: cleanIdent.toUpperCase() },
        { id: cleanIdent },
      ],
    },
  });

  if (!targetService) {
    const allServices = await db.service.findMany({ where: { active: true } });
    targetService =
      allServices.find(
        (s) =>
          normalizeServiceKey(s.name) === normIdent ||
          (s.shortName && normalizeServiceKey(s.shortName) === normIdent) ||
          normalizeServiceKey(s.slug) === normIdent
      ) || null;
  }

  if (!targetService) {
    return null;
  }

  // Upsert active preparation
  const activeRecord = await db.userActiveService.upsert({
    where: {
      userId_serviceId: {
        userId,
        serviceId: targetService.id,
      },
    },
    update: {
      status: "ACTIVE",
      updatedAt: new Date(),
    },
    create: {
      userId,
      serviceId: targetService.id,
      status: "ACTIVE",
    },
    include: {
      service: true,
    },
  });

  const readiness = await getServiceReadiness(userId, targetService.slug, db);
  const consistency = await getVaultConsistencyAssessment(userId, db);

  const missingNames = readiness
    ? readiness.documents
        .filter((d) => d.required && d.status === "MISSING")
        .map((d) => d.displayName)
    : [];

  return {
    id: activeRecord.id,
    userId: activeRecord.userId,
    serviceId: targetService.id,
    slug: targetService.slug,
    serviceName: targetService.shortName || targetService.name,
    shortName: targetService.shortName,
    category: targetService.category,
    authority: targetService.authority,
    status: activeRecord.status,
    createdAt: activeRecord.createdAt.toISOString(),
    updatedAt: activeRecord.updatedAt.toISOString(),
    readinessSummary: readiness
      ? {
          requiredCount: readiness.requiredCount,
          availableCount: readiness.availableCount,
          missingCount: readiness.missingCount,
          ready: readiness.ready && !consistency.hasConflicts,
          missingDocumentNames: missingNames,
          hasConflicts: consistency.hasConflicts,
        }
      : undefined,
  };
}

/**
 * Removes or archives an application preparation for a citizen.
 */
export async function removeUserActivePreparation(
  userId: string,
  preparationIdOrSlug: string,
  db: PrismaClient = prisma
): Promise<boolean> {
  if (!userId || !preparationIdOrSlug) {
    return false;
  }

  const cleanIdent = preparationIdOrSlug.trim();

  try {
    // Try by preparation ID first
    const byId = await db.userActiveService.findFirst({
      where: {
        id: cleanIdent,
        userId,
      },
    });

    if (byId) {
      await db.userActiveService.delete({
        where: { id: byId.id },
      });
      return true;
    }

    // Try by service slug or serviceKey
    const byService = await db.service.findFirst({
      where: {
        OR: [
          { slug: cleanIdent.toLowerCase() },
          { serviceKey: cleanIdent.toUpperCase() },
        ],
      },
    });

    if (byService) {
      const activeRecord = await db.userActiveService.findFirst({
        where: {
          userId,
          serviceId: byService.id,
        },
      });

      if (activeRecord) {
        await db.userActiveService.delete({
          where: { id: activeRecord.id },
        });
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Failed to remove active preparation:", error);
    return false;
  }
}

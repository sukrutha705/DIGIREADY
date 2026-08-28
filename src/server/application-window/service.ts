/**
 * DigiReady - Application Window Service
 * Phase 9.2: Resolves application window and deadline data for services.
 */

import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import { evaluateApplicationWindow } from "./engine";
import { ApplicationWindowInfo } from "./types";
import { getServiceByName } from "@/server/services/registry";

export async function getApplicationWindowInfo(
  serviceQuery: string,
  db: PrismaClient = prisma
): Promise<ApplicationWindowInfo> {
  const service = await getServiceByName(serviceQuery, db);
  const slug = service?.slug || serviceQuery.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const windowInfo = evaluateApplicationWindow(slug);

  if (service) {
    windowInfo.serviceName = service.serviceName || (service as any).name || windowInfo.serviceName;
    windowInfo.slug = service.slug;
    windowInfo.officialWebsite = service.officialWebsite || null;
    windowInfo.officialApplicationUrl = service.officialApplicationUrl || null;
  }

  return windowInfo;
}

import { prisma } from "@/lib/prisma";
import type { PrismaClient, Service } from "@prisma/client";
import type { ServiceRequirementResult } from "@/types/service";
import {
  getServiceByKey,
  getServiceRequirements,
  resolveRequirementsForService,
  type ServiceRequirementWithRelations,
} from "@/server/service-requirements";

/**
 * Common abstraction for service requirement knowledge sources.
 * Allows the application to resolve requirements seamlessly from:
 * - Local Database (current prototype)
 * - Mock Government APIs (prototype simulations)
 * - Future Authorized Official Government APIs
 */
export interface ServiceRequirementSource {
  readonly sourceName: string;
  readonly sourceType: string;
  getServiceByKey(serviceKey: string): Promise<Service | null>;
  getServiceRequirements(serviceKey: string): Promise<ServiceRequirementWithRelations[]>;
  resolveRequirementsForService(serviceKey: string): Promise<ServiceRequirementResult | null>;
}

/**
 * Standard database-backed Service Requirement Source.
 */
export class DatabaseServiceRequirementSource implements ServiceRequirementSource {
  readonly sourceName = "Database Service Knowledge Registry";
  readonly sourceType = "MOCK_REFERENCE";

  constructor(private db: PrismaClient = prisma) {}

  async getServiceByKey(serviceKey: string): Promise<Service | null> {
    return getServiceByKey(serviceKey, this.db);
  }

  async getServiceRequirements(serviceKey: string): Promise<ServiceRequirementWithRelations[]> {
    return getServiceRequirements(serviceKey, this.db);
  }

  async resolveRequirementsForService(serviceKey: string): Promise<ServiceRequirementResult | null> {
    return resolveRequirementsForService(serviceKey, this.db);
  }
}

/**
 * Mock Government Source simulating an external government service gateway.
 * Exposes requirements through the exact same ServiceRequirementSource contract.
 */
export class MockGovernmentSource implements ServiceRequirementSource {
  readonly sourceName = "Demo Government Service Gateway (Mock)";
  readonly sourceType = "MOCK_API";

  constructor(private db: PrismaClient = prisma) {}

  async getServiceByKey(serviceKey: string): Promise<Service | null> {
    return getServiceByKey(serviceKey, this.db);
  }

  async getServiceRequirements(serviceKey: string): Promise<ServiceRequirementWithRelations[]> {
    return getServiceRequirements(serviceKey, this.db);
  }

  async resolveRequirementsForService(serviceKey: string): Promise<ServiceRequirementResult | null> {
    return resolveRequirementsForService(serviceKey, this.db);
  }
}

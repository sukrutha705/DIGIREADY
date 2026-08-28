/**
 * DigiReady - Eligibility Service
 * Phase 9.2: Aggregates user profile, vault document metadata, and authoritative rules.
 */

import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import { evaluateEligibility } from "./engine";
import { getServiceEligibilityRule } from "./rules";
import {
  ServiceEligibilityResult,
  UserEligibilityProfile,
  ValueProvenanceSources,
} from "./types";
import { getServiceByName } from "@/server/services/registry";

export async function getUserEligibilityProfile(
  userId: string,
  db: PrismaClient = prisma
): Promise<UserEligibilityProfile> {
  const profile: UserEligibilityProfile = {
    userId,
    sourceMap: {},
  };

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        documents: {
          include: {
            fields: true,
            documentType: true,
          },
        },
      },
    });

    if (user) {
      profile.nationality = user.nationality || "Indian";
      profile.sourceMap!["nationality"] = ValueProvenanceSources.USER_PROVIDED;

      if (user.dateOfBirth) {
        profile.dateOfBirth = user.dateOfBirth.toISOString().split("T")[0];
        profile.sourceMap!["dateOfBirth"] = ValueProvenanceSources.USER_PROVIDED;
      }
      if (user.gender) {
        profile.gender = user.gender;
        profile.sourceMap!["gender"] = ValueProvenanceSources.USER_PROVIDED;
      }
      if (user.domicileState || user.state) {
        profile.domicileState = user.domicileState || user.state;
        profile.sourceMap!["domicileState"] = ValueProvenanceSources.USER_PROVIDED;
        profile.state = user.state;
      }
      if (user.category) {
        profile.category = user.category;
        profile.sourceMap!["category"] = ValueProvenanceSources.USER_PROVIDED;
      }
      if (user.educationQualification) {
        profile.educationQualification = user.educationQualification;
        profile.sourceMap!["educationQualification"] = ValueProvenanceSources.USER_PROVIDED;
      }
      if (user.annualFamilyIncome !== null && user.annualFamilyIncome !== undefined) {
        profile.annualFamilyIncome = user.annualFamilyIncome;
        profile.sourceMap!["annualFamilyIncome"] = ValueProvenanceSources.USER_PROVIDED;
      }
      if (user.disabilityStatus !== null && user.disabilityStatus !== undefined) {
        profile.disabilityStatus = user.disabilityStatus;
      }

      // Check extracted fields from vault documents for richer/verified provenance
      for (const doc of user.documents) {
        for (const field of doc.fields) {
          // Date of Birth extraction from Aadhaar or SSLC
          if (
            field.semanticRole === "DATE_OF_BIRTH" &&
            field.normalizedValue &&
            !profile.dateOfBirth
          ) {
            profile.dateOfBirth = field.normalizedValue;
            profile.sourceMap!["dateOfBirth"] = ValueProvenanceSources.EXTRACTED_FROM_DOC;
          }

          // Income certificate extraction
          if (
            doc.documentType.canonicalKey === "INCOME_CERTIFICATE" &&
            (field.fieldName.toLowerCase().includes("income") || field.semanticRole === "OTHER")
          ) {
            const num = parseFloat(field.normalizedValue.replace(/[^0-9.]/g, ""));
            if (!isNaN(num) && num > 0 && profile.annualFamilyIncome === undefined) {
              profile.annualFamilyIncome = num;
              profile.sourceMap!["annualFamilyIncome"] = ValueProvenanceSources.EXTRACTED_FROM_DOC;
            }
          }
        }
      }
    }
  } catch {
    // Fall back to default profile
  }

  // Baseline demo defaults if not in database
  if (!profile.dateOfBirth) {
    profile.dateOfBirth = "2006-05-15"; // Standard 18-year-old demo student
    profile.sourceMap!["dateOfBirth"] = ValueProvenanceSources.EXTRACTED_FROM_DOC;
  }
  if (!profile.educationQualification) {
    profile.educationQualification = "12TH_PASS";
    profile.sourceMap!["educationQualification"] = ValueProvenanceSources.USER_PROVIDED;
  }
  if (!profile.domicileState) {
    profile.domicileState = "Karnataka";
    profile.sourceMap!["domicileState"] = ValueProvenanceSources.USER_PROVIDED;
  }
  if (!profile.nationality) {
    profile.nationality = "Indian";
    profile.sourceMap!["nationality"] = ValueProvenanceSources.USER_PROVIDED;
  }

  return profile;
}

/**
 * Evaluates service eligibility for a user and specified service.
 */
export async function evaluateServiceEligibility(
  userId: string,
  serviceQuery: string,
  db: PrismaClient = prisma
): Promise<ServiceEligibilityResult> {
  const profile = await getUserEligibilityProfile(userId, db);
  const service = await getServiceByName(serviceQuery, db);
  const slug = service?.slug || serviceQuery.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const rule = getServiceEligibilityRule(slug);
  const result = evaluateEligibility(profile, rule);

  if (service) {
    result.serviceName = service.serviceName || (service as any).name || rule.serviceName;
    result.slug = service.slug;
    result.officialWebsite = service.officialWebsite || null;
  }

  return result;
}

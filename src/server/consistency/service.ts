/**
 * DigiReady - Cross-Document Consistency Service
 * Deterministically evaluates consistency of identity attributes across all vault documents.
 */

import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import { UserNotFoundError } from "@/server/readiness";
import { getUserDocuments } from "@/server/vault";
import {
  normalizeName,
  normalizeDob,
  normalizeGender,
  normalizeParentName,
  normalizeAddress,
} from "./policy";
import type {
  ComparisonFieldKey,
  ConsistencyAssessment,
  DocumentFieldEntry,
  FieldConsistencyComparison,
} from "./types";
import { generateConflictGuidance } from "@/server/conflicts/guidance";

export async function getVaultConsistencyAssessment(
  userId: string,
  db: PrismaClient = prisma
): Promise<ConsistencyAssessment> {
  const trimmedUserId = userId?.trim();
  if (!trimmedUserId) {
    throw new UserNotFoundError(userId || "EMPTY_USER_ID");
  }

  let user: {
    id: string;
    documents: Array<{
      id: string;
      displayName: string;
      issuer?: string | null;
      documentType: { canonicalKey: string; category: string };
      fields: Array<{
        fieldName: string;
        semanticRole: string | null;
        normalizedValue: string;
      }>;
    }>;
  } | null = null;

  try {
    const dbUser = await db.user.findUnique({
      where: { id: trimmedUserId },
      include: {
        documents: {
          include: {
            documentType: true,
            fields: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (dbUser) {
      user = dbUser;
    }
  } catch (err) {
    console.warn(
      "[Consistency] Database query failed or uninitialized. Using safe document fallback:",
      err instanceof Error ? err.message : String(err)
    );
  }

  if (!user) {
    const fallbackDocs = await getUserDocuments(trimmedUserId, undefined, db);
    if (fallbackDocs && fallbackDocs.length > 0) {
      user = {
        id: trimmedUserId,
        documents: fallbackDocs.map((d) => ({
          id: d.id,
          displayName: d.displayName,
          issuer: d.issuer || null,
          documentType: {
            canonicalKey: d.documentTypeKey,
            category: d.category,
          },
          fields: d.fields.map((f) => ({
            fieldName: f.fieldName,
            semanticRole: f.semanticRole,
            normalizedValue: f.normalizedValue,
          })),
        })),
      };
    }
  }

  if (!user) {
    return {
      userId: trimmedUserId,
      hasConflicts: false,
      overallStatus: "NEEDS_REVIEW",
      conflictCount: 0,
      matchCount: 0,
      insufficientCount: 5,
      comparisons: [
        { fieldKey: "name", fieldLabel: "Applicant Name", status: "INSUFFICIENT_DATA", entries: [], distinctValues: [], explanation: "No records found.", severity: "INFO" },
        { fieldKey: "dateOfBirth", fieldLabel: "Date of Birth", status: "INSUFFICIENT_DATA", entries: [], distinctValues: [], explanation: "No records found.", severity: "INFO" },
        { fieldKey: "parentName", fieldLabel: "Parent / Guardian Name", status: "INSUFFICIENT_DATA", entries: [], distinctValues: [], explanation: "No records found.", severity: "INFO" },
        { fieldKey: "gender", fieldLabel: "Gender", status: "INSUFFICIENT_DATA", entries: [], distinctValues: [], explanation: "No records found.", severity: "INFO" },
        { fieldKey: "address", fieldLabel: "Residential Address", status: "INSUFFICIENT_DATA", entries: [], distinctValues: [], explanation: "No records found.", severity: "INFO" },
      ],
      conflicts: [],
      evaluatedAt: new Date().toISOString(),
      summaryNote: "No vault documents found for user.",
    };
  }

  // 1. Extract and normalize fields by semantic category
  const nameEntries: DocumentFieldEntry[] = [];
  const dobEntries: DocumentFieldEntry[] = [];
  const genderEntries: DocumentFieldEntry[] = [];
  const parentNameEntries: DocumentFieldEntry[] = [];
  const addressEntries: DocumentFieldEntry[] = [];

  for (const doc of user.documents) {
    for (const field of doc.fields) {
      const role = field.semanticRole;
      const fName = field.fieldName.toLowerCase();

      // Candidate Name
      if (
        role === "CANDIDATE_NAME" ||
        (!role && ["fullname", "candidatename", "studentname", "applicantname", "residentname", "name"].includes(fName))
      ) {
        nameEntries.push({
          documentId: doc.id,
          documentDisplayName: doc.displayName,
          documentTypeKey: doc.documentType.canonicalKey,
          fieldName: field.fieldName,
          semanticRole: field.semanticRole,
          rawValue: field.normalizedValue,
          normalizedValue: normalizeName(field.normalizedValue),
        });
      }

      // Date of Birth
      if (
        role === "DATE_OF_BIRTH" ||
        (!role && ["dateofbirth", "dob"].includes(fName))
      ) {
        dobEntries.push({
          documentId: doc.id,
          documentDisplayName: doc.displayName,
          documentTypeKey: doc.documentType.canonicalKey,
          fieldName: field.fieldName,
          semanticRole: field.semanticRole,
          rawValue: field.normalizedValue,
          normalizedValue: normalizeDob(field.normalizedValue),
        });
      }

      // Gender
      if (
        role === "GENDER" ||
        (!role && ["gender", "sex"].includes(fName))
      ) {
        genderEntries.push({
          documentId: doc.id,
          documentDisplayName: doc.displayName,
          documentTypeKey: doc.documentType.canonicalKey,
          fieldName: field.fieldName,
          semanticRole: field.semanticRole,
          rawValue: field.normalizedValue,
          normalizedValue: normalizeGender(field.normalizedValue),
        });
      }

      // Parent / Guardian Name
      if (
        role === "PARENT_NAME" ||
        (!role && ["fathername", "mothername", "parentname", "guardianname"].includes(fName))
      ) {
        parentNameEntries.push({
          documentId: doc.id,
          documentDisplayName: doc.displayName,
          documentTypeKey: doc.documentType.canonicalKey,
          fieldName: field.fieldName,
          semanticRole: field.semanticRole,
          rawValue: field.normalizedValue,
          normalizedValue: normalizeParentName(field.normalizedValue),
        });
      }

      // Address
      if (
        role === "ADDRESS" ||
        (!role && ["address", "addressline", "residentialaddress"].includes(fName))
      ) {
        addressEntries.push({
          documentId: doc.id,
          documentDisplayName: doc.displayName,
          documentTypeKey: doc.documentType.canonicalKey,
          fieldName: field.fieldName,
          semanticRole: field.semanticRole,
          rawValue: field.normalizedValue,
          normalizedValue: normalizeAddress(field.normalizedValue),
        });
      }
    }
  }

  // 2. Helper to build comparison block
  function buildComparison(
    fieldKey: ComparisonFieldKey,
    fieldLabel: string,
    entries: DocumentFieldEntry[],
    defaultSeverity: "CRITICAL" | "WARNING" = "WARNING"
  ): FieldConsistencyComparison {
    if (entries.length === 0) {
      return {
        fieldKey,
        fieldLabel,
        status: "INSUFFICIENT_DATA",
        entries: [],
        distinctValues: [],
        explanation: `No ${fieldLabel.toLowerCase()} fields found in current vault documents.`,
        severity: "INFO",
      };
    }

    const distinctValues = Array.from(new Set(entries.map((e) => e.normalizedValue).filter(Boolean)));

    if (entries.length === 1) {
      return {
        fieldKey,
        fieldLabel,
        status: "MATCH",
        entries,
        distinctValues,
        explanation: `Recorded on ${entries[0].documentDisplayName}. No conflicting records found.`,
        severity: "INFO",
      };
    }

    if (distinctValues.length > 1) {
      return {
        fieldKey,
        fieldLabel,
        status: "POTENTIAL_MISMATCH",
        entries,
        distinctValues,
        explanation: `Potential mismatch detected across ${entries.length} documents (${distinctValues.map((v) => `"${v}"`).join(" vs ")}). This may require attention before submitting your application.`,
        severity: defaultSeverity,
      };
    }

    return {
      fieldKey,
      fieldLabel,
      status: "MATCH",
      entries,
      distinctValues,
      explanation: `All ${entries.length} documents match identically ("${distinctValues[0]}").`,
      severity: "INFO",
    };
  }

  const rawDocsMap: Record<string, { issuer: string; rawExtractedValue?: string }> = {};
  user.documents.forEach((d) => {
    rawDocsMap[d.id] = { issuer: d.issuer || "Official Authority" };
  });

  const rawComparisons: FieldConsistencyComparison[] = [
    buildComparison("name", "Applicant Name", nameEntries, "WARNING"),
    buildComparison("dateOfBirth", "Date of Birth", dobEntries, "CRITICAL"),
    buildComparison("parentName", "Parent / Guardian Name", parentNameEntries, "CRITICAL"),
    buildComparison("gender", "Gender", genderEntries, "WARNING"),
    buildComparison("address", "Residential Address", addressEntries, "WARNING"),
  ];

  const comparisons: FieldConsistencyComparison[] = rawComparisons.map((c) => {
    if (c.status === "POTENTIAL_MISMATCH") {
      return {
        ...c,
        guidance: generateConflictGuidance(c, rawDocsMap),
      };
    }
    return c;
  });

  const conflicts = comparisons.filter((c) => c.status === "POTENTIAL_MISMATCH");
  const matches = comparisons.filter((c) => c.status === "MATCH");
  const insufficient = comparisons.filter((c) => c.status === "INSUFFICIENT_DATA");

  const hasConflicts = conflicts.length > 0;
  const summaryNote = hasConflicts
    ? `${conflicts.length} official document discrepancy requires correction before application submission.`
    : "No cross-document conflicts detected across available vault documents.";

  let overallStatus: "CONSISTENT" | "CONFLICT_DETECTED" | "OFFICIAL_CORRECTION_REQUIRED" | "USER_RECHECK_REQUIRED" | "NEEDS_REVIEW" | "RESOLVED" = "CONSISTENT";
  if (hasConflicts) {
    overallStatus = "OFFICIAL_CORRECTION_REQUIRED";
  } else if (matches.length === 0) {
    overallStatus = "NEEDS_REVIEW";
  } else {
    overallStatus = "CONSISTENT";
  }

  const conflictGuidanceList = conflicts.map((c) => c.guidance!).filter(Boolean);

  return {
    userId: user.id,
    hasConflicts,
    overallStatus,
    conflictCount: conflicts.length,
    matchCount: matches.length,
    insufficientCount: insufficient.length,
    comparisons,
    conflicts,
    conflictGuidanceList,
    evaluatedAt: new Date().toISOString(),
    summaryNote,
  };
}

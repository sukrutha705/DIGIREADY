/**
 * DigiReady - Deterministic Conflict Guidance Subsystem
 * Phase 9.3: Implements deterministic routing to official authorities, structured resolution plans, and centre requirements.
 */

import { GOVERNMENT_AUTHORITIES, type GovernmentAuthority } from "@/server/authorities";
import type {
  ConflictType,
  ConflictResolutionPath,
  ConflictGuidance,
  AffectedDocumentEntry,
  AuthorityCorrectionBranch,
  ConflictResolutionPlan,
} from "./types";
import type { FieldConsistencyComparison } from "@/server/consistency/types";

/**
 * Resolves the statutory authority responsible for correcting the given conflict.
 */
export function resolveCorrectionAuthority(
  conflict: FieldConsistencyComparison | { fieldKey: string; entries?: any[] }
): GovernmentAuthority {
  const fieldKey = conflict.fieldKey;
  const entries = conflict.entries || [];

  const hasAadhaar = entries.some((e: any) =>
    e.documentTypeKey === "GOVERNMENT_IDENTITY_PROOF" || (e.documentDisplayName || "").toLowerCase().includes("aadhaar")
  );
  const hasPassport = entries.some((e: any) =>
    e.documentTypeKey === "PASSPORT" || (e.documentDisplayName || "").toLowerCase().includes("passport")
  );
  const hasPAN = entries.some((e: any) =>
    (e.documentDisplayName || "").toLowerCase().includes("pan")
  );
  const hasDrivingLicence = entries.some((e: any) =>
    (e.documentDisplayName || "").toLowerCase().includes("driving") || (e.documentDisplayName || "").toLowerCase().includes("licence")
  );
  const hasRevenue = entries.some((e: any) =>
    ["INCOME_CERTIFICATE", "CASTE_CERTIFICATE", "DOMICILE_CERTIFICATE", "RURAL_STUDY_CERTIFICATE"].includes(e.documentTypeKey) ||
    (e.documentDisplayName || "").toLowerCase().includes("income") ||
    (e.documentDisplayName || "").toLowerCase().includes("caste")
  );
  const hasEducation = entries.some((e: any) =>
    ["SECONDARY_MARKS_CARD", "HIGHER_SECONDARY_MARKS_CARD", "STUDY_CERTIFICATE"].includes(e.documentTypeKey) ||
    (e.documentDisplayName || "").toLowerCase().includes("marks") ||
    (e.documentDisplayName || "").toLowerCase().includes("sslc") ||
    (e.documentDisplayName || "").toLowerCase().includes("puc")
  );

  if (hasPassport) return GOVERNMENT_AUTHORITIES.PASSPORT_SEVA;
  if (hasPAN) return GOVERNMENT_AUTHORITIES.INCOME_TAX_DEPARTMENT;
  if (hasDrivingLicence) return GOVERNMENT_AUTHORITIES.TRANSPORT_DEPARTMENT;
  if (hasRevenue) return GOVERNMENT_AUTHORITIES.REVENUE_DEPARTMENT;
  if (hasAadhaar) return GOVERNMENT_AUTHORITIES.UIDAI;
  if (hasEducation) return GOVERNMENT_AUTHORITIES.STATE_EDUCATION_BOARD;

  if (fieldKey === "name" || fieldKey === "dateOfBirth" || fieldKey === "gender" || fieldKey === "address") {
    return GOVERNMENT_AUTHORITIES.UIDAI;
  }
  if (fieldKey === "parentName") {
    return GOVERNMENT_AUTHORITIES.REVENUE_DEPARTMENT;
  }

  return GOVERNMENT_AUTHORITIES.UIDAI;
}

/**
 * Determines whether the conflict resolution normally requires a physical centre visit.
 */
export function requiresPhysicalCentre(
  conflict: FieldConsistencyComparison | { fieldKey: string; entries?: any[] }
): boolean {
  const fieldKey = conflict.fieldKey;
  // Biometrics, photo, and official attested identity/DOB updates at UIDAI/PSK/RTO/Tahsildar typically require an in-person visit
  if (fieldKey === "dateOfBirth" || fieldKey === "name" || fieldKey === "gender") {
    return true;
  }
  const authority = resolveCorrectionAuthority(conflict);
  if (authority.id === "PASSPORT_SEVA" || authority.id === "TRANSPORT_DEPARTMENT") {
    return true;
  }
  return false;
}

/**
 * Builds a structured, actionable ConflictResolutionPlan.
 */
export function buildConflictResolutionPlan(
  comparison: FieldConsistencyComparison,
  rawDocumentsMap: Record<string, { issuer: string; rawExtractedValue?: string }> = {}
): ConflictResolutionPlan {
  const authority = resolveCorrectionAuthority(comparison);
  const centreRequired = requiresPhysicalCentre(comparison);
  const fieldLabel = comparison.fieldLabel || comparison.fieldKey;

  const guidance = generateConflictGuidance(comparison, rawDocumentsMap);

  return {
    authority,
    authorityType: authority.jurisdiction,
    reason: `Discrepancy in ${fieldLabel} between submitted identity and qualification records.`,
    officialPortal: authority.portalName,
    officialInstructionsUrl: authority.officialUrl,
    centreRequired,
    correctionMethod: centreRequired
      ? "In-person visit to an authorized official centre or online demographic update with official document proof."
      : "Online application through the official statutory portal or citizen service centre.",
    requiredSupportingDocuments: guidance.requiredDocuments,
    numberedSteps: guidance.numberedSteps,
    nextVerificationAction: "Obtain the corrected official record and re-upload the new document to DigiReady.",
  };
}

export function generateConflictGuidance(
  comparison: FieldConsistencyComparison,
  rawDocumentsMap: Record<string, { issuer: string; rawExtractedValue?: string }> = {}
): ConflictGuidance {
  const fieldKey = comparison.fieldKey;
  const fieldLabel = comparison.fieldLabel || comparison.fieldKey;

  // Build affected documents list
  const affectedDocuments: AffectedDocumentEntry[] = (comparison.entries || []).map((entry) => {
    const rawMeta = rawDocumentsMap[entry.documentId];
    return {
      documentId: entry.documentId,
      documentDisplayName: entry.documentDisplayName,
      documentTypeKey: entry.documentTypeKey,
      fieldName: entry.fieldName,
      value: entry.rawValue || entry.normalizedValue,
      rawExtractedValue: rawMeta?.rawExtractedValue || entry.rawValue,
      issuer: rawMeta?.issuer || "Issuing Authority",
    };
  });

  const hasAadhaar = affectedDocuments.some((d) => d.documentTypeKey === "GOVERNMENT_IDENTITY_PROOF");
  const hasEducation = affectedDocuments.some((d) =>
    ["SECONDARY_MARKS_CARD", "HIGHER_SECONDARY_MARKS_CARD", "STUDY_CERTIFICATE"].includes(d.documentTypeKey)
  );
  const hasRevenue = affectedDocuments.some((d) =>
    ["INCOME_CERTIFICATE", "CASTE_CERTIFICATE"].includes(d.documentTypeKey)
  );

  // 1. NAME MISMATCH
  if (fieldKey === "name") {
    const branches: AuthorityCorrectionBranch[] = [];

    if (hasAadhaar) {
      branches.push({
        documentTypeKey: "GOVERNMENT_IDENTITY_PROOF",
        documentDisplayName: "Aadhaar Card",
        authorityName: GOVERNMENT_AUTHORITIES.UIDAI.name,
        authorityShortName: GOVERNMENT_AUTHORITIES.UIDAI.shortName,
        portalName: GOVERNMENT_AUTHORITIES.UIDAI.portalName,
        officialUrl: GOVERNMENT_AUTHORITIES.UIDAI.officialUrl,
        summary: "Update name on Aadhaar through UIDAI if your education certificate reflects your correct legal name.",
        steps: [
          "Confirm which name is the correct legal name you intend to use.",
          "Check accepted Proof of Identity (PoI) supporting documents on the official UIDAI portal.",
          "Submit a demographic update request via myAadhaar portal or visit an authorized Aadhaar Seva Kendra.",
          "Provide valid supporting document (e.g. 10th Marks Card, Passport, or Gazette Notification).",
          "Track Update Request Number (URN) until completed.",
          "Download the updated e-Aadhaar and upload it to DigiReady.",
        ],
      });
    }

    if (hasEducation) {
      branches.push({
        documentTypeKey: "SECONDARY_MARKS_CARD",
        documentDisplayName: "Education Marks Card / Certificate",
        authorityName: GOVERNMENT_AUTHORITIES.STATE_EDUCATION_BOARD.name,
        authorityShortName: GOVERNMENT_AUTHORITIES.STATE_EDUCATION_BOARD.shortName,
        portalName: GOVERNMENT_AUTHORITIES.STATE_EDUCATION_BOARD.portalName,
        summary: "Request a name correction through your school/college or State Education Board if your Aadhaar reflects the correct legal name.",
        steps: [
          "Approach the head of the institution (Principal/Headmaster) where you completed the examination.",
          "Submit a formal application for name correction with supporting proof (Birth Certificate, Aadhaar).",
          "The institution forwards the verified application to the State Board Divisional Office.",
          "Pay the prescribed board correction fee.",
          "Receive the rectified marks statement and upload the updated image to DigiReady.",
        ],
      });
    }

    if (hasRevenue) {
      branches.push({
        documentTypeKey: "INCOME_CERTIFICATE",
        documentDisplayName: "Income / Caste Certificate",
        authorityName: GOVERNMENT_AUTHORITIES.REVENUE_DEPARTMENT.name,
        authorityShortName: GOVERNMENT_AUTHORITIES.REVENUE_DEPARTMENT.shortName,
        portalName: GOVERNMENT_AUTHORITIES.REVENUE_DEPARTMENT.portalName,
        officialUrl: GOVERNMENT_AUTHORITIES.REVENUE_DEPARTMENT.officialUrl,
        summary: "Apply for a fresh/corrected Revenue Certificate via Nadakacheri / Seva Sindhu portal.",
        steps: [
          "Login to Nadakacheri / Seva Sindhu citizen portal or visit the nearest Taluk office / citizen service centre.",
          "Submit an application for a corrected certificate referencing your application number.",
          "Submit required identity and family declaration proofs.",
          "Receive the updated digital certificate and upload it to DigiReady.",
        ],
      });
    }

    // Default branches if single document or unmatched
    if (branches.length === 0) {
      branches.push({
        documentTypeKey: "GOVERNMENT_IDENTITY_PROOF",
        documentDisplayName: "Official Identity Record",
        authorityName: GOVERNMENT_AUTHORITIES.UIDAI.name,
        authorityShortName: GOVERNMENT_AUTHORITIES.UIDAI.shortName,
        portalName: GOVERNMENT_AUTHORITIES.UIDAI.portalName,
        officialUrl: GOVERNMENT_AUTHORITIES.UIDAI.officialUrl,
        summary: "Correct demographic name record at official issuing authority.",
        steps: [
          "Identify which document reflects your legal name.",
          "Visit the issuing authority portal or authorized correction centre.",
          "Submit valid supporting identity proof.",
          "Obtain updated official credential and upload to DigiReady.",
        ],
      });
    }

    const docNames = affectedDocuments.map((d) => d.documentDisplayName).join(" and ");
    const nameValues = affectedDocuments.map((d) => `"${d.value}"`).join(" vs ");

    return {
      id: `conflict-guidance-name`,
      conflictType: "NAME_MISMATCH",
      resolutionPath: "AADHAAR_UPDATE",
      fieldKey: "name",
      fieldLabel: "Applicant Full Name",
      title: "Identity Name Conflict",
      explanation: `Your ${docNames} contain different names (${nameValues}). DigiReady cannot determine which official document is correct.`,
      affectedDocuments,
      recommendedAuthority: GOVERNMENT_AUTHORITIES.UIDAI,
      authorityBranches: branches,
      whyCorrectionMayBeRequired:
        "Government and examination application portals require matching candidate names for verification, biometric matching, and certificate issuance.",
      numberedSteps: [
        "1. Identify the discrepancy: Review the spelling on each document.",
        "2. Determine legal name: Decide which name represents your correct legal identity.",
        "3. Option A (Update Aadhaar): If Education Board name is correct, visit an authorized Aadhaar Seva Kendra.",
        "4. Carry supporting proof: Provide your 10th Marks Card or Passport as Proof of Identity (PoI).",
        "5. Submit update request: Fill demographic update form at myaadhaar.uidai.gov.in or in person.",
        "6. Biometric verification: Complete biometric confirmation if requested by UIDAI.",
        "7. Note URN: Save your Update Request Number to track progress.",
        "8. Option B (Correct Education Record): If Aadhaar is correct, contact your school or State Education Board.",
        "9. Submit school application: Apply through your institution head with municipal Birth Certificate / Aadhaar.",
        "10. Board processing: Await issuance of amended marks certificate by the Board.",
        "11. Option C (Update Revenue Certificate): If Caste/Income name differs, apply for fresh certificate via Nadakacheri.",
        "12. Upload corrected document: Once updated, upload the new image to DigiReady to clear this conflict.",
      ],
      requiredDocuments: [
        "Aadhaar Card (original / e-Aadhaar)",
        "SSLC / 10th Marks Card (or School Leaving Certificate)",
        "Birth Certificate (if applicable)",
        "Gazette Notification (in case of legal name change)",
      ],
      caution:
        "DigiReady does not alter government records or statutory databases. All corrections must be completed directly through the respective issuing authority.",
      officialProcessNote:
        "Do not submit applications with conflicting name variations without official rectification, as discrepancies can lead to rejection during document verification.",
      nextAction: "View Official Name Correction Steps",
      recheckAfterCorrection: "Upload corrected document to automatically clear this conflict.",
    };
  }

  // 2. DOB MISMATCH
  if (fieldKey === "dateOfBirth") {
    const branches: AuthorityCorrectionBranch[] = [];

    if (hasAadhaar) {
      branches.push({
        documentTypeKey: "GOVERNMENT_IDENTITY_PROOF",
        documentDisplayName: "Aadhaar Card",
        authorityName: GOVERNMENT_AUTHORITIES.UIDAI.name,
        authorityShortName: GOVERNMENT_AUTHORITIES.UIDAI.shortName,
        portalName: GOVERNMENT_AUTHORITIES.UIDAI.portalName,
        officialUrl: GOVERNMENT_AUTHORITIES.UIDAI.officialUrl,
        summary: "Update Date of Birth in Aadhaar per UIDAI Date of Birth Update Policy.",
        steps: [
          "Note: UIDAI permits Date of Birth update only ONCE in a lifetime without exceptional approval.",
          "Carry original Birth Certificate or 10th Marks Card as valid Proof of Date of Birth (DoB).",
          "Visit an authorized Aadhaar Seva Kendra for biometric-verified update.",
          "Receive update receipt with Update Request Number (URN).",
          "Download updated e-Aadhaar and upload to DigiReady.",
        ],
      });
    }

    if (hasEducation) {
      branches.push({
        documentTypeKey: "SECONDARY_MARKS_CARD",
        documentDisplayName: "Education Marks Card / Certificate",
        authorityName: GOVERNMENT_AUTHORITIES.STATE_EDUCATION_BOARD.name,
        authorityShortName: GOVERNMENT_AUTHORITIES.STATE_EDUCATION_BOARD.shortName,
        portalName: GOVERNMENT_AUTHORITIES.STATE_EDUCATION_BOARD.portalName,
        summary: "Apply for Date of Birth correction in school records / State Board.",
        steps: [
          "Obtain an extract of admission register / Birth Certificate issued by Registrar of Births.",
          "Submit application through the school institution to the District Education Officer / Board.",
          "Pay the statutory verification fee.",
          "Receive amended marks sheet and upload to DigiReady.",
        ],
      });
    }

    const docNames = affectedDocuments.map((d) => d.documentDisplayName).join(" and ");

    return {
      id: `conflict-guidance-dob`,
      conflictType: "DOB_MISMATCH",
      resolutionPath: "AADHAAR_UPDATE",
      fieldKey: "dateOfBirth",
      fieldLabel: "Date of Birth",
      title: "Date of Birth Discrepancy",
      explanation: `Your ${docNames} show different dates of birth.`,
      affectedDocuments,
      recommendedAuthority: GOVERNMENT_AUTHORITIES.UIDAI,
      authorityBranches: branches,
      whyCorrectionMayBeRequired:
        "Eligibility age limits and candidate identity verification strictly depend on a consistent date of birth across identity proof and academic records.",
      numberedSteps: [
        "Determine the true legal date of birth according to your official Birth Certificate issued by the Municipal Corporation / Gram Panchayat.",
        "If Aadhaar date of birth is incorrect: Visit an Aadhaar Seva Kendra with your Birth Certificate or SSLC Marks Card.",
        "If School / Marks Card is incorrect: Contact your educational institution to apply for board record amendment.",
        "Upload the revised official document to DigiReady once issued.",
      ],
      requiredDocuments: [
        "Birth Certificate (issued under Registration of Births and Deaths Act)",
        "SSLC / 10th Standard Marks Card",
        "Passport (if available)",
      ],
      caution:
        "UIDAI restricts Date of Birth changes to a single update. Ensure your supporting document is completely authentic.",
      officialProcessNote: "DigiReady cannot alter date of birth records on any official certificate.",
      nextAction: "View DOB Correction Procedures",
      recheckAfterCorrection: "Upload corrected document to automatically clear this conflict.",
    };
  }

  // 3. PARENT NAME MISMATCH
  if (fieldKey === "parentName") {
    const docNames = affectedDocuments.map((d) => d.documentDisplayName).join(" and ");
    return {
      id: `conflict-guidance-parent-name`,
      conflictType: "PARENT_NAME_MISMATCH",
      resolutionPath: "REVENUE_DEPARTMENT",
      fieldKey: "parentName",
      fieldLabel: "Parent / Guardian Name",
      title: "Parent / Guardian Name Discrepancy",
      explanation: `Your ${docNames} record different spellings or names for parent/guardian.`,
      affectedDocuments,
      recommendedAuthority: GOVERNMENT_AUTHORITIES.REVENUE_DEPARTMENT,
      authorityBranches: [],
      whyCorrectionMayBeRequired:
        "Caste and income reservations require parent details to match school admission records.",
      numberedSteps: [
        "Verify the standard spelling used on the parent's official identity card (Aadhaar / Voter ID).",
        "If the certificate contains an error, apply for re-issue at your local Revenue / Nadakacheri office.",
        "Upload the re-issued certificate image to DigiReady.",
      ],
      requiredDocuments: ["Parent's Aadhaar / Voter ID", "Ration Card", "School Records"],
      caution: "Revenue certificates must accurately reflect the Tahsildar record.",
      officialProcessNote: "DigiReady cannot override parent names on certified documents.",
      nextAction: "View Parent Name Correction Steps",
      recheckAfterCorrection: "Upload corrected certificate to re-run consistency assessment.",
    };
  }

  // 4. ADDRESS MISMATCH
  if (fieldKey === "address") {
    const docNames = affectedDocuments.map((d) => d.documentDisplayName).join(" and ");
    return {
      id: `conflict-guidance-address`,
      conflictType: "ADDRESS_MISMATCH",
      resolutionPath: "AADHAAR_UPDATE",
      fieldKey: "address",
      fieldLabel: "Residential Address",
      title: "Address Difference Detected",
      explanation: `Your ${docNames} list different residential addresses. Address changes over time are common and may not be an error.`,
      affectedDocuments,
      recommendedAuthority: GOVERNMENT_AUTHORITIES.UIDAI,
      authorityBranches: [],
      whyCorrectionMayBeRequired:
        "Ensure your current active address is updated on your primary identity proof if the examination requires state quota eligibility.",
      numberedSteps: [
        "Check if the application requires your current permanent address or historical study address.",
        "If your Aadhaar address is outdated, submit an online address update on myAadhaar portal with valid address proof.",
        "Upload updated Aadhaar to DigiReady when complete.",
      ],
      requiredDocuments: ["Electricity Bill / Rent Agreement / Bank Statement (in applicant's or parent's name)"],
      caution: "Address differences are not always errors. Only update if your target application requires it.",
      officialProcessNote: "DigiReady highlights address differences for planning purposes.",
      nextAction: "View Address Update Info",
      recheckAfterCorrection: "Re-evaluate if address requirements apply to your application.",
    };
  }

  // 5. GENDER MISMATCH
  if (fieldKey === "gender") {
    return {
      id: `conflict-guidance-gender`,
      conflictType: "GENDER_MISMATCH",
      resolutionPath: "AADHAAR_UPDATE",
      fieldKey: "gender",
      fieldLabel: "Gender",
      title: "Gender Classification Mismatch",
      explanation: "Documents record differing gender entries.",
      affectedDocuments,
      recommendedAuthority: GOVERNMENT_AUTHORITIES.UIDAI,
      authorityBranches: [],
      whyCorrectionMayBeRequired: "Gender mismatches prevent exam hall ticket issuance and seat reservation validation.",
      numberedSteps: [
        "Visit an Aadhaar Seva Kendra for gender demographic correction.",
        "Upload the updated e-Aadhaar to DigiReady.",
      ],
      requiredDocuments: ["Demographic update declaration per UIDAI norms"],
      caution: "Gender update is permitted once through UIDAI.",
      officialProcessNote: "DigiReady cannot change gender data in official records.",
      nextAction: "View Gender Correction Steps",
      recheckAfterCorrection: "Upload updated ID to verify consistency.",
    };
  }

  // 6. DEFAULT / UNKNOWN CONFLICT FALLBACK
  return {
    id: `conflict-guidance-unknown`,
    conflictType: "UNKNOWN_CONFLICT",
    resolutionPath: "MANUAL_REVIEW",
    fieldKey,
    fieldLabel,
    title: `${fieldLabel} Difference Detected`,
    explanation: `We detected a discrepancy in ${fieldLabel} across your documents but could not confidently determine the appropriate automated correction process.`,
    affectedDocuments,
    recommendedAuthority: GOVERNMENT_AUTHORITIES.UIDAI,
    authorityBranches: [],
    whyCorrectionMayBeRequired: "Inconsistent identity records may cause manual verification flags.",
    numberedSteps: [
      "Inspect both documents manually to identify the source of the difference.",
      "Contact the respective issuing authority to clarify the required correction procedure.",
      "Upload the corrected document image once available.",
    ],
    requiredDocuments: ["Official ID Proof", "Supporting credentials"],
    caution: "Confirm procedures with the respective issuing authority.",
    officialProcessNote: "DigiReady provides guidance and does not alter government records.",
    nextAction: "Review Documents Manually",
    recheckAfterCorrection: "Upload updated document to recheck.",
  };
}

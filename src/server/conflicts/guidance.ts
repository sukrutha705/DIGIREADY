/**
 * DigiReady - Deterministic Conflict Guidance Subsystem
 * Implements deterministic routing to official authorities and structured correction guidance.
 */

import { GOVERNMENT_AUTHORITIES, type GovernmentAuthority } from "@/server/authorities";
import type {
  ConflictType,
  ConflictResolutionPath,
  ConflictGuidance,
  AffectedDocumentEntry,
  AuthorityCorrectionBranch,
} from "./types";
import type { FieldConsistencyComparison } from "@/server/consistency/types";

export function generateConflictGuidance(
  comparison: FieldConsistencyComparison,
  rawDocumentsMap: Record<string, { issuer: string; rawExtractedValue?: string }> = {}
): ConflictGuidance {
  const fieldKey = comparison.fieldKey;
  const fieldLabel = comparison.fieldLabel;

  // Build affected documents list
  const affectedDocuments: AffectedDocumentEntry[] = comparison.entries.map((entry) => {
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
    let resolutionPath: ConflictResolutionPath = "AADHAAR_UPDATE";
    let recommendedAuthority: GovernmentAuthority = GOVERNMENT_AUTHORITIES.UIDAI;

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
          "Apply for a fresh certificate with the matching applicant name and updated ration card/Aadhaar details.",
          "Download the verified digital certificate with RD number and upload it to DigiReady.",
        ],
      });
    }

    const docNames = affectedDocuments.map((d) => d.documentDisplayName).join(" and ");

    return {
      id: `conflict-guidance-name`,
      conflictType: "NAME_MISMATCH",
      resolutionPath,
      fieldKey: "name",
      fieldLabel: "Applicant Name",
      title: "Identity Name Conflict",
      explanation: `Your ${docNames} contain different names. DigiReady cannot modify official documents. Review the official correction process before submitting your application.`,
      affectedDocuments,
      recommendedAuthority,
      authorityBranches: branches,
      whyCorrectionMayBeRequired:
        "Public entrance exams (such as KCET) and government scholarship portals cross-verify candidate names across ID proofs and educational qualifications. Name discrepancies may cause verification holds or rejection at counseling.",
      numberedSteps: [
        "Confirm which name is the correct legal/official name you intend to use.",
        "Identify the document that contains the incorrect or outdated information.",
        "Gather the accepted supporting identity/name documents required for the correction.",
        "Visit an authorized service channel or portal (e.g. myAadhaar / Aadhaar Seva Kendra for UIDAI, or School Principal for Board certificates).",
        "Request the appropriate demographic/name update with the issuing authority.",
        "Submit the required supporting proof documents.",
        "Complete the identity verification / biometric process if required by the authority.",
        "Keep the official acknowledgement / update request details (such as URN / application number).",
        "Wait for the official authority to complete their verification and update cycle.",
        "Obtain or download the updated official document record.",
        "Return to DigiReady and upload the updated document image to your vault.",
        "DigiReady will re-run the consistency check to verify that all records align.",
      ],
      requiredDocuments: [
        "Accepted Proof of Identity (PoI) per authority guidelines (e.g. Passport, 10th Marks Card, PAN Card, Birth Certificate)",
        "Existing document copy showing previous entry",
        "Official update request form / online acknowledgement receipt",
      ],
      caution:
        "Requirements and acceptable supporting documents may change. Confirm the current requirements directly through the official issuing authority. DigiReady does not alter government records.",
      officialProcessNote:
        "Do not edit DigiReady metadata to pretend an official document is fixed. You must obtain an officially corrected document from the issuing authority.",
      nextAction: "Review Official Correction Steps",
      recheckAfterCorrection:
        "After receiving your updated document from the issuing authority, upload the new image into your DigiReady vault to verify consistency.",
    };
  }

  // 2. DATE OF BIRTH MISMATCH
  if (fieldKey === "dateOfBirth") {
    const docNames = affectedDocuments.map((d) => d.documentDisplayName).join(" and ");
    return {
      id: `conflict-guidance-dob`,
      conflictType: "DOB_MISMATCH",
      resolutionPath: hasAadhaar ? "AADHAAR_UPDATE" : "EDUCATION_BOARD_CORRECTION",
      fieldKey: "dateOfBirth",
      fieldLabel: "Date of Birth",
      title: "Date of Birth Mismatch",
      explanation: `Your ${docNames} contain different dates of birth. Date of birth is a primary identifier in government admissions and scholarship portals.`,
      affectedDocuments,
      recommendedAuthority: hasAadhaar ? GOVERNMENT_AUTHORITIES.UIDAI : GOVERNMENT_AUTHORITIES.STATE_EDUCATION_BOARD,
      authorityBranches: [
        {
          documentTypeKey: "GOVERNMENT_IDENTITY_PROOF",
          documentDisplayName: "Aadhaar Card",
          authorityName: GOVERNMENT_AUTHORITIES.UIDAI.name,
          authorityShortName: GOVERNMENT_AUTHORITIES.UIDAI.shortName,
          portalName: GOVERNMENT_AUTHORITIES.UIDAI.portalName,
          officialUrl: GOVERNMENT_AUTHORITIES.UIDAI.officialUrl,
          summary: "Aadhaar Date of Birth can be updated once with a valid Birth Certificate or SSLC Marks Card.",
          steps: [
            "Visit an authorized Aadhaar Seva Kendra with your original Birth Certificate or 10th Marks Card.",
            "Submit DOB update request form with biometric authentication.",
            "Obtain updated Aadhaar and upload it to DigiReady.",
          ],
        },
      ],
      whyCorrectionMayBeRequired:
        "Mismatched date of birth values will cause automated API validation failures during examination registration.",
      numberedSteps: [
        "Determine which document displays your true legal Date of Birth.",
        "Obtain a certified municipal Birth Certificate or primary educational record.",
        "Initiate a Date of Birth correction with the issuing authority whose record is incorrect.",
        "Undergo biometric / in-person verification if mandated by the authority.",
        "Receive the updated credential and upload the new image to DigiReady.",
      ],
      requiredDocuments: ["Official Birth Certificate", "Secondary School Leaving Certificate (SSLC)"],
      caution: "UIDAI permits DOB correction only with valid documentary proof. Follow official guidelines.",
      officialProcessNote: "DigiReady cannot alter date of birth records registered with statutory bodies.",
      nextAction: "View DOB Correction Guidance",
      recheckAfterCorrection: "Upload updated document image to re-evaluate vault consistency.",
    };
  }

  // 3. PARENT / GUARDIAN NAME MISMATCH
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

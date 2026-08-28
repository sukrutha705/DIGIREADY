/**
 * DigiReady - Comprehensive Guidance Center Service
 * Resolves structured, actionable guidance for missing documents, identity conflicts,
 * statutory authorities, and location-aware correction facilities.
 */

import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import { getConflictIssues } from "@/server/conflicts/service";
import { GOVERNMENT_AUTHORITIES, GovernmentAuthority } from "@/server/authorities";
import { getCorrectionCentres } from "@/server/centres/service";
import { CorrectionCentreResult } from "@/server/centres/types";
import { DEMO_DOCUMENT_GUIDANCE, getDocumentGuidance } from "./registry";
import { getServiceByName } from "@/server/services/registry";
import type { ConflictIssue } from "@/server/conflicts/types";
import { resolveCanonicalGuidanceSlug, getCanonicalDocumentSlug } from "./slugs";

export type GuidanceCategory =
  | "MISSING_DOCUMENT"
  | "CONFLICT_RESOLUTION"
  | "AUTHORITY_PROCESS"
  | "SERVICE_REQUIREMENTS";

export interface GuidanceStep {
  number: number;
  title: string;
  explanation: string;
  requiredProof?: string[];
  appointmentRequired?: boolean;
  officialLink?: string;
}

export interface GuidanceTopicDetail {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: GuidanceCategory;
  severity: "BLOCKING" | "WARNING" | "INFO";
  documentA?: {
    name: string;
    value: string;
    issuer: string;
  };
  documentB?: {
    name: string;
    value: string;
    issuer: string;
  };
  explanation: string;
  whyItMatters: string;
  whatYouShouldDo: string[];
  authority: GovernmentAuthority;
  correctionMethod: "ONLINE" | "PHYSICAL" | "HYBRID";
  stepByStep: GuidanceStep[];
  requiredDocuments: string[];
  centreLookup: CorrectionCentreResult;
  officialWebsite: string;
  officialInstructionsUrl?: string;
  disclaimer: string;
  afterCorrectionLifecycle: {
    steps: string[];
    recheckActionNote: string;
  };
}

export interface GuidanceHubSummary {
  activeIssuesCount: number;
  activeIssues: ConflictIssue[];
  missingDocumentGuides: Array<{
    slug: string;
    title: string;
    category: string;
    description: string;
    authorityName: string;
  }>;
  conflictGuides: Array<{
    slug: string;
    title: string;
    field: string;
    severity: "BLOCKING" | "WARNING";
    description: string;
    authorityName: string;
  }>;
  authorities: GovernmentAuthority[];
}

export const CONFLICT_GUIDANCE_PRESETS: Record<
  string,
  {
    field: string;
    title: string;
    severity: "BLOCKING" | "WARNING";
    authorityId: string;
    correctionMethod: "ONLINE" | "PHYSICAL" | "HYBRID";
    whyItMatters: string;
    explanation: string;
    steps: GuidanceStep[];
    requiredDocs: string[];
  }
> = {
  "name-mismatch": {
    field: "name",
    title: "Candidate Name Discrepancy",
    severity: "BLOCKING",
    authorityId: "UIDAI",
    correctionMethod: "HYBRID",
    whyItMatters:
      "Statutory examination and scholarship application portals cross-verify candidate identity records. Discrepancies in name representation or spelling may prevent identity matching or verification during seat allocation.",
    explanation:
      "DigiReady detected differences in applicant name across your vault credentials. DigiReady cannot determine which official record is legally correct; corrections must be processed through the issuing statutory body.",
    steps: [
      {
        number: 1,
        title: "Review Candidate Name on Primary Records",
        explanation:
          "Compare the name spelling on your 10th (SSLC) Marks Card and Aadhaar Card to determine which represents your official legal identity.",
      },
      {
        number: 2,
        title: "Prepare Official Proof of Identity (PoI)",
        explanation:
          "If updating Aadhaar, carry your original 10th Marks Card or Passport. If updating education records, prepare your municipal Birth Certificate.",
        requiredProof: ["10th Marks Card / SSLC", "Birth Certificate", "Passport (if available)"],
      },
      {
        number: 3,
        title: "Submit Demographic Update Request",
        explanation:
          "Submit a demographic update online via myAadhaar (myaadhaar.uidai.gov.in) or visit an authorized Aadhaar Seva Kendra for biometric confirmation.",
        appointmentRequired: true,
        officialLink: "https://appointments.uidai.gov.in",
      },
      {
        number: 4,
        title: "Complete In-Person Biometric Confirmation",
        explanation:
          "Complete biometric authentication at the Aadhaar Seva Kendra and note the 28-digit Update Request Number (URN).",
      },
      {
        number: 5,
        title: "Download Updated e-Aadhaar & Upload to DigiReady",
        explanation:
          "Once UIDAI approves the update, download the updated e-Aadhaar PDF/image and upload it to DigiReady to clear the conflict.",
      },
    ],
    requiredDocs: [
      "10th / Secondary School Marks Card",
      "Official Municipal Birth Certificate",
      "Existing Aadhaar / Identity Proof",
    ],
  },
  "dob-mismatch": {
    field: "dateOfBirth",
    title: "Date of Birth Discrepancy",
    severity: "BLOCKING",
    authorityId: "UIDAI",
    correctionMethod: "PHYSICAL",
    whyItMatters:
      "Date of birth is a fundamental statutory identifier for age eligibility, cutoff determination, and automated application validation.",
    explanation:
      "Different dates of birth were detected across your records. Discrepancies will cause automated validation failures on examination registration portals.",
    steps: [
      {
        number: 1,
        title: "Verify Birth Record with Municipal Certificate",
        explanation:
          "Inspect your municipal Birth Certificate or primary school admission entry to confirm the legal date of birth.",
      },
      {
        number: 2,
        title: "Initiate Date of Birth Correction",
        explanation:
          "Book an appointment at an authorized Aadhaar Seva Kendra. Carry original birth proof.",
        appointmentRequired: true,
        officialLink: "https://appointments.uidai.gov.in",
      },
      {
        number: 3,
        title: "Upload Corrected Official Document",
        explanation:
          "Once the updated credential is generated by the authority, upload the new image to DigiReady to re-evaluate readiness.",
      },
    ],
    requiredDocs: [
      "Official Municipal Birth Certificate",
      "SSLC / 10th Marks Card with printed DOB",
    ],
  },
  "parent-name-mismatch": {
    field: "parentName",
    title: "Parent / Guardian Name Discrepancy",
    severity: "WARNING",
    authorityId: "REVENUE_DEPARTMENT",
    correctionMethod: "HYBRID",
    whyItMatters:
      "Caste and income reservation quota claims require parent details to match official educational admissions registers.",
    explanation:
      "Variations in parent/guardian names were detected. If claiming reservation or fee concessions, ensure certificates reflect consistent parent identification.",
    steps: [
      {
        number: 1,
        title: "Cross-check Parent Details",
        explanation:
          "Check parent names on your 10th marks card, revenue certificates, and family ration card.",
      },
      {
        number: 2,
        title: "Apply for Revenue Correction or Re-issuance",
        explanation:
          "Submit an application at your local Tahsildar / Nadakacheri centre with the candidate's school records.",
        officialLink: "https://nadakacheri.karnataka.gov.in",
      },
      {
        number: 3,
        title: "Upload Updated Certificate",
        explanation:
          "Upload the digitally signed certificate with updated parent details to refresh consistency checks.",
      },
    ],
    requiredDocs: [
      "Candidate 10th / Secondary Marks Card",
      "Family Ration Card / Domicile Certificate",
      "Parent Identity Card",
    ],
  },
  "address-mismatch": {
    field: "address",
    title: "Address Discrepancy Across Documents",
    severity: "WARNING",
    authorityId: "UIDAI",
    correctionMethod: "ONLINE",
    whyItMatters:
      "Local state quotas and communication addresses must match verified territorial jurisdiction guidelines.",
    explanation:
      "Different residential addresses were found across your vault documents. Ensure your official proof of address represents your current domicile.",
    steps: [
      {
        number: 1,
        title: "Determine Primary Proof of Address",
        explanation:
          "Use a recent utility bill, bank passbook, or municipal residential certificate as the address proof.",
      },
      {
        number: 2,
        title: "Update Address Online",
        explanation:
          "Submit an online address update on myAadhaar with valid supporting proof.",
        officialLink: "https://myaadhaar.uidai.gov.in",
      },
      {
        number: 3,
        title: "Recheck Documents in DigiReady",
        explanation:
          "Upload the updated e-Aadhaar once the update status shows completed.",
      },
    ],
    requiredDocs: [
      "Recent Electricity / Water Bill",
      "Nationalized Bank Passbook with Photograph",
      "Registered Rent Agreement / Domicile Certificate",
    ],
  },
  "gender-mismatch": {
    field: "gender",
    title: "Gender Classification Discrepancy",
    severity: "BLOCKING",
    authorityId: "UIDAI",
    correctionMethod: "PHYSICAL",
    whyItMatters:
      "Gender mismatches cause rejection on entrance exam admit cards and reservation quota processing.",
    explanation:
      "Discrepancies in gender entry were detected across identity and educational documents.",
    steps: [
      {
        number: 1,
        title: "Visit Authorized Aadhaar Kendra",
        explanation:
          "Gender updates require in-person biometric authentication at an authorized Aadhaar centre.",
        appointmentRequired: true,
        officialLink: "https://appointments.uidai.gov.in",
      },
      {
        number: 2,
        title: "Upload Updated Credential",
        explanation:
          "Upload the corrected e-Aadhaar or certificate to clear the blocking conflict in DigiReady.",
      },
    ],
    requiredDocs: [
      "Primary Photo Identity Proof",
      "Medical Certificate (if applicable)",
    ],
  },
};

/**
 * Retrieves the Guidance Hub summary data including active issues, missing document guides, and authorities.
 */
export async function getGuidanceHubData(
  userId?: string | null,
  userCity: string = "Bengaluru",
  db: PrismaClient = prisma
): Promise<GuidanceHubSummary> {
  const activeIssues: ConflictIssue[] = userId
    ? await getConflictIssues(userId, userCity, db)
    : [];

  const missingDocumentGuides = [
    {
      slug: "income-certificate",
      title: "Income Certificate Application & Correction",
      category: "Revenue Certificate",
      description: "How to obtain or rectify annual family income certificate via Revenue Department / Nadakacheri.",
      authorityName: "Department of Revenue (Nadakacheri)",
    },
    {
      slug: "caste-certificate",
      title: "Caste / Category Certificate Guidance",
      category: "Community Reservation",
      description: "Procedure to obtain category certification for SC/ST/OBC/Category-1 quotas.",
      authorityName: "Revenue Authority (Tahsildar)",
    },
    {
      slug: "caste-income-certificate",
      title: "Caste & Income Certificate (Form E / Form F)",
      category: "Revenue Certificate",
      description: "Combined certificate certifying community category and household annual income.",
      authorityName: "Department of Revenue",
    },
    {
      slug: "government-identity-proof",
      title: "Government Identity Proof (Aadhaar) Guidance",
      category: "Statutory Identity",
      description: "Official procedures for updating demographic details and downloading e-Aadhaar from UIDAI.",
      authorityName: "UIDAI",
    },
    {
      slug: "secondary-marks-card",
      title: "10th / Secondary Marks Card Name & DOB Correction",
      category: "Academic Record",
      description: "Rectifying candidate name or date of birth on 10th/SSLC marks records through Education Boards.",
      authorityName: "State Secondary Education Board (KSEEB / CBSE / CISCE)",
    },
    {
      slug: "higher-secondary-marks-card",
      title: "12th / 2nd PUC Marks Card Guidance",
      category: "Academic Record",
      description: "Obtaining certified copies or correcting subject stream details on higher secondary records.",
      authorityName: "Department of Pre-University Education",
    },
    {
      slug: "study-certificate",
      title: "Institutional Study Certificate & BEO Countersignature",
      category: "Domicile / Quota",
      description: "Obtaining continuous 7-year study certificates and Block Education Officer (BEO) verification.",
      authorityName: "Department of School Education",
    },
    {
      slug: "address-proof",
      title: "Residence & Address Proof Guidance",
      category: "State Quota",
      description: "Establishing statutory state residence and address proof for regional application quotas.",
      authorityName: "District Administration / Revenue Dept",
    },
    {
      slug: "passport",
      title: "Passport Issuance & Re-Issue for Demographic Correction",
      category: "Travel & Citizenship",
      description: "Official procedure for passport re-issue with updated demographic data at PSK/POPSK.",
      authorityName: "Passport Seva (Ministry of External Affairs)",
    },
    {
      slug: "ews-certificate",
      title: "Economically Weaker Section (EWS) Certificate",
      category: "General Category Quota",
      description: "Eligibility criteria and official application procedure for 10% EWS reservation.",
      authorityName: "Tahsildar / Revenue Department",
    },
    {
      slug: "disability-certificate",
      title: "Disability / PwD Certificate (UDID Card)",
      category: "Medical & Reservation",
      description: "Applying for UDID card through district medical boards for PwD reservation benefits.",
      authorityName: "Department of Empowerment of Persons with Disabilities",
    },
  ];

  const conflictGuides = [
    {
      slug: "name-mismatch",
      title: "Name Mismatch Between Aadhaar & Marks Card",
      field: "name",
      severity: "BLOCKING" as const,
      description: "Step-by-step resolution for spelling differences between identity proof and educational certificates.",
      authorityName: "UIDAI / State Education Board",
    },
    {
      slug: "dob-mismatch",
      title: "Date of Birth Discrepancy Resolution",
      field: "dateOfBirth",
      severity: "BLOCKING" as const,
      description: "How to correct conflicting date of birth records using municipal birth certificates.",
      authorityName: "UIDAI / Civil Registration",
    },
    {
      slug: "parent-name-mismatch",
      title: "Parent / Guardian Name Variation",
      field: "parentName",
      severity: "WARNING" as const,
      description: "Aligning parent names across caste/income certificates and school registers.",
      authorityName: "Revenue Department",
    },
    {
      slug: "address-mismatch",
      title: "Address Differences Across Documents",
      field: "address",
      severity: "WARNING" as const,
      description: "Managing residential address changes and state quota address requirements.",
      authorityName: "UIDAI",
    },
    {
      slug: "gender-mismatch",
      title: "Gender Classification Discrepancy",
      field: "gender",
      severity: "BLOCKING" as const,
      description: "Rectifying demographic gender entries on government identity cards.",
      authorityName: "UIDAI",
    },
  ];

  return {
    activeIssuesCount: activeIssues.length,
    activeIssues,
    missingDocumentGuides,
    conflictGuides,
    authorities: Object.values(GOVERNMENT_AUTHORITIES),
  };
}

/**
 * Resolves a specific Guidance Topic by slug (supports conflicts, documents, authorities, and services).
 * Canonicalizes all inputs internally so that aliases, key variants, and formatted names resolve seamlessly.
 */
export async function getGuidanceTopicBySlug(
  slug: string,
  userId?: string | null,
  userCity?: string | null,
  db: PrismaClient = prisma
): Promise<GuidanceTopicDetail | null> {
  if (!slug || typeof slug !== "string") {
    return null;
  }

  // Canonicalize slug through centralized resolver
  const resolution = resolveCanonicalGuidanceSlug(slug);
  const { type, canonicalSlug, key } = resolution;

  // 1. Conflict Guidance Topic
  if (type === "CONFLICT" || CONFLICT_GUIDANCE_PRESETS[canonicalSlug]) {
    const presetKey = CONFLICT_GUIDANCE_PRESETS[canonicalSlug] ? canonicalSlug : key;
    const preset = CONFLICT_GUIDANCE_PRESETS[presetKey] || CONFLICT_GUIDANCE_PRESETS["name-mismatch"];
    const authority =
      GOVERNMENT_AUTHORITIES[preset.authorityId] || GOVERNMENT_AUTHORITIES.UIDAI;

    // Pull active user conflict if available
    let docA = undefined;
    let docB = undefined;
    if (userId) {
      const activeIssues = await getConflictIssues(userId, userCity, db);
      const matched = activeIssues.find(
        (i) => i.field.toLowerCase() === preset.field.toLowerCase()
      );
      if (matched) {
        docA = {
          name: matched.documentA.documentDisplayName,
          value: matched.valueA,
          issuer: matched.documentA.issuer,
        };
        docB = {
          name: matched.documentB.documentDisplayName,
          value: matched.valueB,
          issuer: matched.documentB.issuer,
        };
      }
    }

    const centreLookup = getCorrectionCentres(authority.id, userCity || "Bengaluru");

    return {
      id: `guidance-${canonicalSlug}`,
      slug: canonicalSlug,
      title: preset.title,
      subtitle: `Official guidance on resolving ${preset.field} discrepancies through statutory authorities.`,
      category: "CONFLICT_RESOLUTION",
      severity: preset.severity,
      documentA: docA,
      documentB: docB,
      explanation: preset.explanation,
      whyItMatters: preset.whyItMatters,
      whatYouShouldDo: [
        "1. Identify which official record reflects your correct legal identity.",
        "2. Contact the competent statutory authority responsible for that document.",
        "3. Follow that authority's official correction procedure.",
        "4. Provide the verified supporting documents mandated by the authority.",
        "5. Obtain the updated official document with corrected details.",
        "6. Upload the corrected document image to DigiReady.",
        "7. DigiReady will re-extract and recheck the metadata deterministically.",
        "8. Once the conflict is cleared, your application readiness is recalculated automatically.",
      ],
      authority,
      correctionMethod: preset.correctionMethod,
      stepByStep: preset.steps,
      requiredDocuments: preset.requiredDocs,
      centreLookup,
      officialWebsite: authority.officialUrl || "https://uidai.gov.in",
      officialInstructionsUrl: authority.officialUrl,
      disclaimer:
        "DigiReady is an independent preparation system. DigiReady cannot modify government databases or official records. All corrections must be completed directly with the statutory issuing authority.",
      afterCorrectionLifecycle: {
        steps: [
          "ISSUE DETECTED",
          "OFFICIAL CORRECTION REQUIRED",
          "CORRECT THROUGH AUTHORITY",
          "UPLOAD UPDATED DOCUMENT",
          "AUTOMATED RECHECK",
          "CONFLICT RESOLVED",
          "READY TO APPLY",
        ],
        recheckActionNote:
          "Upload your updated official document below. DigiReady will re-run extraction and consistency checks automatically.",
      },
    };
  }

  // 2. Statutory Authority Guidance Topic
  if (type === "AUTHORITY" || GOVERNMENT_AUTHORITIES[key] || GOVERNMENT_AUTHORITIES[canonicalSlug.toUpperCase().replace(/-/g, "_")]) {
    const authKey = GOVERNMENT_AUTHORITIES[key]
      ? key
      : canonicalSlug.toUpperCase().replace(/-/g, "_");
    const authority = GOVERNMENT_AUTHORITIES[authKey] || GOVERNMENT_AUTHORITIES.UIDAI;
    const centreLookup = getCorrectionCentres(authority.id, userCity || "Bengaluru");

    return {
      id: `guidance-auth-${canonicalSlug}`,
      slug: canonicalSlug,
      title: `${authority.name} Guidance`,
      subtitle: `Official procedures, portals, and verified correction facilities for ${authority.shortName}.`,
      category: "AUTHORITY_PROCESS",
      severity: "INFO",
      explanation: authority.officialProcessNote,
      whyItMatters:
        "Statutory issuing authorities maintain master public records. All official demographic, educational, and revenue rectifications must be processed through them.",
      whatYouShouldDo: [
        "1. Check the statutory guidelines on the authority's official portal.",
        "2. Prepare the mandatory documentary proofs.",
        "3. Book an appointment or submit an online request through the official channel.",
        "4. Undergo verification and obtain the updated credential.",
        "5. Upload the new credential to DigiReady to refresh your application status.",
      ],
      authority,
      correctionMethod: "HYBRID",
      stepByStep: [
        {
          number: 1,
          title: "Access Official Portal",
          explanation: `Visit ${authority.portalName} (${authority.officialUrl || "Official Portal"}).`,
          officialLink: authority.officialUrl,
        },
        {
          number: 2,
          title: "Submit Application & Book Slot",
          explanation: authority.appointmentInfoNote,
          appointmentRequired: true,
        },
        {
          number: 3,
          title: "Obtain Certified Copy & Upload",
          explanation: "Upload the updated document to DigiReady to clear any readiness blockers.",
        },
      ],
      requiredDocuments: [
        "Primary Photo Identity Proof",
        "Statutory documentary proof supporting the correction",
      ],
      centreLookup,
      officialWebsite: authority.officialUrl || "https://india.gov.in",
      officialInstructionsUrl: authority.officialUrl,
      disclaimer: authority.disclaimer,
      afterCorrectionLifecycle: {
        steps: [
          "AUTHORITY PROCEDURE",
          "SUBMIT APPLICATION",
          "VERIFICATION COMPLETE",
          "UPLOAD TO DIGIREADY",
          "AUTO RECHECK",
          "READY TO APPLY",
        ],
        recheckActionNote:
          "Upload your updated official document to DigiReady once issued by the authority.",
      },
    };
  }

  // 3. Document Guidance Topic
  const docGuidance = getDocumentGuidance(slug) || getDocumentGuidance(canonicalSlug) || getDocumentGuidance(key);
  if (docGuidance || type === "DOCUMENT") {
    const activeDoc = docGuidance || DEMO_DOCUMENT_GUIDANCE.INCOME_CERTIFICATE;
    const normKey = activeDoc.documentType.toLowerCase();

    const authority =
      normKey.includes("income") || normKey.includes("caste") || normKey.includes("domicile") || normKey.includes("land") || normKey.includes("ews")
        ? GOVERNMENT_AUTHORITIES.REVENUE_DEPARTMENT
        : normKey.includes("marks") || normKey.includes("study") || normKey.includes("kannada") || normKey.includes("rural")
        ? GOVERNMENT_AUTHORITIES.STATE_EDUCATION_BOARD
        : normKey.includes("passport")
        ? GOVERNMENT_AUTHORITIES.PASSPORT_SEVA
        : GOVERNMENT_AUTHORITIES.UIDAI;

    const centreLookup = getCorrectionCentres(authority.id, userCity || "Bengaluru");

    const steps: GuidanceStep[] = (activeDoc.nextSteps || []).map((step, idx) => ({
      number: idx + 1,
      title: `Step ${idx + 1}`,
      explanation: step,
      requiredProof: idx === 1 ? ["Valid Photo Identity Proof", "Address Proof"] : undefined,
    }));

    return {
      id: `guidance-doc-${canonicalSlug}`,
      slug: canonicalSlug,
      title: `${activeDoc.displayName} Guidance`,
      subtitle: `Official instructions for obtaining, verifying, or rectifying your ${activeDoc.displayName}.`,
      category: "MISSING_DOCUMENT",
      severity: "WARNING",
      explanation: activeDoc.description,
      whyItMatters: activeDoc.purpose,
      whatYouShouldDo: [
        `1. Check the official requirements for ${activeDoc.displayName}.`,
        "2. Prepare the required identity proofs and revenue declarations.",
        "3. Apply through the designated official citizen services portal or taluk office.",
        "4. Await verification and digital certificate generation by the authority.",
        "5. Download the certified document and upload the image to DigiReady.",
      ],
      authority,
      correctionMethod: "HYBRID",
      stepByStep: steps,
      requiredDocuments: [
        "Government Identity Proof (Aadhaar / Voter ID)",
        "Address Proof (Electricity Bill / Ration Card)",
        "Relevant educational or income proofs",
      ],
      centreLookup,
      officialWebsite: authority.officialUrl || "https://nadakacheri.karnataka.gov.in",
      officialInstructionsUrl: authority.officialUrl,
      disclaimer:
        "DigiReady does not issue government certificates or submit applications. Verify current fees and application forms on the official authority portal.",
      afterCorrectionLifecycle: {
        steps: [
          "DOCUMENT MISSING",
          "APPLY VIA AUTHORITY",
          "OBTAIN OFFICIAL CERTIFICATE",
          "UPLOAD DOCUMENT IMAGE",
          "METADATA EXTRACTION",
          "METADATA CHECK COMPLETE",
          "READY TO APPLY",
        ],
        recheckActionNote:
          "Once you have obtained the certificate, upload the image to DigiReady to satisfy your application requirements.",
      },
    };
  }

  // 4. Service Requirements Topic
  const service =
    (await getServiceByName(slug)) ||
    (await getServiceByName(canonicalSlug)) ||
    (await getServiceByName(key));

  if (service) {
    const authority = GOVERNMENT_AUTHORITIES.UIDAI;
    const centreLookup = getCorrectionCentres("UIDAI", userCity || "Bengaluru");

    return {
      id: `guidance-service-${service.slug || service.serviceId}`,
      slug: service.slug || service.serviceId,
      title: `${service.serviceName || service.shortName || "Service"} Document Guidance`,
      subtitle: `Official document requirements and readiness guide for ${service.shortName || service.serviceName}.`,
      category: "SERVICE_REQUIREMENTS",
      severity: "INFO",
      explanation: service.description || "Official examination requirements.",
      whyItMatters: service.eligibilitySummary || "Ensure all requirements are satisfied before applying.",
      whatYouShouldDo: [
        `1. Check the required documents for ${service.serviceName || service.shortName}.`,
        "2. Verify that all required credentials exist in your DigiReady vault.",
        "3. Resolve any cross-document name, DOB, or category discrepancies.",
        "4. Confirm eligibility criteria and application window status.",
        "5. Once READY TO APPLY, proceed to the official application portal.",
      ],
      authority,
      correctionMethod: "ONLINE",
      stepByStep: [
        {
          number: 1,
          title: "Review Required Documents",
          explanation: `Ensure all mandatory documents for ${service.serviceName || service.shortName} are uploaded to DigiReady.`,
        },
        {
          number: 2,
          title: "Verify Consistency Across Documents",
          explanation: "Detect and resolve any identity discrepancies through the Guidance Center.",
        },
        {
          number: 3,
          title: "Proceed to Official Application Portal",
          explanation: `When readiness status reaches READY TO APPLY, submit your application on ${service.officialWebsite || "the official portal"}.`,
          officialLink: service.officialApplicationUrl || service.officialWebsite || undefined,
        },
      ],
      requiredDocuments: (service.requiredDocuments || []).map((r) => r.displayName || r.documentType),
      centreLookup,
      officialWebsite: service.officialWebsite || "https://india.gov.in",
      officialInstructionsUrl: service.officialApplicationUrl || service.officialWebsite || undefined,
      disclaimer: service.prototypeNotice || "DigiReady does not submit applications to official portals.",
      afterCorrectionLifecycle: {
        steps: [
          "DISCOVER REQUIREMENTS",
          "VAULT INVENTORY",
          "METADATA CHECK",
          "CONSISTENCY CHECK",
          "APPLICATION WINDOW OPEN",
          "READY TO APPLY",
          "OFFICIAL APPLICATION PORTAL",
        ],
        recheckActionNote:
          "Ensure all requirements are satisfied in your Application Journey before proceeding to the official portal.",
      },
    };
  }

  return null;
}

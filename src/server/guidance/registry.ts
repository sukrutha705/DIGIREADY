import { DocumentGuidance } from "./types";

/**
 * Normalizes document lookup string token for deterministic matching.
 */
function normalizeDocToken(str: string): string {
  if (!str || typeof str !== "string") {
    return "";
  }
  try {
    return decodeURIComponent(str).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  } catch {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }
}

/**
 * Centralized deterministic guidance registry for synthetic demo documents.
 * NOTE: These guidance notes are informational and structured for hackathon/prototype workflows.
 */
export const DEMO_DOCUMENT_GUIDANCE: Record<string, DocumentGuidance> = {
  INCOME_CERTIFICATE: {
    documentType: "INCOME_CERTIFICATE",
    displayName: "Income Certificate",
    description: "An official certificate certifying the annual income of an applicant or their family.",
    purpose: "Used to establish income eligibility for scholarships, fee concessions, reservations, and government welfare benefits.",
    nextSteps: [
      "Check the applicable official or local revenue authority (e.g., Nadakacheri, Taluk office, or state citizen service portal).",
      "Prepare supporting income declarations, employer salary slips, or agricultural revenue records.",
      "Submit the application online or in-person through the designated official public service process.",
    ],
    authorityNote: "Check the applicable official or local revenue authority for current application processes and guidelines.",
    aliases: [
      "income certificate",
      "family income certificate",
      "annual income certificate",
      "income cert",
      "income certificate guidance",
      "income certificate required",
      "income-certificate",
      "income_certificate",
      "income",
    ],
  },
  CASTE_CERTIFICATE: {
    documentType: "CASTE_CERTIFICATE",
    displayName: "Caste / Category Certificate",
    description: "An official document certifying the applicant's caste or reservation category.",
    purpose: "Required when claiming reservation benefits, quota seats, or community-specific scholarship eligibility.",
    nextSteps: [
      "Identify the competent revenue authority or citizen service center in your administrative jurisdiction.",
      "Prepare identity proof, family genealogical proof, or existing school records indicating caste category.",
      "Submit the application through the designated official citizen service channel.",
    ],
    authorityNote: "Check the applicable official or local revenue authority for current application processes and guidelines.",
    aliases: [
      "caste certificate",
      "category certificate",
      "form d caste certificate",
      "community certificate",
      "caste-certificate",
      "caste_certificate",
      "caste",
    ],
  },
  CASTE_INCOME_CERTIFICATE: {
    documentType: "CASTE_INCOME_CERTIFICATE",
    displayName: "Caste & Income Certificate",
    description: "A combined statutory revenue certificate certifying both community reservation category and annual household income (e.g. Form E / Form F in Karnataka).",
    purpose: "Required for state examination reservation quotas, fee waivers, and state scholarship disbursements.",
    nextSteps: [
      "Visit the state revenue department portal (e.g., Nadakacheri / MeeSeva / e-District) or local citizen facilitation centre.",
      "Submit Aadhaar, previous caste verification, and family income declarations.",
      "Collect the digitally signed certificate with official RD / GSC application barcode number.",
    ],
    authorityNote: "Issued by the jurisdictional Tahsildar / Revenue Authority.",
    aliases: [
      "caste income certificate",
      "caste and income certificate",
      "form e caste certificate",
      "form f caste certificate",
      "caste-income-certificate",
      "caste_income_certificate",
    ],
  },
  GOVERNMENT_IDENTITY_PROOF: {
    documentType: "GOVERNMENT_IDENTITY_PROOF",
    displayName: "Government Identity Proof",
    description: "A primary government-issued photo identity proof verifying the citizen's official name, date of birth, and identity.",
    purpose: "Used across public services and examinations to authenticate applicant identity and prevent impersonation.",
    nextSteps: [
      "Check with the relevant statutory identity authority (UIDAI / Election Commission / Ministry of Road Transport).",
      "Prepare supporting demographic proofs such as birth certificate or secondary school record.",
      "Complete biometric or demographic enrollment, or download an updated digital copy from official portals.",
    ],
    authorityNote: "Check the official identity authority portal or enrollment center for current procedures.",
    aliases: [
      "aadhaar",
      "aadhaar card",
      "identity proof",
      "govt id",
      "identity card",
      "government identity proof",
      "government-identity-proof",
      "government_identity_proof",
    ],
  },
  SECONDARY_MARKS_CARD: {
    documentType: "SECONDARY_MARKS_CARD",
    displayName: "10th / Secondary Marks Card",
    description: "Official academic marks card or certificate awarded upon completion of secondary school (10th / SSLC).",
    purpose: "Serves as standard proof of secondary educational qualification and date of birth verification.",
    nextSteps: [
      "Contact your secondary school, educational institution, or state examination board.",
      "For duplicate or consolidated marks cards, apply through the official state education board portal or board office.",
      "Ensure the candidate name and date of birth recorded match your primary identity records.",
    ],
    authorityNote: "Check with your state education board or examination authority for duplicate marks card procedures.",
    aliases: [
      "sslc marks card",
      "10th marks card",
      "class 10 marks card",
      "secondary marks card",
      "10th certificate",
      "secondary-marks-card",
      "secondary_marks_card",
    ],
  },
  HIGHER_SECONDARY_MARKS_CARD: {
    documentType: "HIGHER_SECONDARY_MARKS_CARD",
    displayName: "12th / Higher Secondary Marks Card",
    description: "Official academic marks card awarded upon completion of higher secondary / pre-university education (12th / 2nd PUC).",
    purpose: "Used as the qualifying academic record for competitive entrance examinations and higher education admissions.",
    nextSteps: [
      "Contact your junior college, pre-university institution, or higher secondary education board.",
      "If a replacement or certified copy is needed, submit a request through the board's designated student service portal.",
      "Verify that the subject combinations and candidate name are consistent with your application records.",
    ],
    authorityNote: "Check with the pre-university or higher secondary board for the current issuance process.",
    aliases: [
      "2nd puc marks card",
      "puc marks card",
      "12th marks card",
      "higher secondary marks card",
      "class 12 marks card",
      "higher-secondary-marks-card",
      "higher_secondary_marks_card",
    ],
  },
  STUDY_CERTIFICATE: {
    documentType: "STUDY_CERTIFICATE",
    displayName: "Study Certificate",
    description: "An institutional certificate confirming consecutive years of study completed at a recognized educational institution.",
    purpose: "Required for establishing state domicile eligibility, rural quota claims, or local candidate status.",
    nextSteps: [
      "Contact the head of the educational institution(s) where you studied during the relevant academic years.",
      "Request a study certificate specifying the academic years, standard/grades completed, and institutional registration details.",
      "Have the certificate countersigned by the jurisdictional education authority (e.g. BEO/DDPI) if required by the examination guidelines.",
    ],
    authorityNote: "Check the examination brochure or institutional guidelines for countersignature requirements.",
    aliases: [
      "study certificate",
      "school study certificate",
      "institution study certificate",
      "bonafide certificate",
      "study-certificate",
      "study_certificate",
    ],
  },
  ADDRESS_PROOF: {
    documentType: "ADDRESS_PROOF",
    displayName: "Address Proof",
    description: "An official document verifying residential address and local domicile status.",
    purpose: "Used for local jurisdictional verification, police clearances, and official correspondence.",
    nextSteps: [
      "Check which documents are accepted as address proof for your specific application (e.g. electricity bill, bank passbook, domicile certificate, or voter card).",
      "Ensure the address on your supporting document matches your current place of residence.",
      "Apply through local municipal or revenue authorities if a formal domicile certificate is needed.",
    ],
    authorityNote: "Check the specific application instructions for the full list of acceptable address proofs.",
    aliases: [
      "address proof",
      "proof of address",
      "residential certificate",
      "domicile certificate",
      "address-proof",
      "address_proof",
    ],
  },
  PASSPORT: {
    documentType: "PASSPORT",
    displayName: "Passport",
    description: "An official international travel and citizenship identity document issued by national passport authorities.",
    purpose: "Required for international travel, visa applications, and global identity verification.",
    nextSteps: [
      "Register on the official passport services portal (passportindia.gov.in).",
      "Fill out the online application form and schedule an appointment at a designated Passport Seva Kendra (PSK / POPSK).",
      "Prepare original identity proof, date of birth proof, and present address proof for document verification.",
    ],
    authorityNote: "Check the official passport authority portal for appointment scheduling and document requirements.",
    aliases: [
      "passport",
      "travel passport",
      "international passport",
    ],
  },
  EWS_CERTIFICATE: {
    documentType: "EWS_CERTIFICATE",
    displayName: "Economically Weaker Section (EWS) Certificate",
    description: "An official certificate issued by the competent revenue authority certifying eligibility for 10% EWS reservation in admissions and recruitments.",
    purpose: "Required when claiming Economically Weaker Section (EWS) category quota in central and state examinations.",
    nextSteps: [
      "Apply through the local Tehsildar office, Sub-Divisional Magistrate (SDM), or state citizen services portal.",
      "Provide proof of family gross annual income below Rs. 8 Lakhs, agricultural land holdings, and residential property documents.",
      "Obtain the Income & Asset Certificate for the current financial year.",
    ],
    authorityNote: "Must be issued by an authorized revenue officer not below the rank of Tehsildar.",
    aliases: [
      "ews certificate",
      "economically weaker section certificate",
      "income and asset certificate",
      "ews-certificate",
      "ews_certificate",
      "ews",
    ],
  },
  RURAL_CERTIFICATE: {
    documentType: "RURAL_CERTIFICATE",
    displayName: "Rural Study Certificate",
    description: "A certificate verifying 10 full academic years of study (from 1st to 10th standard) in a designated rural school area.",
    purpose: "Required when claiming rural candidate reservation (e.g. 15% rural quota in KCET).",
    nextSteps: [
      "Obtain signatures from the heads of all schools attended in rural areas from Class 1 to 10.",
      "Get the certificate countersigned by the jurisdictional Block Education Officer (BEO).",
      "Ensure the candidate's name matches school registers and secondary marks card.",
    ],
    authorityNote: "Requires mandatory countersignature by the Block Education Officer (BEO).",
    aliases: [
      "rural study certificate",
      "rural certificate",
      "rural quota certificate",
      "rural-certificate",
      "rural_certificate",
    ],
  },
  KANNADA_MEDIUM_CERTIFICATE: {
    documentType: "KANNADA_MEDIUM_CERTIFICATE",
    displayName: "Kannada Medium Study Certificate",
    description: "A certificate confirming 10 complete academic years of education (1st to 10th standard) with Kannada as the medium of instruction.",
    purpose: "Required when claiming 5% Kannada Medium reservation in state entrance examinations and government appointments.",
    nextSteps: [
      "Obtain the certificate from the Head of the Institution where Kannada medium schooling was completed.",
      "Get the certificate countersigned by the jurisdictional Block Education Officer (BEO).",
    ],
    authorityNote: "Requires institutional endorsement and BEO countersignature.",
    aliases: [
      "kannada medium certificate",
      "kannada medium study certificate",
      "kannada-medium-certificate",
      "kannada_medium_certificate",
    ],
  },
  DISABILITY_CERTIFICATE: {
    documentType: "DISABILITY_CERTIFICATE",
    displayName: "Disability / PwD Certificate (UDID)",
    description: "An official medical certificate or Unique Disability ID (UDID) card certifying benchmark disability (40% or more).",
    purpose: "Required when claiming PwD reservation, compensatory exam time, or scribe assistance.",
    nextSteps: [
      "Register on the national Unique Disability ID portal (swavlambancard.gov.in).",
      "Visit the designated district government medical hospital for assessment by a medical board.",
      "Download the verified UDID digital e-card upon medical board approval.",
    ],
    authorityNote: "Issued by the Department of Empowerment of Persons with Disabilities & District Medical Board.",
    aliases: [
      "disability certificate",
      "pwd certificate",
      "udid card",
      "unique disability id",
      "disability-certificate",
      "disability_certificate",
      "pwd",
    ],
  },
  LAND_REVENUE_RECORD: {
    documentType: "LAND_REVENUE_RECORD",
    displayName: "Land Ownership Record (RTC / Pahani / 7/12)",
    description: "Official record of rights, tenancy, and crops (RTC / Pahani / Khatoni) proving agricultural landholding.",
    purpose: "Required for farmer child reservation (Agriculturist quota) in agriculture entrance examinations and PM-KISAN verification.",
    nextSteps: [
      "Download digitally signed RTC from the state land records portal (e.g. Bhoomi, Bhulekh, Mahabhulekh).",
      "Obtain the Agriculturist Certificate from the jurisdictional Tahsildar / Revenue Inspector.",
    ],
    authorityNote: "Maintained and issued by the State Land Records and Revenue Department.",
    aliases: [
      "land revenue record",
      "rtc",
      "pahani",
      "khatoni",
      "record of rights",
      "7 12 extract",
      "land-revenue-record",
      "land_revenue_record",
    ],
  },
};

/**
 * Resolves document guidance by canonical key, display name, or alias (case-insensitive).
 * Returns null if no guidance exists for the given document type.
 */
export function getDocumentGuidance(documentType: string): DocumentGuidance | null {
  if (!documentType || typeof documentType !== "string") {
    return null;
  }

  const normalized = normalizeDocToken(documentType);
  if (!normalized) {
    return null;
  }

  // 1. Direct canonical key match (e.g. "INCOME_CERTIFICATE", "income_certificate", "income-certificate")
  const keyCandidate = normalized.toUpperCase().replace(/\s+/g, "_");
  if (DEMO_DOCUMENT_GUIDANCE[keyCandidate]) {
    return DEMO_DOCUMENT_GUIDANCE[keyCandidate];
  }

  // 2. Direct display name match
  for (const entry of Object.values(DEMO_DOCUMENT_GUIDANCE)) {
    if (normalizeDocToken(entry.displayName) === normalized) {
      return entry;
    }
  }

  // 3. Exact alias match
  for (const entry of Object.values(DEMO_DOCUMENT_GUIDANCE)) {
    if (entry.aliases) {
      for (const alias of entry.aliases) {
        const normAlias = normalizeDocToken(alias);
        if (normAlias === normalized) {
          return entry;
        }
      }
    }
  }

  // 4. Substring / Token Match (e.g. "income-certificate-guidance" or "missing income certificate")
  for (const entry of Object.values(DEMO_DOCUMENT_GUIDANCE)) {
    if (entry.aliases) {
      for (const alias of entry.aliases) {
        const normAlias = normalizeDocToken(alias);
        if (normAlias && (normalized === normAlias || normalized.includes(normAlias) || normAlias.includes(normalized))) {
          return entry;
        }
      }
    }
  }

  return null;
}

/**
 * Returns all registered document guidance specifications.
 */
export function getAllDocumentGuidance(): DocumentGuidance[] {
  return Object.values(DEMO_DOCUMENT_GUIDANCE);
}

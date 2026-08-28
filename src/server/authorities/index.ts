/**
 * DigiReady - Official Government Authority Registry
 * Defines deterministic metadata, jurisdiction notes, and official portals for public document issuing authorities.
 */

export interface GovernmentAuthority {
  id: string;
  name: string;
  shortName: string;
  jurisdiction: string;
  portalName: string;
  officialUrl?: string;
  officialProcessNote: string;
  appointmentInfoNote: string;
  disclaimer: string;
  supportedDocumentTypes: string[];
}

export const GOVERNMENT_AUTHORITIES: Record<string, GovernmentAuthority> = {
  UIDAI: {
    id: "UIDAI",
    name: "Unique Identification Authority of India (UIDAI)",
    shortName: "Aadhaar / UIDAI",
    jurisdiction: "National / Central Government of India",
    portalName: "myAadhaar Portal & Authorized Aadhaar Seva Kendras",
    officialUrl: "https://myaadhaar.uidai.gov.in",
    officialProcessNote:
      "Demographic updates (Name, Date of Birth, Gender, Address) can be requested through the official myAadhaar portal or at an authorized Aadhaar Seva Kendra / enrollment center. Biometric verification may be required.",
    appointmentInfoNote:
      "To locate an authorized Aadhaar Seva Kendra, visit the official UIDAI portal center locator. DigiReady does not process appointments or predict center waiting times.",
    disclaimer:
      "DigiReady is an independent preparation tool and cannot alter official Aadhaar database records. Confirm current document requirements and processing fees with UIDAI.",
    supportedDocumentTypes: ["GOVERNMENT_IDENTITY_PROOF", "PASSPORT"],
  },
  STATE_EDUCATION_BOARD: {
    id: "STATE_EDUCATION_BOARD",
    name: "State Secondary Education Examination Board / Department of Pre-University Education",
    shortName: "State Education Board (KSEEB / DPUE)",
    jurisdiction: "State Government (Karnataka / State Boards)",
    portalName: "State Education Department & School / College Administration",
    officialProcessNote:
      "Name or Date of Birth corrections on 10th (SSLC) or 12th (PUC) marks cards must be initiated through the school/college principal or directly with the state examination board with supporting official proof (e.g. Birth Certificate, Gazette notification if applicable).",
    appointmentInfoNote:
      "Applications must be routed through the institution where the examination was completed or submitted at the Divisional Board Office.",
    disclaimer:
      "DigiReady does not issue, modify, or endorse duplicate or corrected marks sheets. Requirements are governed by State Board regulations.",
    supportedDocumentTypes: ["SECONDARY_MARKS_CARD", "HIGHER_SECONDARY_MARKS_CARD", "STUDY_CERTIFICATE"],
  },
  REVENUE_DEPARTMENT: {
    id: "REVENUE_DEPARTMENT",
    name: "Department of Revenue (Nadakacheri / Tehsildar Office)",
    shortName: "Revenue Dept / Nadakacheri",
    jurisdiction: "State Revenue Department",
    portalName: "Nadakacheri / Seva Sindhu Citizen Portal",
    officialUrl: "https://nadakacheri.karnataka.gov.in",
    officialProcessNote:
      "Income Certificates, Caste Certificates, Domicile Certificates, and EWS Certificates are issued under the statutory authority of the Tahsildar. If family income, residence, or personal details have changed, a fresh certificate application or correction request must be submitted via Nadakacheri / Seva Sindhu or the local Taluk Office.",
    appointmentInfoNote:
      "Visit your local Atalji Janasnehi Kendra (Nadakacheri) or access the state citizen services portal.",
    disclaimer:
      "DigiReady cannot alter income assessment values or caste categories certified by the Revenue Department.",
    supportedDocumentTypes: ["INCOME_CERTIFICATE", "CASTE_CERTIFICATE", "DOMICILE_CERTIFICATE", "RURAL_STUDY_CERTIFICATE"],
  },
  PASSPORT_SEVA: {
    id: "PASSPORT_SEVA",
    name: "Passport Seva (Ministry of External Affairs, Government of India)",
    shortName: "Regional Passport Office",
    jurisdiction: "National / Ministry of External Affairs",
    portalName: "Passport Seva Portal",
    officialUrl: "https://www.passportindia.gov.in",
    officialProcessNote:
      "Demographic changes (Name, DOB, Parents' Names, Address) in a Passport require applying for a 'Re-issue of Passport' through the official Passport Seva portal followed by an appointment at a Passport Seva Kendra (PSK / POPSK).",
    appointmentInfoNote:
      "Book an appointment only through the official passportindia.gov.in portal.",
    disclaimer:
      "DigiReady does not schedule passport appointments or submit passport re-issue requests.",
    supportedDocumentTypes: ["PASSPORT"],
  },
  INCOME_TAX_DEPARTMENT: {
    id: "INCOME_TAX_DEPARTMENT",
    name: "Income Tax Department (NSDL / UTIITSL)",
    shortName: "Income Tax Dept (PAN)",
    jurisdiction: "National / Ministry of Finance",
    portalName: "Protean (NSDL) / UTIITSL PAN Service Portal",
    officialUrl: "https://www.onlineservices.nsdl.com/paam/endUserRegisterContact.html",
    officialProcessNote:
      "To correct Name, Date of Birth, or Father's Name in PAN records, submit a 'Changes or Correction in existing PAN data' application online via Protean (NSDL) or UTIITSL, backed by Aadhaar e-KYC or identity proof.",
    appointmentInfoNote:
      "Submit paperless e-KYC online or courier physical signed acknowledgement to the Protean / UTIITSL processing centre.",
    disclaimer:
      "DigiReady is an independent preparation system and cannot alter Income Tax Department PAN master records.",
    supportedDocumentTypes: ["GOVERNMENT_IDENTITY_PROOF"],
  },
  ELECTION_COMMISSION: {
    id: "ELECTION_COMMISSION",
    name: "Election Commission of India (ECI)",
    shortName: "Election Commission (Voter ID)",
    jurisdiction: "National / Election Commission of India",
    portalName: "ECI Voters' Service Portal",
    officialUrl: "https://voters.eci.gov.in",
    officialProcessNote:
      "To rectify Name, Date of Birth, or Address on a Voter ID (EPIC), submit Form 8 (Correction of entries in electoral roll) online through the ECI portal or via the Electoral Registration Officer (ERO) / Booth Level Officer (BLO).",
    appointmentInfoNote:
      "Submit Form 8 online with Aadhaar or 10th marks card as proof of identity/DOB.",
    disclaimer:
      "DigiReady cannot modify official electoral roll entries.",
    supportedDocumentTypes: ["GOVERNMENT_IDENTITY_PROOF"],
  },
  TRANSPORT_DEPARTMENT: {
    id: "TRANSPORT_DEPARTMENT",
    name: "Ministry of Road Transport & Highways (Parivahan Sarathi)",
    shortName: "RTO / Parivahan Sarathi",
    jurisdiction: "State Transport Departments / MoRTH",
    portalName: "Parivahan Sarathi Portal",
    officialUrl: "https://parivahan.gov.in",
    officialProcessNote:
      "To update Name or Date of Birth on a Driving Licence, submit an 'Application for Services on Driving Licence' (Change of Details) via the Parivahan Sarathi portal followed by document verification at the jurisdictional RTO.",
    appointmentInfoNote:
      "Book an RTO slot online via Sarathi if physical biometric verification is mandated by your state transport department.",
    disclaimer:
      "DigiReady does not issue or modify driving licence records.",
    supportedDocumentTypes: ["GOVERNMENT_IDENTITY_PROOF"],
  },
  EPFO: {
    id: "EPFO",
    name: "Employees' Provident Fund Organisation (EPFO)",
    shortName: "EPFO Member Portal",
    jurisdiction: "Ministry of Labour and Employment",
    portalName: "EPFO Unified Member Portal",
    officialUrl: "https://unifiedportal-mem.epfindia.gov.in",
    officialProcessNote:
      "Joint Declaration requests signed by the member and employer are required to correct Name, Father's Name, Date of Birth, or Gender in EPFO records, supported by Aadhaar KYC.",
    appointmentInfoNote:
      "Submit joint declaration online via the Member Portal or to the jurisdictional Regional PF Office.",
    disclaimer:
      "DigiReady cannot update EPF member profiles or employer approval workflows.",
    supportedDocumentTypes: ["GOVERNMENT_IDENTITY_PROOF"],
  },
  CIVIL_REGISTRATION: {
    id: "CIVIL_REGISTRATION",
    name: "Registrar of Births and Deaths / Municipal Corporation",
    shortName: "Civil Registration System (Birth / Death)",
    jurisdiction: "State Government / Municipal Administration",
    portalName: "Civil Registration System (CRS) / State Municipal Portal",
    officialUrl: "https://crsorgi.gov.in",
    officialProcessNote:
      "Name corrections on Birth Certificates must be requested at the office of the Registrar of Births and Deaths where the birth was registered, accompanied by hospital records or affidavit.",
    appointmentInfoNote:
      "Visit the local Municipal Ward office or Gram Panchayat office.",
    disclaimer:
      "DigiReady cannot alter statutory birth register entries.",
    supportedDocumentTypes: ["SECONDARY_MARKS_CARD", "GOVERNMENT_IDENTITY_PROOF"],
  },
};

export function getAuthorityForDocumentType(documentTypeKey: string): GovernmentAuthority {
  if (documentTypeKey === "GOVERNMENT_IDENTITY_PROOF") {
    return GOVERNMENT_AUTHORITIES.UIDAI;
  }
  if (documentTypeKey === "SECONDARY_MARKS_CARD" || documentTypeKey === "HIGHER_SECONDARY_MARKS_CARD") {
    return GOVERNMENT_AUTHORITIES.STATE_EDUCATION_BOARD;
  }
  if (
    documentTypeKey === "INCOME_CERTIFICATE" ||
    documentTypeKey === "CASTE_CERTIFICATE" ||
    documentTypeKey === "DOMICILE_CERTIFICATE" ||
    documentTypeKey === "RURAL_STUDY_CERTIFICATE"
  ) {
    return GOVERNMENT_AUTHORITIES.REVENUE_DEPARTMENT;
  }
  if (documentTypeKey === "PASSPORT") {
    return GOVERNMENT_AUTHORITIES.PASSPORT_SEVA;
  }
  return GOVERNMENT_AUTHORITIES.UIDAI;
}

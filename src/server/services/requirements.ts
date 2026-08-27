import { ServiceRequirement } from "./types";

/**
 * Synthetic Demo Service Requirements Registry.
 * NOTE: These are synthetic demonstration requirements for hackathon/prototype workflows,
 * not official authoritative government rules.
 */
export const DEMO_SERVICE_REQUIREMENTS: Record<string, ServiceRequirement> = {
  kcet: {
    serviceId: "kcet",
    serviceName: "KCET",
    description: "Karnataka Common Entrance Test for engineering and professional admissions.",
    requiredDocuments: [
      {
        documentType: "GOVERNMENT_IDENTITY_PROOF",
        displayName: "Government Identity Proof",
        required: true,
        aliases: ["aadhaar", "govt id", "identity card", "identity proof"],
      },
      {
        documentType: "SECONDARY_MARKS_CARD",
        displayName: "10th / SSLC Marks Card",
        required: true,
        aliases: ["sslc marks card", "10th marks card", "class 10 marks card", "secondary marks card"],
      },
      {
        documentType: "HIGHER_SECONDARY_MARKS_CARD",
        displayName: "12th / 2nd PUC Marks Card",
        required: true,
        aliases: ["2nd puc marks card", "puc marks card", "12th marks card", "higher secondary marks card"],
      },
      {
        documentType: "INCOME_CERTIFICATE",
        displayName: "Income Certificate",
        required: true,
        aliases: ["income certificate", "family income certificate", "annual income certificate"],
      },
      {
        documentType: "STUDY_CERTIFICATE",
        displayName: "7-Year Study Certificate",
        required: false,
        aliases: ["study certificate", "school study certificate", "institution study certificate"],
      },
    ],
  },
  scholarship: {
    serviceId: "scholarship",
    serviceName: "Government Scholarship",
    description: "Merit-cum-means post-matric educational scholarship scheme.",
    requiredDocuments: [
      {
        documentType: "GOVERNMENT_IDENTITY_PROOF",
        displayName: "Applicant Identity Proof",
        required: true,
        aliases: ["aadhaar", "govt id", "identity card"],
      },
      {
        documentType: "HIGHER_SECONDARY_MARKS_CARD",
        displayName: "Qualifying Examination Marks Card",
        required: true,
        aliases: ["2nd puc marks card", "12th marks card", "higher secondary marks card"],
      },
      {
        documentType: "INCOME_CERTIFICATE",
        displayName: "Family Annual Income Certificate",
        required: true,
        aliases: ["income certificate", "annual income certificate"],
      },
      {
        documentType: "CASTE_CERTIFICATE",
        displayName: "Category / Caste Certificate",
        required: false,
        aliases: ["caste certificate", "category certificate"],
      },
    ],
  },
  income_certificate: {
    serviceId: "income_certificate",
    serviceName: "Income Certificate",
    description: "Application for statutory annual income certificate issuance.",
    requiredDocuments: [
      {
        documentType: "GOVERNMENT_IDENTITY_PROOF",
        displayName: "Head of Household Identity Proof",
        required: true,
        aliases: ["aadhaar", "govt id", "identity card"],
      },
      {
        documentType: "ADDRESS_PROOF",
        displayName: "Taluk Residence Proof",
        required: true,
        aliases: ["address proof", "residential certificate", "domicile certificate"],
      },
    ],
  },
  passport: {
    serviceId: "passport",
    serviceName: "Passport",
    description: "Application for issuance of fresh travel passport document.",
    requiredDocuments: [
      {
        documentType: "GOVERNMENT_IDENTITY_PROOF",
        displayName: "Primary Identity Proof",
        required: true,
        aliases: ["aadhaar", "govt id", "identity card"],
      },
      {
        documentType: "SECONDARY_MARKS_CARD",
        displayName: "Date of Birth / Educational Proof",
        required: true,
        aliases: ["sslc marks card", "10th marks card", "secondary marks card"],
      },
      {
        documentType: "ADDRESS_PROOF",
        displayName: "Present Address Verification",
        required: true,
        aliases: ["address proof", "residential certificate", "domicile certificate"],
      },
    ],
  },
  epfo: {
    serviceId: "epfo",
    serviceName: "EPFO PF Transfer",
    description: "Online transfer of member provident fund account balance.",
    requiredDocuments: [
      {
        documentType: "GOVERNMENT_IDENTITY_PROOF",
        displayName: "Member Identity Verification",
        required: true,
        aliases: ["aadhaar", "govt id", "identity card"],
      },
      {
        documentType: "SECONDARY_MARKS_CARD",
        displayName: "Secondary DOB Verification Record",
        required: false,
        aliases: ["sslc marks card", "10th marks card"],
      },
    ],
  },
  pension: {
    serviceId: "pension",
    serviceName: "Pension Scheme",
    description: "Application for state social security pension scheme enrollment.",
    requiredDocuments: [
      {
        documentType: "GOVERNMENT_IDENTITY_PROOF",
        displayName: "Beneficiary Identity Proof",
        required: true,
        aliases: ["aadhaar", "govt id", "identity card"],
      },
      {
        documentType: "ADDRESS_PROOF",
        displayName: "Domicile & Residence Proof",
        required: true,
        aliases: ["address proof", "residential certificate"],
      },
      {
        documentType: "INCOME_CERTIFICATE",
        displayName: "Income Eligibility Certificate",
        required: true,
        aliases: ["income certificate", "family income certificate"],
      },
    ],
  },
};

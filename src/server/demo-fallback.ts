/**
 * DigiReady Resilient Demo & Deployment Fallback Adapter
 *
 * Provides high-fidelity synthetic demo data in memory when:
 * 1. The database connection is unavailable (e.g. fresh Vercel serverless deployment without SQLite/PostgreSQL).
 * 2. SQLite local file cannot be read/written in a serverless environment.
 * 3. The database is empty or unseeded.
 *
 * Ensures 100% feature availability with zero 500 server crashes.
 */

import type { User } from "@prisma/client";
import type { VaultDocumentDTO } from "./vault";
import type { UserActiveServiceDTO } from "@/types/service";

export const FALLBACK_DEMO_USER_ID = "demo-user-kcet-applicant";

export const FALLBACK_DEMO_USER: User = {
  id: FALLBACK_DEMO_USER_ID,
  displayName: "Demo Citizen (KCET Applicant)",
  dateOfBirth: new Date("2006-05-15T00:00:00.000Z"),
  gender: "Female",
  nationality: "Indian",
  state: "Karnataka",
  domicileState: "Karnataka",
  category: "General",
  educationQualification: "12TH_PASS",
  annualFamilyIncome: 450000,
  disabilityStatus: false,
  profileMetadataJson: JSON.stringify({
    email: "demo.citizen@digiready.gov.in",
    mobile: "+91 98765 43210",
    aadhaarLast4: "8812",
    panMasked: "ABCDE1234F",
    address: "No. 42, 5th Cross, Malleshwaram, Bengaluru, Karnataka - 560003",
  }),
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

export const FALLBACK_CANONICAL_TYPES = [
  {
    id: "type-gov-id",
    canonicalKey: "GOVERNMENT_IDENTITY_PROOF",
    displayName: "Government Identity Proof",
    category: "IDENTITY",
    aliases: ["Aadhaar", "Aadhaar Card", "Government Identity Proof", "Photo ID"],
  },
  {
    id: "type-sec-marks",
    canonicalKey: "SECONDARY_MARKS_CARD",
    displayName: "Secondary Marks Card",
    category: "EDUCATION",
    aliases: ["10th Marks Card", "SSLC Marks Card", "Class 10 Marks Card", "Secondary School Certificate"],
  },
  {
    id: "type-hi-sec-marks",
    canonicalKey: "HIGHER_SECONDARY_MARKS_CARD",
    displayName: "Higher Secondary Marks Card",
    category: "EDUCATION",
    aliases: ["12th Marks Card", "PUC Marks Card", "2nd PUC Marks Card", "Class 12 Marks Card"],
  },
  {
    id: "type-study-cert",
    canonicalKey: "STUDY_CERTIFICATE",
    displayName: "Study Certificate",
    category: "EDUCATION",
    aliases: ["Study Certificate", "School Study Certificate", "Domicile Study Certificate"],
  },
  {
    id: "type-income-cert",
    canonicalKey: "INCOME_CERTIFICATE",
    displayName: "Income Certificate",
    category: "FINANCIAL",
    aliases: ["Income Certificate", "Annual Family Income Certificate", "Revenue Income Certificate"],
  },
  {
    id: "type-caste-cert",
    canonicalKey: "CASTE_CERTIFICATE",
    displayName: "Caste Certificate",
    category: "SOCIAL_CERTIFICATE",
    aliases: ["Caste Certificate", "Category Caste Certificate", "Community Certificate"],
  },
  {
    id: "type-address-proof",
    canonicalKey: "ADDRESS_PROOF",
    displayName: "Address Proof",
    category: "IDENTITY",
    aliases: ["Address Proof", "Residential Certificate", "Proof of Address", "Domicile Certificate"],
  },
  {
    id: "type-unknown",
    canonicalKey: "UNKNOWN",
    displayName: "Unidentified Document",
    category: "OTHER",
    aliases: ["Unknown", "Unidentified Document"],
  },
];

// In-memory dynamic document store for serverless demo sessions
let inMemoryDynamicDocuments: VaultDocumentDTO[] = [];
let inMemoryActivePreparations: UserActiveServiceDTO[] = [
  {
    id: "active-kcet",
    userId: FALLBACK_DEMO_USER_ID,
    serviceId: "kcet",
    slug: "kcet",
    serviceName: "Karnataka Common Entrance Test (KCET)",
    shortName: "KCET",
    category: "EXAMINATION",
    authority: "Karnataka Examinations Authority (KEA)",
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "active-jee",
    userId: FALLBACK_DEMO_USER_ID,
    serviceId: "jee-main",
    slug: "jee-main",
    serviceName: "Joint Entrance Examination (Main)",
    shortName: "JEE Main",
    category: "EXAMINATION",
    authority: "National Testing Agency (NTA)",
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function getFallbackDemoUser(): User {
  return FALLBACK_DEMO_USER;
}

export function getBaselineVaultDocuments(userId: string = FALLBACK_DEMO_USER_ID): VaultDocumentDTO[] {
  const baseDocs: VaultDocumentDTO[] = [
    {
      id: "doc-aadhaar-001",
      userId,
      documentTypeId: "type-gov-id",
      documentTypeKey: "GOVERNMENT_IDENTITY_PROOF",
      documentTypeName: "Government Identity Proof",
      category: "IDENTITY",
      displayName: "Demo Identity Card (Aadhaar)",
      source: "ISSUED",
      issuer: "Demo Identity Authority (UIDAI)",
      issueDate: "2020-01-15T00:00:00.000Z",
      expiryDate: null,
      imageStorageKey: null,
      mimeType: null,
      fileSize: null,
      extractionStatus: "SUCCESS",
      extractionConfidence: 0.98,
      createdAt: "2026-01-15T00:00:00.000Z",
      updatedAt: "2026-01-15T00:00:00.000Z",
      fields: [
        { id: "f-aadh-1", fieldName: "fullName", fieldType: "NAME", semanticRole: "CANDIDATE_NAME", normalizedValue: "SUKRUTHA K" },
        { id: "f-aadh-2", fieldName: "dateOfBirth", fieldType: "DATE", semanticRole: "DATE_OF_BIRTH", normalizedValue: "2006-05-15" },
        { id: "f-aadh-3", fieldName: "parentName", fieldType: "NAME", semanticRole: "PARENT_NAME", normalizedValue: "KUMARASWAMY M" },
        { id: "f-aadh-4", fieldName: "documentRef", fieldType: "IDENTIFIER", semanticRole: "IDENTIFIER", normalizedValue: "SYNTH-AADHAAR-8812" },
        { id: "f-aadh-5", fieldName: "address", fieldType: "ADDRESS", semanticRole: "ADDRESS", normalizedValue: "Malleshwaram, Bengaluru, Karnataka" },
      ],
    },
    {
      id: "doc-sslc-002",
      userId,
      documentTypeId: "type-sec-marks",
      documentTypeKey: "SECONDARY_MARKS_CARD",
      documentTypeName: "Secondary Marks Card",
      category: "EDUCATION",
      displayName: "Class 10 SSLC Marks Card",
      source: "ISSUED",
      issuer: "Demo Karnataka Education Board (KSEAB)",
      issueDate: "2022-05-20T00:00:00.000Z",
      expiryDate: null,
      imageStorageKey: null,
      mimeType: null,
      fileSize: null,
      extractionStatus: "SUCCESS",
      extractionConfidence: 0.96,
      createdAt: "2026-01-16T00:00:00.000Z",
      updatedAt: "2026-01-16T00:00:00.000Z",
      fields: [
        { id: "f-sslc-1", fieldName: "candidateName", fieldType: "NAME", semanticRole: "CANDIDATE_NAME", normalizedValue: "K SUKRUTHA" },
        { id: "f-sslc-2", fieldName: "fatherName", fieldType: "NAME", semanticRole: "PARENT_NAME", normalizedValue: "KUMARASWAMY M" },
        { id: "f-sslc-3", fieldName: "dateOfBirth", fieldType: "DATE", semanticRole: "DATE_OF_BIRTH", normalizedValue: "2006-05-15" },
        { id: "f-sslc-4", fieldName: "passingYear", fieldType: "TEXT", semanticRole: "OTHER", normalizedValue: "2022" },
        { id: "f-sslc-5", fieldName: "registrationNumber", fieldType: "IDENTIFIER", semanticRole: "IDENTIFIER", normalizedValue: "SYNTH-SSLC-2022-8812" },
      ],
    },
    {
      id: "doc-puc-003",
      userId,
      documentTypeId: "type-hi-sec-marks",
      documentTypeKey: "HIGHER_SECONDARY_MARKS_CARD",
      documentTypeName: "Higher Secondary Marks Card",
      category: "EDUCATION",
      displayName: "2nd PUC Marks Card",
      source: "ISSUED",
      issuer: "Demo Pre-University Board",
      issueDate: "2024-05-22T00:00:00.000Z",
      expiryDate: null,
      imageStorageKey: null,
      mimeType: null,
      fileSize: null,
      extractionStatus: "SUCCESS",
      extractionConfidence: 0.97,
      createdAt: "2026-01-17T00:00:00.000Z",
      updatedAt: "2026-01-17T00:00:00.000Z",
      fields: [
        { id: "f-puc-1", fieldName: "candidateName", fieldType: "NAME", semanticRole: "CANDIDATE_NAME", normalizedValue: "SUKRUTHA K" },
        { id: "f-puc-2", fieldName: "fatherName", fieldType: "NAME", semanticRole: "PARENT_NAME", normalizedValue: "KUMARASWAMY M" },
        { id: "f-puc-3", fieldName: "dateOfBirth", fieldType: "DATE", semanticRole: "DATE_OF_BIRTH", normalizedValue: "2006-05-15" },
        { id: "f-puc-4", fieldName: "passingYear", fieldType: "TEXT", semanticRole: "OTHER", normalizedValue: "2024" },
        { id: "f-puc-5", fieldName: "registrationNumber", fieldType: "IDENTIFIER", semanticRole: "IDENTIFIER", normalizedValue: "SYNTH-PUC-2024-4431" },
      ],
    },
    {
      id: "doc-study-004",
      userId,
      documentTypeId: "type-study-cert",
      documentTypeKey: "STUDY_CERTIFICATE",
      documentTypeName: "Study Certificate",
      category: "EDUCATION",
      displayName: "School Study Certificate (7 Years)",
      source: "ISSUED",
      issuer: "Demo Government Pre-University College",
      issueDate: "2024-04-10T00:00:00.000Z",
      expiryDate: null,
      imageStorageKey: null,
      mimeType: null,
      fileSize: null,
      extractionStatus: "SUCCESS",
      extractionConfidence: 0.95,
      createdAt: "2026-01-18T00:00:00.000Z",
      updatedAt: "2026-01-18T00:00:00.000Z",
      fields: [
        { id: "f-std-1", fieldName: "studentName", fieldType: "NAME", semanticRole: "CANDIDATE_NAME", normalizedValue: "SUKRUTHA K" },
        { id: "f-std-2", fieldName: "studyYears", fieldType: "TEXT", semanticRole: "OTHER", normalizedValue: "7 YEARS (2017-2024)" },
        { id: "f-std-3", fieldName: "institutionName", fieldType: "ORGANIZATION", semanticRole: "ORGANIZATION", normalizedValue: "DEMO GOVT PU COLLEGE" },
      ],
    },
  ];

  return [...baseDocs, ...inMemoryDynamicDocuments];
}

export function addDynamicFallbackDocument(doc: VaultDocumentDTO): void {
  // Replace if exists, or append
  const idx = inMemoryDynamicDocuments.findIndex((d) => d.id === doc.id);
  if (idx >= 0) {
    inMemoryDynamicDocuments[idx] = doc;
  } else {
    inMemoryDynamicDocuments.unshift(doc);
  }
}

export function resetFallbackDocuments(): void {
  inMemoryDynamicDocuments = [];
}

export function getFallbackActivePreparations(): UserActiveServiceDTO[] {
  return inMemoryActivePreparations;
}

export function addFallbackActivePreparation(prep: UserActiveServiceDTO): void {
  if (!inMemoryActivePreparations.some((p) => p.slug === prep.slug)) {
    inMemoryActivePreparations.unshift(prep);
  }
}

import { PrismaClient } from "@prisma/client";
import { normalizeDocumentName } from "../src/server/ontology";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting DigiReady Phase 5 Database Seed (Hardened Architecture)...");

  // 1. Clean existing database records in reverse dependency order
  await prisma.identityEvidence.deleteMany();
  await prisma.serviceRequirement.deleteMany();
  await prisma.service.deleteMany();
  await prisma.requirementSource.deleteMany();
  await prisma.documentField.deleteMany();
  await prisma.document.deleteMany();
  await prisma.documentAlias.deleteMany();
  await prisma.documentType.deleteMany();
  await prisma.user.deleteMany();
  await prisma.systemHealth.deleteMany();

  // 2. Initialize SystemHealth
  await prisma.systemHealth.create({
    data: { status: "initialized" },
  });

  // 3. Define Canonical Document Types with Clean, Semantically Accurate Aliases
  const documentTypesData = [
    {
      canonicalKey: "GOVERNMENT_IDENTITY_PROOF",
      displayName: "Government Identity Proof",
      category: "IDENTITY",
      description: "Official government-issued identity proof document.",
      aliases: [
        "Government Identity Proof",
        "Official ID Proof",
        "Government Issued Photo ID",
        "Photo Identity Document",
      ],
    },
    {
      canonicalKey: "SECONDARY_MARKS_CARD",
      displayName: "Secondary Marks Card",
      category: "EDUCATION",
      description: "Marks card or certificate for completion of Secondary education (10th standard / SSLC).",
      aliases: [
        "SSLC Marks Card",
        "10th Marks Card",
        "Class X Marks Card",
        "Secondary School Certificate",
        "Class 10 Marks Card",
        "Matriculation Certificate",
      ],
    },
    {
      canonicalKey: "HIGHER_SECONDARY_MARKS_CARD",
      displayName: "Higher Secondary Marks Card",
      category: "EDUCATION",
      description: "Marks card or certificate for completion of Higher Secondary / Pre-University education (12th / 2nd PUC).",
      aliases: [
        "2nd PUC Marks Card",
        "PUC II Marks Card",
        "12th Marks Card",
        "Class XII Marks Card",
        "Higher Secondary Certificate",
        "Class 12 Marks Card",
        "Plus Two Certificate",
        "Higher Secondary Marks Card",
      ],
    },
    {
      canonicalKey: "STUDY_CERTIFICATE",
      displayName: "Study Certificate",
      category: "EDUCATION",
      description: "Institutional study certificate showing years of education completed.",
      aliases: [
        "Study Certificate (7 Years)",
        "Bonafide Study Certificate",
        "School Study Certificate",
        "Institution Study Certificate",
        "Study Certificate",
      ],
    },
    {
      canonicalKey: "CASTE_CERTIFICATE",
      displayName: "Caste Certificate",
      category: "SOCIAL_CERTIFICATE",
      description: "Official caste / category reservation certificate issued by competent revenue authority.",
      aliases: [
        "Category Certificate",
        "Form D Caste Certificate",
        "Community Certificate",
        "Caste Certificate",
      ],
    },
    {
      canonicalKey: "INCOME_CERTIFICATE",
      displayName: "Income Certificate",
      category: "FINANCIAL",
      description: "Official family annual income certificate issued by revenue authority.",
      aliases: [
        "Annual Income Certificate",
        "Family Income Certificate",
        "Revenue Income Certificate",
        "Income Certificate",
      ],
    },
    {
      canonicalKey: "ADDRESS_PROOF",
      displayName: "Address Proof",
      category: "ADDRESS",
      description: "Official residential or domicile proof of address.",
      aliases: [
        "Proof of Address",
        "Residential Certificate",
        "Domicile Certificate",
        "Address Proof",
      ],
    },
    {
      canonicalKey: "DEGREE_CERTIFICATE",
      displayName: "Degree Certificate",
      category: "EDUCATION",
      description: "Undergraduate or postgraduate degree completion certificate.",
      aliases: [
        "Bachelor Degree Certificate",
        "Convocation Degree Certificate",
        "Provisional Degree Certificate",
        "Degree Certificate",
      ],
    },
    {
      canonicalKey: "DIPLOMA_CERTIFICATE",
      displayName: "Diploma Certificate",
      category: "EDUCATION",
      description: "Technical or polytechnic diploma certificate.",
      aliases: [
        "Polytechnic Diploma Certificate",
        "State Diploma Marks Card",
        "Diploma Certificate",
      ],
    },
    {
      canonicalKey: "PASSPORT",
      displayName: "Passport",
      category: "TRAVEL",
      description: "Official travel and international identity passport.",
      aliases: [
        "Official Passport",
        "Travel Passport",
        "Passport",
      ],
    },
  ];

  const createdTypes: Record<string, string> = {};

  for (const docType of documentTypesData) {
    const created = await prisma.documentType.create({
      data: {
        canonicalKey: docType.canonicalKey,
        displayName: docType.displayName,
        category: docType.category,
        description: docType.description,
      },
    });

    createdTypes[docType.canonicalKey] = created.id;

    // Seed unique normalized aliases
    const seenNormalized = new Set<string>();
    for (const aliasText of docType.aliases) {
      const normalized = normalizeDocumentName(aliasText);
      if (normalized && !seenNormalized.has(normalized)) {
        seenNormalized.add(normalized);
        await prisma.documentAlias.create({
          data: {
            documentTypeId: created.id,
            alias: aliasText,
            normalizedAlias: normalized,
          },
        });
      }
    }
  }

  console.log(`✅ Seeded ${documentTypesData.length} canonical Document Types with aliases.`);

  // 4. Create Exactly ONE Synthetic Demo User
  const demoUser = await prisma.user.create({
    data: {
      displayName: "Demo Citizen (KCET Applicant)",
    },
  });

  console.log(`✅ Created Synthetic Demo User: ${demoUser.displayName} (${demoUser.id})`);

  // 5. Seed Synthetic Vault Documents & Multi-Role Identity Fields for Demo User
  const demoDocuments = [
    {
      typeKey: "GOVERNMENT_IDENTITY_PROOF",
      displayName: "Demo Identity Card",
      source: "ISSUED",
      issuer: "Demo Identity Authority",
      issueDate: new Date("2020-01-15T00:00:00Z"),
      fields: [
        { fieldName: "fullName", fieldType: "NAME", semanticRole: "CANDIDATE_NAME", normalizedValue: "DEMO CITIZEN" },
        { fieldName: "dateOfBirth", fieldType: "DATE", semanticRole: "DATE_OF_BIRTH", normalizedValue: "2006-05-15" },
        { fieldName: "documentRef", fieldType: "IDENTIFIER", semanticRole: "IDENTIFIER", normalizedValue: "SYNTH-ID-2020-001" },
      ],
    },
    {
      typeKey: "SECONDARY_MARKS_CARD",
      displayName: "Class 10 SSLC Marks Card",
      source: "ISSUED",
      issuer: "Demo Karnataka Education Board",
      issueDate: new Date("2022-05-20T00:00:00Z"),
      fields: [
        { fieldName: "candidateName", fieldType: "NAME", semanticRole: "CANDIDATE_NAME", normalizedValue: "DEMO CITIZEN" },
        { fieldName: "fatherName", fieldType: "NAME", semanticRole: "PARENT_NAME", normalizedValue: "DEMO PARENT" },
        { fieldName: "dateOfBirth", fieldType: "DATE", semanticRole: "DATE_OF_BIRTH", normalizedValue: "2006-05-15" },
        { fieldName: "passingYear", fieldType: "TEXT", semanticRole: "OTHER", normalizedValue: "2022" },
        { fieldName: "registrationNumber", fieldType: "IDENTIFIER", semanticRole: "IDENTIFIER", normalizedValue: "SYNTH-SSLC-2022-8812" },
      ],
    },
    {
      typeKey: "HIGHER_SECONDARY_MARKS_CARD",
      displayName: "2nd PUC Marks Card",
      source: "ISSUED",
      issuer: "Demo Pre-University Board",
      issueDate: new Date("2024-05-22T00:00:00Z"),
      fields: [
        { fieldName: "candidateName", fieldType: "NAME", semanticRole: "CANDIDATE_NAME", normalizedValue: "DEMO CITIZEN" },
        { fieldName: "fatherName", fieldType: "NAME", semanticRole: "PARENT_NAME", normalizedValue: "DEMO PARENT" },
        { fieldName: "dateOfBirth", fieldType: "DATE", semanticRole: "DATE_OF_BIRTH", normalizedValue: "2006-05-15" },
        { fieldName: "passingYear", fieldType: "TEXT", semanticRole: "OTHER", normalizedValue: "2024" },
        { fieldName: "registrationNumber", fieldType: "IDENTIFIER", semanticRole: "IDENTIFIER", normalizedValue: "SYNTH-PUC-2024-4431" },
      ],
    },
    {
      typeKey: "STUDY_CERTIFICATE",
      displayName: "School Study Certificate (7 Years)",
      source: "UPLOADED",
      issuer: "Demo Government Pre-University College",
      issueDate: new Date("2024-04-10T00:00:00Z"),
      fields: [
        { fieldName: "studentName", fieldType: "NAME", semanticRole: "CANDIDATE_NAME", normalizedValue: "DEMO CITIZEN" },
        { fieldName: "studyYears", fieldType: "TEXT", semanticRole: "OTHER", normalizedValue: "7 YEARS (2017-2024)" },
        { fieldName: "institutionName", fieldType: "ORGANIZATION", semanticRole: "ORGANIZATION", normalizedValue: "DEMO GOVT PU COLLEGE" },
      ],
    },
    {
      typeKey: "CASTE_CERTIFICATE",
      displayName: "Category Caste Certificate",
      source: "ISSUED",
      issuer: "Demo Revenue Authority",
      issueDate: new Date("2023-09-05T00:00:00Z"),
      fields: [
        { fieldName: "applicantName", fieldType: "NAME", semanticRole: "CANDIDATE_NAME", normalizedValue: "DEMO CITIZEN" },
        { fieldName: "categoryClaimed", fieldType: "TEXT", semanticRole: "OTHER", normalizedValue: "DEMO_CATEGORY_3A" },
        { fieldName: "validityPeriod", fieldType: "TEXT", semanticRole: "OTHER", normalizedValue: "PERMANENT" },
        { fieldName: "certificateRef", fieldType: "IDENTIFIER", semanticRole: "IDENTIFIER", normalizedValue: "SYNTH-RD-2023-9901" },
      ],
    },
    {
      typeKey: "ADDRESS_PROOF",
      displayName: "Residential Address Certificate",
      source: "ISSUED",
      issuer: "Demo Food & Civil Supplies Authority",
      issueDate: new Date("2021-03-15T00:00:00Z"),
      fields: [
        { fieldName: "residentName", fieldType: "NAME", semanticRole: "CANDIDATE_NAME", normalizedValue: "DEMO CITIZEN" },
        { fieldName: "addressLine", fieldType: "ADDRESS", semanticRole: "ADDRESS", normalizedValue: "DEMO NAGAR, BENGALURU, KARNATAKA" },
        { fieldName: "referenceNo", fieldType: "IDENTIFIER", semanticRole: "IDENTIFIER", normalizedValue: "SYNTH-ADDR-2021-1204" },
      ],
    },
  ];

  for (const doc of demoDocuments) {
    const docTypeId = createdTypes[doc.typeKey];
    if (!docTypeId) {
      throw new Error(`Missing DocumentType for key: ${doc.typeKey}`);
    }

    const createdDoc = await prisma.document.create({
      data: {
        userId: demoUser.id,
        documentTypeId: docTypeId,
        displayName: doc.displayName,
        source: doc.source,
        issuer: doc.issuer,
        issueDate: doc.issueDate,
      },
    });

    for (const field of doc.fields) {
      const createdField = await prisma.documentField.create({
        data: {
          documentId: createdDoc.id,
          fieldName: field.fieldName,
          fieldType: field.fieldType,
          semanticRole: field.semanticRole,
          normalizedValue: field.normalizedValue,
        },
      });

      // Create derived IdentityEvidence record
      if (field.semanticRole) {
        await prisma.identityEvidence.create({
          data: {
            userId: demoUser.id,
            documentId: createdDoc.id,
            fieldId: createdField.id,
            semanticRole: field.semanticRole,
            normalizedValue: field.normalizedValue,
          },
        });
      }
    }
  }

  console.log(`✅ Seeded ${demoDocuments.length} Synthetic Documents with Identity Evidence in Demo User's Vault.`);

  // 6. Seed Requirement Provenance Source (Phase 3 & Phase 5)
  const mockSource = await prisma.requirementSource.create({
    data: {
      name: "Demo Requirement Dataset (Mock Reference)",
      sourceType: "MOCK_REFERENCE",
      referenceUrl: null,
      retrievedAt: new Date("2026-08-01T00:00:00Z"),
      notes: "Synthetic requirement specifications used strictly for prototype demonstration. Not official guidelines.",
    },
  });

  const mockApiSource = await prisma.requirementSource.create({
    data: {
      name: "Demo Public Service Gateway (Mock API)",
      sourceType: "MOCK_API",
      referenceUrl: null,
      retrievedAt: new Date("2026-08-15T00:00:00Z"),
      notes: "Synthetic simulated gateway interface for public digital services.",
    },
  });

  console.log(`✅ Created RequirementSources: ${mockSource.name} & ${mockApiSource.name}`);

  // 7. Seed Public Services & Requirements (Phase 3 + Phase 5 Additions)
  const servicesData = [
    {
      serviceKey: "KCET_APPLICATION",
      name: "KCET Application",
      category: "EXAMINATION",
      providerName: "Demo Karnataka Examination Authority",
      shortDescription: "Synthetic demonstration of an examination application readiness workflow.",
      sourceId: mockSource.id,
      requirements: [
        {
          requirementKey: "KCET_GOVT_ID",
          docTypeKey: "GOVERNMENT_IDENTITY_PROOF",
          label: "Candidate Identity Verification",
          description: "Government-issued identity proof matching the applicant's official name.",
          requirementType: "REQUIRED",
          conditionKey: null,
          sortOrder: 1,
        },
        {
          requirementKey: "KCET_10TH_MARKS",
          docTypeKey: "SECONDARY_MARKS_CARD",
          label: "Class 10 / SSLC Marks Card",
          description: "Used to verify date of birth and secondary school educational qualification.",
          requirementType: "REQUIRED",
          conditionKey: null,
          sortOrder: 2,
        },
        {
          requirementKey: "KCET_12TH_MARKS",
          docTypeKey: "HIGHER_SECONDARY_MARKS_CARD",
          label: "Class 12 / 2nd PUC Marks Card",
          description: "Qualifying examination marks for engineering/professional ranking eligibility.",
          requirementType: "REQUIRED",
          conditionKey: null,
          sortOrder: 3,
        },
        {
          requirementKey: "KCET_STUDY_CERT",
          docTypeKey: "STUDY_CERTIFICATE",
          label: "7-Year Institutional Study Certificate",
          description: "Required for candidates claiming Karnataka domicile eligibility clause.",
          requirementType: "CONDITIONAL",
          conditionKey: "DOMICILE_ELIGIBILITY_CLAUSE",
          sortOrder: 4,
        },
        {
          requirementKey: "KCET_CASTE_CERT",
          docTypeKey: "CASTE_CERTIFICATE",
          label: "Category / Caste Reservation Certificate",
          description: "Required for candidates claiming reservation benefits under Category 1, 2A, 2B, 3A, 3B, SC, ST.",
          requirementType: "CONDITIONAL",
          conditionKey: "CATEGORY_RESERVATION_CLAIM",
          sortOrder: 5,
        },
        {
          requirementKey: "KCET_ADDRESS_PROOF",
          docTypeKey: "ADDRESS_PROOF",
          label: "Residential Address Verification",
          description: "Optional address proof for communication and local verification.",
          requirementType: "OPTIONAL",
          conditionKey: null,
          sortOrder: 6,
        },
      ],
    },
    {
      serviceKey: "SCHOLARSHIP_APPLICATION",
      name: "Government Scholarship Application",
      category: "SCHOLARSHIP",
      providerName: "Demo Scholarship Authority",
      shortDescription: "Synthetic demonstration of a merit-cum-means scholarship application workflow.",
      sourceId: mockSource.id,
      requirements: [
        {
          requirementKey: "SCHOL_GOVT_ID",
          docTypeKey: "GOVERNMENT_IDENTITY_PROOF",
          label: "Applicant Identity Proof",
          description: "Official identity proof for applicant DBT and enrollment.",
          requirementType: "REQUIRED",
          conditionKey: null,
          sortOrder: 1,
        },
        {
          requirementKey: "SCHOL_QUALIFYING_MARKS",
          docTypeKey: "HIGHER_SECONDARY_MARKS_CARD",
          label: "Qualifying Examination Marks Card",
          description: "Higher secondary score verification for merit eligibility.",
          requirementType: "REQUIRED",
          conditionKey: null,
          sortOrder: 2,
        },
        {
          requirementKey: "SCHOL_INCOME_CERT",
          docTypeKey: "INCOME_CERTIFICATE",
          label: "Family Annual Income Certificate",
          description: "Revenue income certificate certifying family income is within eligible scholarship thresholds.",
          requirementType: "REQUIRED",
          conditionKey: null,
          sortOrder: 3,
        },
        {
          requirementKey: "SCHOL_CASTE_CERT",
          docTypeKey: "CASTE_CERTIFICATE",
          label: "Reserved Category Certificate",
          description: "Required when applying under specific community scholarship schemes.",
          requirementType: "CONDITIONAL",
          conditionKey: "RESERVED_CATEGORY_CLAIM",
          sortOrder: 4,
        },
      ],
    },
    {
      serviceKey: "INCOME_CERTIFICATE_APPLICATION",
      name: "Income Certificate Application",
      category: "CERTIFICATE",
      providerName: "Demo Revenue Authority",
      shortDescription: "Synthetic demonstration of an annual income certificate issuance workflow.",
      sourceId: mockSource.id,
      requirements: [
        {
          requirementKey: "INC_APP_GOVT_ID",
          docTypeKey: "GOVERNMENT_IDENTITY_PROOF",
          label: "Head of Household Identity Proof",
          description: "Valid identity verification of the primary earner / applicant.",
          requirementType: "REQUIRED",
          conditionKey: null,
          sortOrder: 1,
        },
        {
          requirementKey: "INC_APP_ADDRESS",
          docTypeKey: "ADDRESS_PROOF",
          label: "Proof of Residence in Taluk",
          description: "Local residence verification document.",
          requirementType: "REQUIRED",
          conditionKey: null,
          sortOrder: 2,
        },
        {
          requirementKey: "INC_APP_PRIOR_INCOME",
          docTypeKey: "INCOME_CERTIFICATE",
          label: "Previous Year Income Declaration / Slip",
          description: "Supporting income proof to expedite verification.",
          requirementType: "OPTIONAL",
          conditionKey: null,
          sortOrder: 3,
        },
      ],
    },
    // Phase 5 Additional Synthetic Services
    {
      serviceKey: "EPFO_PF_TRANSFER",
      name: "EPFO Provident Fund Transfer",
      category: "EMPLOYMENT",
      providerName: "Demo Provident Fund Authority",
      shortDescription: "Synthetic demonstration of member provident fund account transfer.",
      sourceId: mockApiSource.id,
      requirements: [
        {
          requirementKey: "EPFO_GOVT_ID",
          docTypeKey: "GOVERNMENT_IDENTITY_PROOF",
          label: "Member Identity Verification",
          description: "Identity verification for UAN and member account matching.",
          requirementType: "REQUIRED",
          conditionKey: null,
          sortOrder: 1,
        },
        {
          requirementKey: "EPFO_SECONDARY_DOC",
          docTypeKey: "SECONDARY_MARKS_CARD",
          label: "Date of Birth Verification Proof",
          description: "Supporting secondary record for name and DOB synchronization.",
          requirementType: "OPTIONAL",
          conditionKey: null,
          sortOrder: 2,
        },
      ],
    },
    {
      serviceKey: "PASSPORT_APPLICATION",
      name: "Passport Application",
      category: "TRAVEL",
      providerName: "Demo Passport Authority",
      shortDescription: "Synthetic demonstration of international travel document issuance.",
      sourceId: mockApiSource.id,
      requirements: [
        {
          requirementKey: "PASS_GOVT_ID",
          docTypeKey: "GOVERNMENT_IDENTITY_PROOF",
          label: "Primary Identity Proof",
          description: "Official government-issued identity proof.",
          requirementType: "REQUIRED",
          conditionKey: null,
          sortOrder: 1,
        },
        {
          requirementKey: "PASS_DOB_PROOF",
          docTypeKey: "SECONDARY_MARKS_CARD",
          label: "Date of Birth / Educational Qualification Proof",
          description: "Secondary school certificate used for ECNR status and DOB.",
          requirementType: "REQUIRED",
          conditionKey: null,
          sortOrder: 2,
        },
        {
          requirementKey: "PASS_ADDRESS",
          docTypeKey: "ADDRESS_PROOF",
          label: "Present Address Verification",
          description: "Proof of residence for police verification clearance.",
          requirementType: "REQUIRED",
          conditionKey: null,
          sortOrder: 3,
        },
      ],
    },
    {
      serviceKey: "PENSION_APPLICATION",
      name: "Social Security Pension Scheme",
      category: "PENSION",
      providerName: "Demo Pension Authority",
      shortDescription: "Synthetic demonstration of social security pension enrollment.",
      sourceId: mockApiSource.id,
      requirements: [
        {
          requirementKey: "PENS_GOVT_ID",
          docTypeKey: "GOVERNMENT_IDENTITY_PROOF",
          label: "Beneficiary Identity Proof",
          description: "Official identity proof of the pension applicant.",
          requirementType: "REQUIRED",
          conditionKey: null,
          sortOrder: 1,
        },
        {
          requirementKey: "PENS_ADDRESS",
          docTypeKey: "ADDRESS_PROOF",
          label: "Domicile & Residence Proof",
          description: "Proof of domicile in the designated administrative district.",
          requirementType: "REQUIRED",
          conditionKey: null,
          sortOrder: 2,
        },
        {
          requirementKey: "PENS_INCOME",
          docTypeKey: "INCOME_CERTIFICATE",
          label: "Income Eligibility Certificate",
          description: "Income certificate for means-tested pension schemes.",
          requirementType: "OPTIONAL",
          conditionKey: null,
          sortOrder: 3,
        },
      ],
    },
  ];

  for (const svc of servicesData) {
    const createdService = await prisma.service.create({
      data: {
        serviceKey: svc.serviceKey,
        name: svc.name,
        category: svc.category,
        providerName: svc.providerName,
        shortDescription: svc.shortDescription,
        active: true,
      },
    });

    for (const req of svc.requirements) {
      const docTypeId = createdTypes[req.docTypeKey];
      if (!docTypeId) {
        throw new Error(`Missing DocumentType for key: ${req.docTypeKey}`);
      }

      await prisma.serviceRequirement.create({
        data: {
          serviceId: createdService.id,
          documentTypeId: docTypeId,
          requirementKey: req.requirementKey,
          label: req.label,
          description: req.description,
          requirementType: req.requirementType,
          conditionKey: req.conditionKey,
          sortOrder: req.sortOrder,
          sourceId: svc.sourceId,
        },
      });
    }

    console.log(`✅ Seeded Service: ${createdService.name} (${svc.requirements.length} requirements)`);
  }

  console.log("🎉 Phase 5 Seed Complete (6 Services, 20 Requirements, Multi-Document Identity Evidence)!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

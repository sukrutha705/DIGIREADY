import { describe, it, expect } from "vitest";
import { generateConflictGuidance } from "@/server/conflicts/guidance";
import { GOVERNMENT_AUTHORITIES } from "@/server/authorities";
import { FieldConsistencyComparison } from "@/server/consistency/types";

describe("Phase 9.2: Conflict Resolution Guidance & Official Authority Routing", () => {
  it("routes identity name conflict across Aadhaar and Education mark sheet with dual authority branches", () => {
    const comparison: FieldConsistencyComparison = {
      fieldKey: "name",
      fieldLabel: "Applicant Name",
      status: "POTENTIAL_MISMATCH",
      distinctValues: ["Priya Sharma", "Priya S"],
      explanation: "Name mismatch",
      severity: "CRITICAL",
      entries: [
        {
          documentId: "doc-aadhaar",
          documentTypeKey: "GOVERNMENT_IDENTITY_PROOF",
          documentDisplayName: "Aadhaar Card",
          fieldName: "name",
          rawValue: "Priya Sharma",
          normalizedValue: "priya sharma",
        },
        {
          documentId: "doc-sslc",
          documentTypeKey: "SECONDARY_MARKS_CARD",
          documentDisplayName: "SSLC Marks Card",
          fieldName: "candidate_name",
          rawValue: "Priya S",
          normalizedValue: "priya s",
        },
      ],
    };

    const guidance = generateConflictGuidance(comparison);

    expect(guidance.title).toBe("Identity Name Conflict");
    expect(guidance.authorityBranches.length).toBeGreaterThanOrEqual(2);
    expect(guidance.numberedSteps.length).toBeGreaterThanOrEqual(5);
    expect(guidance.caution).toContain("DigiReady does not alter government records");
  });

  it("routes date of birth conflicts to UIDAI and state education boards", () => {
    const comparison: FieldConsistencyComparison = {
      fieldKey: "dateOfBirth",
      fieldLabel: "Date of Birth",
      status: "POTENTIAL_MISMATCH",
      distinctValues: ["2006-05-15", "2006-06-15"],
      explanation: "Date of birth mismatch",
      severity: "CRITICAL",
      entries: [
        {
          documentId: "doc-aadhaar",
          documentTypeKey: "GOVERNMENT_IDENTITY_PROOF",
          documentDisplayName: "Aadhaar Card",
          fieldName: "dob",
          rawValue: "2006-05-15",
          normalizedValue: "2006-05-15",
        },
        {
          documentId: "doc-sslc",
          documentTypeKey: "SECONDARY_MARKS_CARD",
          documentDisplayName: "SSLC Marks Card",
          fieldName: "date_of_birth",
          rawValue: "2006-06-15",
          normalizedValue: "2006-06-15",
        },
      ],
    };

    const guidance = generateConflictGuidance(comparison);

    expect(guidance.conflictType).toBe("DOB_MISMATCH");
    expect(guidance.recommendedAuthority.name).toContain("Unique Identification Authority of India");
  });

  it("contains complete authority definitions without fabricated URLs", () => {
    expect(GOVERNMENT_AUTHORITIES.UIDAI.officialUrl).toBe("https://myaadhaar.uidai.gov.in");
    expect(GOVERNMENT_AUTHORITIES.REVENUE_DEPARTMENT.officialUrl).toBe("https://nadakacheri.karnataka.gov.in");
    expect(GOVERNMENT_AUTHORITIES.PASSPORT_SEVA.officialUrl).toBe("https://www.passportindia.gov.in");
    expect(GOVERNMENT_AUTHORITIES.INCOME_TAX_DEPARTMENT.officialUrl).toContain("nsdl.com");
    expect(GOVERNMENT_AUTHORITIES.ELECTION_COMMISSION.officialUrl).toBe("https://voters.eci.gov.in");
    expect(GOVERNMENT_AUTHORITIES.TRANSPORT_DEPARTMENT.officialUrl).toBe("https://parivahan.gov.in");
  });
});

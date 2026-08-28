import { describe, it, expect } from "vitest";
import {
  resolveCorrectionAuthority,
  requiresPhysicalCentre,
  buildConflictResolutionPlan,
  generateConflictGuidance,
} from "@/server/conflicts/guidance";
import { GOVERNMENT_AUTHORITIES } from "@/server/authorities";
import type { FieldConsistencyComparison } from "@/server/consistency/types";

describe("Phase 9.3: Correction Guidance & Authority Routing", () => {
  it("resolves UIDAI for Aadhaar name and date of birth conflicts", () => {
    const aadhaarComparison: FieldConsistencyComparison = {
      fieldKey: "name",
      fieldLabel: "Applicant Full Name",
      status: "POTENTIAL_MISMATCH",
      distinctValues: ["Priya Sharma", "Priya S"],
      explanation: "Name mismatch",
      severity: "CRITICAL",
      entries: [
        {
          documentId: "d1",
          documentDisplayName: "Aadhaar Card",
          documentTypeKey: "GOVERNMENT_IDENTITY_PROOF",
          fieldName: "name",
          rawValue: "Priya Sharma",
          normalizedValue: "priya sharma",
        },
        {
          documentId: "d2",
          documentDisplayName: "SSLC Marks Card",
          documentTypeKey: "SECONDARY_MARKS_CARD",
          fieldName: "candidate_name",
          rawValue: "Priya S",
          normalizedValue: "priya s",
        },
      ],
    };

    const authority = resolveCorrectionAuthority(aadhaarComparison);
    expect(authority.id).toBe("UIDAI");
    expect(requiresPhysicalCentre(aadhaarComparison)).toBe(true);

    const plan = buildConflictResolutionPlan(aadhaarComparison);
    expect(plan.authority.id).toBe("UIDAI");
    expect(plan.centreRequired).toBe(true);
    expect(plan.numberedSteps.length).toBeGreaterThanOrEqual(4);
    expect(plan.requiredSupportingDocuments.length).toBeGreaterThanOrEqual(1);
  });

  it("resolves Revenue Department for parent name and caste/income certificate conflicts", () => {
    const incomeComparison: FieldConsistencyComparison = {
      fieldKey: "parentName",
      fieldLabel: "Parent / Guardian Name",
      status: "POTENTIAL_MISMATCH",
      distinctValues: ["Ramesh Kumar", "Ramesh K"],
      explanation: "Parent name mismatch",
      severity: "CRITICAL",
      entries: [
        {
          documentId: "d1",
          documentDisplayName: "Income Certificate",
          documentTypeKey: "INCOME_CERTIFICATE",
          fieldName: "father_name",
          rawValue: "Ramesh Kumar",
          normalizedValue: "ramesh kumar",
        },
        {
          documentId: "d2",
          documentDisplayName: "SSLC Marks Card",
          documentTypeKey: "SECONDARY_MARKS_CARD",
          fieldName: "father_name",
          rawValue: "Ramesh K",
          normalizedValue: "ramesh k",
        },
      ],
    };

    const authority = resolveCorrectionAuthority(incomeComparison);
    expect(authority.id).toBe("REVENUE_DEPARTMENT");

    const plan = buildConflictResolutionPlan(incomeComparison);
    expect(plan.authority.id).toBe("REVENUE_DEPARTMENT");
    expect(plan.officialPortal).toContain("Nadakacheri");
  });

  it("resolves Passport Seva for Passport identity issues", () => {
    const passportComparison: FieldConsistencyComparison = {
      fieldKey: "name",
      fieldLabel: "Applicant Full Name",
      status: "POTENTIAL_MISMATCH",
      distinctValues: ["John Doe", "John D"],
      explanation: "Passport name mismatch",
      severity: "CRITICAL",
      entries: [
        {
          documentId: "d1",
          documentDisplayName: "Passport",
          documentTypeKey: "PASSPORT",
          fieldName: "given_name",
          rawValue: "John Doe",
          normalizedValue: "john doe",
        },
      ],
    };

    const authority = resolveCorrectionAuthority(passportComparison);
    expect(authority.id).toBe("PASSPORT_SEVA");
    expect(requiresPhysicalCentre(passportComparison)).toBe(true);
  });
});

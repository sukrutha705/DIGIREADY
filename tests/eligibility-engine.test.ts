import { describe, it, expect } from "vitest";
import { evaluateEligibility } from "@/server/eligibility/engine";
import { getServiceEligibilityRule, SERVICE_ELIGIBILITY_RULES } from "@/server/eligibility/rules";
import { UserEligibilityProfile } from "@/server/eligibility/types";

describe("Phase 9.2: Deterministic Eligibility Engine", () => {
  it("evaluates a fully eligible profile for KCET", () => {
    const profile: UserEligibilityProfile = {
      userId: "user-1",
      dateOfBirth: "2007-06-15", // ~18 years old
      educationQualification: "12TH_PASS",
      domicileState: "Karnataka",
      nationality: "Indian",
      category: "General",
      gender: "Female",
    };

    const rule = getServiceEligibilityRule("kcet");
    const result = evaluateEligibility(profile, rule);

    expect(result.overallStatus).toBe("ELIGIBLE");
    expect(result.statusLabel).toBe("Eligible based on available information");
    expect(result.criteria.every((c) => c.status === "PASS")).toBe(true);
  });

  it("evaluates ineligible age for UPSC Civil Services if candidate is 18", () => {
    const profile: UserEligibilityProfile = {
      userId: "user-young",
      dateOfBirth: "2008-01-01", // 18 years old (UPSC min age is 21)
      educationQualification: "GRADUATE",
      nationality: "Indian",
    };

    const rule = getServiceEligibilityRule("upsc-civil-services");
    const result = evaluateEligibility(profile, rule);

    expect(result.overallStatus).toBe("NOT_ELIGIBLE");
    const ageCrit = result.criteria.find((c) => c.category === "AGE" || c.id === "age-requirement");
    expect(ageCrit?.status).toBe("FAIL");
    expect(ageCrit?.explanation).toContain("below the minimum required age");
  });

  it("applies category age relaxation for SC/ST in UPSC", () => {
    const profile: UserEligibilityProfile = {
      userId: "user-relaxed",
      dateOfBirth: "1991-05-01", // ~35 years old (General max is 32, SC/ST gets +5 = 37)
      educationQualification: "GRADUATE",
      nationality: "Indian",
      category: "SC",
    };

    const rule = getServiceEligibilityRule("upsc-civil-services");
    const result = evaluateEligibility(profile, rule);

    const ageCrit = result.criteria.find((c) => c.category === "AGE" || c.id === "age-requirement");
    expect(ageCrit?.status).toBe("PASS");
  });

  it("requires additional information when qualification or DOB is missing", () => {
    const profile: UserEligibilityProfile = {
      userId: "user-missing-dob",
      nationality: "Indian",
    };

    const rule = getServiceEligibilityRule("jee-main");
    const result = evaluateEligibility(profile, rule);

    expect(result.overallStatus).toBe("NEEDS_INFORMATION");
    expect(result.missingFields).toContain("educationQualification");
    expect(result.summary).toContain("DigiReady needs additional profile details");
  });

  it("evaluates income criteria for SSP Scholarship correctly", () => {
    const eligibleProfile: UserEligibilityProfile = {
      userId: "user-ssp-ok",
      dateOfBirth: "2006-03-10",
      educationQualification: "12TH_PASS",
      domicileState: "Karnataka",
      nationality: "Indian",
      annualFamilyIncome: 180000, // <= 250000 limit
    };

    const rule = getServiceEligibilityRule("ssp");
    const result = evaluateEligibility(eligibleProfile, rule);

    expect(result.overallStatus).toBe("ELIGIBLE");
    const incomeCrit = result.criteria.find((c) => c.category === "INCOME" || c.id === "income-limit");
    expect(incomeCrit?.status).toBe("PASS");

    // Over income limit
    const overIncomeProfile: UserEligibilityProfile = {
      ...eligibleProfile,
      annualFamilyIncome: 350000,
    };
    const overResult = evaluateEligibility(overIncomeProfile, rule);
    expect(overResult.overallStatus).toBe("NOT_ELIGIBLE");
    const failedIncome = overResult.criteria.find((c) => c.category === "INCOME" || c.id === "income-limit");
    expect(failedIncome?.status).toBe("FAIL");
  });

  it("contains authoritative eligibility rules for key services", () => {
    expect(SERVICE_ELIGIBILITY_RULES["kcet"]).toBeDefined();
    expect(SERVICE_ELIGIBILITY_RULES["jee-main"]).toBeDefined();
    expect(SERVICE_ELIGIBILITY_RULES["neet-ug"]).toBeDefined();
    expect(SERVICE_ELIGIBILITY_RULES["upsc-civil-services"]).toBeDefined();
    expect(SERVICE_ELIGIBILITY_RULES["ssp"]).toBeDefined();
    expect(SERVICE_ELIGIBILITY_RULES["passport"]).toBeDefined();
  });
});

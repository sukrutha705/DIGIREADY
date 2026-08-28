/**
 * DigiReady - Deterministic Eligibility Evaluation Engine
 * Phase 9.2: Evaluates citizen profile attributes against authoritative service requirements.
 */

import {
  EligibilityCriterion,
  EligibilityStatus,
  EligibilityStatuses,
  CriterionStatus,
  CriterionStatuses,
  ServiceEligibilityResult,
  ServiceEligibilityRule,
  UserEligibilityProfile,
  ValueProvenanceSource,
  ValueProvenanceSources,
} from "./types";

const QUALIFICATION_LEVELS: Record<string, number> = {
  "10TH_PASS": 1,
  "SECONDARY": 1,
  "SSLC": 1,
  "12TH_PASS": 2,
  "HIGHER_SECONDARY": 2,
  "PUC": 2,
  "DIPLOMA": 2,
  "GRADUATE": 3,
  "BACHELORS": 3,
  "ENGINEERING": 3,
  "POST_GRADUATE": 4,
  "MASTERS": 4,
  "DOCTORATE": 5,
};

function normalizeQualLevel(qual?: string | null): number {
  if (!qual) return 0;
  const key = qual.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  for (const [q, level] of Object.entries(QUALIFICATION_LEVELS)) {
    if (key.includes(q)) return level;
  }
  return 0;
}

function calculateAgeFromDob(dobStr?: string | null): number | null {
  if (!dobStr) return null;
  const birthDate = new Date(dobStr);
  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Deterministically evaluates a user's eligibility against an authoritative service rule.
 */
export function evaluateEligibility(
  profile: UserEligibilityProfile,
  rule: ServiceEligibilityRule
): ServiceEligibilityResult {
  const criteria: EligibilityCriterion[] = [];
  const missingFields: string[] = [];
  const sourceMap = profile.sourceMap || {};

  // 1. AGE CRITERION
  if (rule.minAge !== undefined || rule.maxAge !== undefined) {
    const age = profile.age ?? calculateAgeFromDob(profile.dateOfBirth);
    const dobSource: ValueProvenanceSource = profile.dateOfBirth
      ? sourceMap["dateOfBirth"] || ValueProvenanceSources.USER_PROVIDED
      : ValueProvenanceSources.NOT_PROVIDED;

    if (age === null || age === undefined) {
      missingFields.push("dateOfBirth");
      criteria.push({
        id: "age-requirement",
        name: "Age Requirement",
        category: "AGE",
        status: CriterionStatuses.NEEDS_INFORMATION,
        conditionDescription: `Requires age between ${rule.minAge ?? 0} and ${rule.maxAge ?? "No limit"} years.`,
        explanation: "Your date of birth is required to evaluate the age condition.",
        requiredField: "dateOfBirth",
        providedValue: null,
        valueSource: ValueProvenanceSources.NOT_PROVIDED,
        officialRuleSummary: rule.ageReferenceDate
          ? `Calculated as of ${rule.ageReferenceDate}.`
          : undefined,
      });
    } else {
      // Calculate effective max age including category relaxation
      let effectiveMaxAge = rule.maxAge;
      let relaxationApplied = 0;
      if (rule.maxAge && rule.ageRelaxationRules && profile.category) {
        relaxationApplied = rule.ageRelaxationRules[profile.category] || 0;
        effectiveMaxAge = rule.maxAge + relaxationApplied;
      }

      let passed = true;
      let failReason = "";

      if (rule.minAge !== undefined && age < rule.minAge) {
        passed = false;
        failReason = `Your calculated age (${age} years) is below the minimum required age of ${rule.minAge} years.`;
      } else if (effectiveMaxAge !== undefined && age > effectiveMaxAge) {
        passed = false;
        failReason = `Your calculated age (${age} years) exceeds the maximum allowed age of ${effectiveMaxAge} years${
          relaxationApplied > 0 ? ` (including ${relaxationApplied} years category relaxation)` : ""
        }.`;
      }

      criteria.push({
        id: "age-requirement",
        name: "Age Requirement",
        category: "AGE",
        status: passed ? CriterionStatuses.PASS : CriterionStatuses.FAIL,
        conditionDescription: `Requires age between ${rule.minAge ?? 0} and ${effectiveMaxAge ?? "No limit"} years.`,
        explanation: passed
          ? `Your age (${age} years) satisfies the service requirement (${rule.minAge ?? 0} to ${effectiveMaxAge ?? "No limit"} years).`
          : failReason,
        providedValue: `${age} years`,
        valueSource: dobSource,
      });
    }
  }

  // 2. EDUCATION QUALIFICATION CRITERION
  if (rule.minEducationQualification) {
    const userLevel = normalizeQualLevel(profile.educationQualification);
    const requiredLevel = normalizeQualLevel(rule.minEducationQualification);
    const qualSource = profile.educationQualification
      ? sourceMap["educationQualification"] || ValueProvenanceSources.USER_PROVIDED
      : ValueProvenanceSources.NOT_PROVIDED;

    if (!profile.educationQualification || userLevel === 0) {
      missingFields.push("educationQualification");
      criteria.push({
        id: "education-requirement",
        name: "Educational Qualification",
        category: "EDUCATION",
        status: CriterionStatuses.NEEDS_INFORMATION,
        conditionDescription: `Requires minimum qualification of ${rule.minEducationQualification.replace(/_/g, " ")}.`,
        explanation: "Your educational qualification is required to evaluate this condition.",
        requiredField: "educationQualification",
        providedValue: null,
        valueSource: ValueProvenanceSources.NOT_PROVIDED,
      });
    } else if (userLevel < requiredLevel) {
      criteria.push({
        id: "education-requirement",
        name: "Educational Qualification",
        category: "EDUCATION",
        status: CriterionStatuses.FAIL,
        conditionDescription: `Requires minimum qualification of ${rule.minEducationQualification.replace(/_/g, " ")}.`,
        explanation: `Your recorded qualification (${profile.educationQualification}) does not satisfy the minimum requirement of ${rule.minEducationQualification.replace(/_/g, " ")}.`,
        providedValue: profile.educationQualification,
        valueSource: qualSource,
      });
    } else {
      criteria.push({
        id: "education-requirement",
        name: "Educational Qualification",
        category: "EDUCATION",
        status: CriterionStatuses.PASS,
        conditionDescription: `Requires minimum qualification of ${rule.minEducationQualification.replace(/_/g, " ")}.`,
        explanation: `Your recorded qualification (${profile.educationQualification}) satisfies the minimum education requirement.`,
        providedValue: profile.educationQualification,
        valueSource: qualSource,
      });
    }
  }

  // 3. DOMICILE / RESIDENCE CRITERION
  if (rule.requiredDomicile && rule.requiredDomicile.toUpperCase() !== "ANY") {
    const domicile = profile.domicileState || profile.state;
    const domSource = domicile
      ? sourceMap["domicileState"] || sourceMap["state"] || ValueProvenanceSources.USER_PROVIDED
      : ValueProvenanceSources.NOT_PROVIDED;

    if (!domicile) {
      missingFields.push("domicileState");
      criteria.push({
        id: "domicile-requirement",
        name: "Domicile & State Residence",
        category: "DOMICILE",
        status: CriterionStatuses.NEEDS_INFORMATION,
        conditionDescription: `Requires candidate to be a domicile / resident of ${rule.requiredDomicile}.`,
        explanation: `Your state of domicile is required to evaluate residence criteria for this service.`,
        requiredField: "domicileState",
        providedValue: null,
        valueSource: ValueProvenanceSources.NOT_PROVIDED,
      });
    } else if (domicile.toLowerCase() !== rule.requiredDomicile.toLowerCase()) {
      criteria.push({
        id: "domicile-requirement",
        name: "Domicile & State Residence",
        category: "DOMICILE",
        status: CriterionStatuses.FAIL,
        conditionDescription: `Requires candidate to be a domicile / resident of ${rule.requiredDomicile}.`,
        explanation: `Your recorded state (${domicile}) does not match the required domicile of ${rule.requiredDomicile}.`,
        providedValue: domicile,
        valueSource: domSource,
      });
    } else {
      criteria.push({
        id: "domicile-requirement",
        name: "Domicile & State Residence",
        category: "DOMICILE",
        status: CriterionStatuses.PASS,
        conditionDescription: `Requires candidate to be a domicile / resident of ${rule.requiredDomicile}.`,
        explanation: `Your recorded domicile (${domicile}) matches the state eligibility requirement.`,
        providedValue: domicile,
        valueSource: domSource,
      });
    }
  }

  // 4. NATIONALITY CRITERION
  if (rule.acceptedNationalities && rule.acceptedNationalities.length > 0) {
    const nationality = profile.nationality || "Indian"; // Default standard
    const natSource = sourceMap["nationality"] || ValueProvenanceSources.USER_PROVIDED;
    const accepted = rule.acceptedNationalities.some(
      (n) => n.toLowerCase() === nationality.toLowerCase()
    );

    criteria.push({
      id: "nationality-requirement",
      name: "Nationality & Citizenship",
      category: "NATIONALITY",
      status: accepted ? CriterionStatuses.PASS : CriterionStatuses.FAIL,
      conditionDescription: `Accepted citizenship: ${rule.acceptedNationalities.join(", ")}.`,
      explanation: accepted
        ? `Your recorded citizenship (${nationality}) satisfies the eligibility requirement.`
        : `Your recorded citizenship (${nationality}) is not among the eligible nationalities (${rule.acceptedNationalities.join(", ")}).`,
      providedValue: nationality,
      valueSource: natSource,
    });
  }

  // 5. GENDER CRITERION (if specific scheme requires, e.g. Sukanya)
  if (rule.allowedGenders && rule.allowedGenders.length > 0) {
    const genderSource = profile.gender
      ? sourceMap["gender"] || ValueProvenanceSources.USER_PROVIDED
      : ValueProvenanceSources.NOT_PROVIDED;

    if (!profile.gender) {
      missingFields.push("gender");
      criteria.push({
        id: "gender-requirement",
        name: "Gender Eligibility",
        category: "GENDER",
        status: CriterionStatuses.NEEDS_INFORMATION,
        conditionDescription: `Applicable to: ${rule.allowedGenders.join(", ")}.`,
        explanation: "Your gender information is required to evaluate eligibility for this scheme.",
        requiredField: "gender",
        providedValue: null,
        valueSource: ValueProvenanceSources.NOT_PROVIDED,
      });
    } else {
      const allowed = rule.allowedGenders.some(
        (g) => g.toLowerCase() === profile.gender!.toLowerCase()
      );
      criteria.push({
        id: "gender-requirement",
        name: "Gender Eligibility",
        category: "GENDER",
        status: allowed ? CriterionStatuses.PASS : CriterionStatuses.FAIL,
        conditionDescription: `Applicable to: ${rule.allowedGenders.join(", ")}.`,
        explanation: allowed
          ? `Gender condition (${profile.gender}) is satisfied.`
          : `This scheme is specifically designated for ${rule.allowedGenders.join(", ")}.`,
        providedValue: profile.gender,
        valueSource: genderSource,
      });
    }
  }

  // 6. FAMILY INCOME CRITERION (e.g. EWS or scholarships)
  if (rule.maxAnnualFamilyIncome !== undefined) {
    const incomeSource = profile.annualFamilyIncome !== undefined && profile.annualFamilyIncome !== null
      ? sourceMap["annualFamilyIncome"] || ValueProvenanceSources.USER_PROVIDED
      : ValueProvenanceSources.NOT_PROVIDED;

    if (profile.annualFamilyIncome === undefined || profile.annualFamilyIncome === null) {
      missingFields.push("annualFamilyIncome");
      criteria.push({
        id: "income-requirement",
        name: "Family Annual Income",
        category: "INCOME",
        status: CriterionStatuses.NEEDS_INFORMATION,
        conditionDescription: `Annual family income must not exceed ₹${rule.maxAnnualFamilyIncome.toLocaleString("en-IN")}.`,
        explanation: "Your certified annual family income is required to evaluate this income ceiling.",
        requiredField: "annualFamilyIncome",
        providedValue: null,
        valueSource: ValueProvenanceSources.NOT_PROVIDED,
      });
    } else if (profile.annualFamilyIncome > rule.maxAnnualFamilyIncome) {
      criteria.push({
        id: "income-requirement",
        name: "Family Annual Income",
        category: "INCOME",
        status: CriterionStatuses.FAIL,
        conditionDescription: `Annual family income must not exceed ₹${rule.maxAnnualFamilyIncome.toLocaleString("en-IN")}.`,
        explanation: `Your recorded income (₹${profile.annualFamilyIncome.toLocaleString("en-IN")}) exceeds the statutory limit of ₹${rule.maxAnnualFamilyIncome.toLocaleString("en-IN")}.`,
        providedValue: `₹${profile.annualFamilyIncome.toLocaleString("en-IN")}`,
        valueSource: incomeSource,
      });
    } else {
      criteria.push({
        id: "income-requirement",
        name: "Family Annual Income",
        category: "INCOME",
        status: CriterionStatuses.PASS,
        conditionDescription: `Annual family income must not exceed ₹${rule.maxAnnualFamilyIncome.toLocaleString("en-IN")}.`,
        explanation: `Your recorded income (₹${profile.annualFamilyIncome.toLocaleString("en-IN")}) is within the statutory ceiling of ₹${rule.maxAnnualFamilyIncome.toLocaleString("en-IN")}.`,
        providedValue: `₹${profile.annualFamilyIncome.toLocaleString("en-IN")}`,
        valueSource: incomeSource,
      });
    }
  }

  // 7. CUSTOM / STATUTORY SUMMARY CONDITION (Informational)
  if (rule.customConditionSummary && criteria.length === 0) {
    criteria.push({
      id: "statutory-regulations",
      name: "Statutory Eligibility Regulations",
      category: "OTHER",
      status: CriterionStatuses.PASS,
      conditionDescription: rule.customConditionSummary,
      explanation: rule.customConditionSummary,
      providedValue: "Standard Citizen Profile",
      valueSource: ValueProvenanceSources.USER_PROVIDED,
    });
  }

  // DETERMINE OVERALL STATUS
  const hasFail = criteria.some((c) => c.status === CriterionStatuses.FAIL);
  const hasNeedsInfo = criteria.some((c) => c.status === CriterionStatuses.NEEDS_INFORMATION);

  let overallStatus: EligibilityStatus = EligibilityStatuses.ELIGIBLE;
  let statusLabel = "Eligible based on available information";
  let summary = "All evaluated statutory eligibility criteria are satisfied based on your available profile and document data.";

  if (hasFail) {
    overallStatus = EligibilityStatuses.NOT_ELIGIBLE;
    statusLabel = "Not currently eligible based on available information";
    const failCriteria = criteria.filter((c) => c.status === CriterionStatuses.FAIL);
    summary = `Based on the information available to DigiReady, one or more statutory eligibility conditions are not currently met: ${failCriteria
      .map((c) => c.explanation)
      .join(" ")}`;
  } else if (hasNeedsInfo) {
    overallStatus = EligibilityStatuses.NEEDS_INFORMATION;
    statusLabel = "More information required";
    summary = `DigiReady needs additional profile details (${missingFields.join(
      ", "
    )}) to complete the eligibility assessment. Please provide the required information.`;
  }

  return {
    serviceId: rule.serviceId,
    serviceName: rule.serviceName,
    overallStatus,
    isEligible: overallStatus === EligibilityStatuses.ELIGIBLE,
    needsInformation: overallStatus === EligibilityStatuses.NEEDS_INFORMATION,
    statusLabel,
    summary,
    criteria,
    missingFields,
    sourceReference: rule.sourceReference,
    sourceUrl: rule.sourceUrl,
    evaluatedAt: new Date().toISOString(),
    disclaimer:
      "Eligibility assessment is generated by DigiReady based on authoritative conducting authority rules and your recorded information. Official eligibility is subject to final verification by the conducting authority.",
  };
}

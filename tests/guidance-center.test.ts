import { describe, it, expect } from "vitest";
import { getGuidanceHubData, getGuidanceTopicBySlug } from "@/server/guidance/service";
import { getDemoUser } from "@/server/vault";
import { getApplicationJourney } from "@/server/journey/service";
import { resolveCanonicalGuidanceSlug, getCanonicalDocumentSlug } from "@/server/guidance/slugs";

describe("Phase 10 & Bug Fix: Guidance Center Hub & Topic Resolution", () => {
  it("retrieves complete Guidance Hub summary with active issues, missing document guides, and authorities", async () => {
    const demoUser = await getDemoUser();
    const hub = await getGuidanceHubData(demoUser.id, "Bengaluru");

    expect(hub).toBeDefined();
    expect(hub.missingDocumentGuides.length).toBeGreaterThanOrEqual(5);
    expect(hub.conflictGuides.length).toBeGreaterThanOrEqual(4);
    expect(hub.authorities.length).toBeGreaterThanOrEqual(5);

    // Verifies key missing document guides exist
    const incomeGuide = hub.missingDocumentGuides.find((d) => d.slug === "income-certificate");
    expect(incomeGuide).toBeDefined();
    expect(incomeGuide?.authorityName).toContain("Revenue");

    // Verifies key conflict resolution guides exist
    const nameGuide = hub.conflictGuides.find((c) => c.slug === "name-mismatch");
    expect(nameGuide).toBeDefined();
    expect(nameGuide?.severity).toBe("BLOCKING");
  });

  describe("Income Certificate Canonical Slug & Aliases Regression Tests", () => {
    it("resolves canonical 'income-certificate' slug to complete 8-section guidance topic", async () => {
      const topic = await getGuidanceTopicBySlug("income-certificate", null, "Bengaluru");

      expect(topic).not.toBeNull();
      expect(topic?.slug).toBe("income-certificate");
      expect(topic?.title).toContain("Income Certificate");
      expect(topic?.category).toBe("MISSING_DOCUMENT");
      expect(topic?.severity).toBe("WARNING");

      // Section 1: Issue/Requirement summary
      expect(topic?.explanation).toContain("annual income");

      // Section 2: Why it matters
      expect(topic?.whyItMatters).toBeTruthy();

      // Section 3: What you should do
      expect(topic?.whatYouShouldDo.length).toBeGreaterThanOrEqual(4);
      expect(topic?.whatYouShouldDo.join(" ")).not.toContain("Make Consistent");
      expect(topic?.whatYouShouldDo.join(" ")).not.toContain("Edit to Match");

      // Section 4: Official Authority
      expect(topic?.authority.id).toBe("REVENUE_DEPARTMENT");
      expect(topic?.authority.name).toContain("Revenue");
      expect(topic?.officialWebsite).toContain("nadakacheri");

      // Section 5: Step-by-step guidance
      expect(topic?.stepByStep.length).toBeGreaterThanOrEqual(3);

      // Section 6: Required supporting documents
      expect(topic?.requiredDocuments).toContain("Government Identity Proof (Aadhaar / Voter ID)");

      // Section 7: Correction / Issuance Centre Lookup
      expect(topic?.centreLookup).toBeDefined();

      // Section 8: After Correction Lifecycle
      expect(topic?.afterCorrectionLifecycle.steps).toContain("READY TO APPLY");
    });

    it("resolves 'Income Certificate' display name to the canonical topic", async () => {
      const topic = await getGuidanceTopicBySlug("Income Certificate", null, "Bengaluru");
      expect(topic).not.toBeNull();
      expect(topic?.slug).toBe("income-certificate");
      expect(topic?.title).toContain("Income Certificate");
      expect(topic?.authority.id).toBe("REVENUE_DEPARTMENT");
    });

    it("resolves 'INCOME_CERTIFICATE' enum key to the canonical topic", async () => {
      const topic = await getGuidanceTopicBySlug("INCOME_CERTIFICATE", null, "Bengaluru");
      expect(topic).not.toBeNull();
      expect(topic?.slug).toBe("income-certificate");
      expect(topic?.title).toContain("Income Certificate");
    });

    it("resolves 'income_certificate' snake_case key to the canonical topic", async () => {
      const topic = await getGuidanceTopicBySlug("income_certificate", null, "Bengaluru");
      expect(topic).not.toBeNull();
      expect(topic?.slug).toBe("income-certificate");
      expect(topic?.title).toContain("Income Certificate");
    });

    it("resolves 'income-certificate-guidance' alias to the canonical topic", async () => {
      const topic = await getGuidanceTopicBySlug("income-certificate-guidance", null, "Bengaluru");
      expect(topic).not.toBeNull();
      expect(topic?.slug).toBe("income-certificate");
      expect(topic?.title).toContain("Income Certificate");
    });

    it("resolves 'income-certificate-required' alias to the canonical topic", async () => {
      const topic = await getGuidanceTopicBySlug("income-certificate-required", null, "Bengaluru");
      expect(topic).not.toBeNull();
      expect(topic?.slug).toBe("income-certificate");
      expect(topic?.title).toContain("Income Certificate");
    });

    it("generates canonical /guidance/income-certificate actionHref in Application Journey blocker", async () => {
      const demoUser = await getDemoUser();
      const journey = await getApplicationJourney(demoUser.id, "kcet");

      expect(journey).not.toBeNull();
      const incomeBlocker = journey?.blockers.find((b) =>
        b.documentType === "INCOME_CERTIFICATE" || b.title.includes("Income Certificate")
      );

      // If Income Certificate is missing, verify its actionHref routes to /guidance/income-certificate
      if (incomeBlocker) {
        expect(incomeBlocker.actionHref).toBe("/guidance/income-certificate");
      }
    });

    it("normalizes canonical slug via getCanonicalDocumentSlug", () => {
      expect(getCanonicalDocumentSlug("INCOME_CERTIFICATE")).toBe("income-certificate");
      expect(getCanonicalDocumentSlug("Income Certificate")).toBe("income-certificate");
      expect(getCanonicalDocumentSlug("income_certificate")).toBe("income-certificate");
      expect(getCanonicalDocumentSlug("income-certificate-guidance")).toBe("income-certificate");
    });

    it("normalizes canonical slug via resolveCanonicalGuidanceSlug", () => {
      expect(resolveCanonicalGuidanceSlug("INCOME_CERTIFICATE").canonicalSlug).toBe("income-certificate");
      expect(resolveCanonicalGuidanceSlug("Income Certificate").canonicalSlug).toBe("income-certificate");
      expect(resolveCanonicalGuidanceSlug("income_certificate").canonicalSlug).toBe("income-certificate");
      expect(resolveCanonicalGuidanceSlug("name").canonicalSlug).toBe("name-mismatch");
      expect(resolveCanonicalGuidanceSlug("dob").canonicalSlug).toBe("dob-mismatch");
      expect(resolveCanonicalGuidanceSlug("uidai").canonicalSlug).toBe("uidai");
    });
  });

  describe("Other Guidance Topics & 404 Behavior", () => {
    it("resolves Name Mismatch topic with complete 8-section structure and statutory authority", async () => {
      const demoUser = await getDemoUser();
      const topic = await getGuidanceTopicBySlug("name-mismatch", demoUser.id, "Bengaluru");

      expect(topic).not.toBeNull();
      expect(topic?.title).toContain("Name Discrepancy");
      expect(topic?.severity).toBe("BLOCKING");
      expect(topic?.authority.id).toBe("UIDAI");
      expect(topic?.correctionMethod).toBe("HYBRID");
      expect(topic?.authority.name).toContain("Unique Identification Authority of India");
      expect(topic?.officialWebsite).toContain("uidai.gov.in");
    });

    it("resolves Statutory Authority topic for Passport Seva", async () => {
      const topic = await getGuidanceTopicBySlug("passport-seva", null, "Delhi");

      expect(topic).not.toBeNull();
      expect(topic?.category).toBe("AUTHORITY_PROCESS");
      expect(topic?.authority.id).toBe("PASSPORT_SEVA");
      expect(topic?.officialWebsite).toContain("passportindia.gov.in");
      expect(topic?.centreLookup.verifiedCentres[0].city).toBe("Delhi");
    });

    it("resolves Service Document Requirements topic for KCET", async () => {
      const topic = await getGuidanceTopicBySlug("kcet", null, "Bengaluru");

      expect(topic).not.toBeNull();
      expect(topic?.category).toBe("SERVICE_REQUIREMENTS");
      expect(topic?.title).toContain("KCET");
      expect(topic?.requiredDocuments.length).toBeGreaterThanOrEqual(3);
    });

    it("returns null for completely unknown / invalid guidance slugs to trigger 404 notFound()", async () => {
      const topic = await getGuidanceTopicBySlug("completely-invalid-slug-xyz-99999");
      expect(topic).toBeNull();
    });

    it("provides safe fallback when looking up centres for an unverified town", async () => {
      const topic = await getGuidanceTopicBySlug("name-mismatch", null, "NonExistentTown123");

      expect(topic).not.toBeNull();
      expect(topic?.centreLookup.isVerifiedAvailable).toBe(false);
      expect(topic?.centreLookup.verifiedCentres.length).toBe(0);
      expect(topic?.centreLookup.officialLocatorUrl).toContain("uidai.gov.in");
    });
  });
});

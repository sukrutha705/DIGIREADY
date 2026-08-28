import { describe, it, expect } from "vitest";
import {
  resolveCentres,
  normalizeCityName,
  getOfficialAuthorityLocator,
} from "@/server/centres/resolver";
import { getCorrectionCentres, getAllSupportedCities } from "@/server/centres/service";

describe("Phase 9.3: Location-Aware Centre Resolution & Normalization", () => {
  it("normalizes colloquial and historic city names accurately", () => {
    expect(normalizeCityName("bangalore")).toBe("Bengaluru");
    expect(normalizeCityName("Bengaluru")).toBe("Bengaluru");
    expect(normalizeCityName("bombay")).toBe("Mumbai");
    expect(normalizeCityName("mumbai")).toBe("Mumbai");
    expect(normalizeCityName("madras")).toBe("Chennai");
    expect(normalizeCityName("chennai")).toBe("Chennai");
    expect(normalizeCityName("calcutta")).toBe("Kolkata");
    expect(normalizeCityName("mysore")).toBe("Mysuru");
    expect(normalizeCityName("mangalore")).toBe("Mangaluru");
    expect(normalizeCityName("belgaum")).toBe("Belagavi");
    expect(normalizeCityName("hubli")).toBe("Hubballi");
    expect(normalizeCityName("gulbarga")).toBe("Kalaburagi");
    expect(normalizeCityName("new delhi")).toBe("Delhi");
  });

  it("resolves verified official Aadhaar Seva Kendras for Bengaluru", () => {
    const result = getCorrectionCentres("UIDAI", "Bengaluru");
    expect(result.isVerifiedAvailable).toBe(true);
    expect(result.verifiedCentres.length).toBeGreaterThanOrEqual(1);

    const first = result.verifiedCentres[0];
    expect(first.verificationStatus).toBe("VERIFIED_OFFICIAL");
    expect(first.city).toBe("Bengaluru");
    expect(first.authorityId).toBe("UIDAI");
    expect(first.officialSource).toContain("UIDAI");
    expect(first.address).toBeTruthy();
    expect(first.appointmentUrl).toContain("uidai.gov.in");
  });

  it("resolves verified official Passport Seva Kendras for Delhi and Mumbai", () => {
    const delhiPsk = getCorrectionCentres("PASSPORT_SEVA", "Delhi");
    expect(delhiPsk.isVerifiedAvailable).toBe(true);
    expect(delhiPsk.verifiedCentres[0].city).toBe("Delhi");
    expect(delhiPsk.verifiedCentres[0].authorityId).toBe("PASSPORT_SEVA");

    const mumbaiPsk = getCorrectionCentres("PASSPORT_SEVA", "Mumbai");
    expect(mumbaiPsk.isVerifiedAvailable).toBe(true);
    expect(mumbaiPsk.verifiedCentres[0].city).toBe("Mumbai");
  });

  it("provides safe fallback with official locator when city has no verified centre dataset", () => {
    const result = getCorrectionCentres("UIDAI", "UnverifiedSmallTown");
    expect(result.isVerifiedAvailable).toBe(false);
    expect(result.verifiedCentres.length).toBe(0);
    expect(result.safeFallbackMessage).toContain("could not be verified");
    expect(result.officialLocatorUrl).toContain("uidai.gov.in");
    expect(result.officialPortalName).toBeTruthy();
  });

  it("returns verified statutory locators for all major authorities", () => {
    expect(getOfficialAuthorityLocator("UIDAI").url).toContain("uidai.gov.in");
    expect(getOfficialAuthorityLocator("PASSPORT_SEVA").url).toContain("passportindia.gov.in");
    expect(getOfficialAuthorityLocator("REVENUE_DEPARTMENT").url).toContain("nadakacheri.karnataka.gov.in");
    expect(getOfficialAuthorityLocator("TRANSPORT_DEPARTMENT").url).toContain("parivahan.gov.in");
    expect(getOfficialAuthorityLocator("INCOME_TAX_DEPARTMENT").url).toContain("tin-nsdl.com");
  });

  it("lists all supported cities in the verified database", () => {
    const cities = getAllSupportedCities();
    expect(cities).toContain("Bengaluru");
    expect(cities).toContain("Mysuru");
    expect(cities).toContain("Mangaluru");
    expect(cities).toContain("Delhi");
    expect(cities).toContain("Mumbai");
    expect(cities).toContain("Hyderabad");
    expect(cities).toContain("Chennai");
    expect(cities).toContain("Pune");
    expect(cities).toContain("Kolkata");
  });
});

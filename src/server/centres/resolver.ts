/**
 * DigiReady - Official Location-Aware Centre Resolver
 * Phase 9.3: City normalization and verified centre resolution with safe fallback.
 */

import { CorrectionCentre, CorrectionCentreResult } from "./types";
import { VERIFIED_CORRECTION_CENTRES } from "./registry";
import { GOVERNMENT_AUTHORITIES } from "@/server/authorities";

/**
 * Normalizes colloquial or historic Indian city names to canonical forms.
 */
export function normalizeCityName(input: string): string {
  if (!input) return "";
  const cleaned = input.trim().toLowerCase();

  const cityAliases: Record<string, string> = {
    bangalore: "Bengaluru",
    bengaluru: "Bengaluru",
    blr: "Bengaluru",
    mysore: "Mysuru",
    mysuru: "Mysuru",
    mangalore: "Mangaluru",
    mangaluru: "Mangaluru",
    belgaum: "Belagavi",
    belagavi: "Belagavi",
    hubli: "Hubballi",
    hubballi: "Hubballi",
    "hubli-dharwad": "Hubballi",
    gulbarga: "Kalaburagi",
    kalaburagi: "Kalaburagi",
    delhi: "Delhi",
    "new delhi": "Delhi",
    ncr: "Delhi",
    bombay: "Mumbai",
    mumbai: "Mumbai",
    hyderabad: "Hyderabad",
    secunderabad: "Hyderabad",
    madras: "Chennai",
    chennai: "Chennai",
    pune: "Pune",
    poona: "Pune",
    calcutta: "Kolkata",
    kolkata: "Kolkata",
  };

  return cityAliases[cleaned] || input.trim();
}

/**
 * Returns the verified statutory locator portal URL and name for a given authority.
 */
export function getOfficialAuthorityLocator(authorityId: string): {
  url: string;
  portalName: string;
} {
  const normAuth = (authorityId || "").toUpperCase();

  switch (normAuth) {
    case "UIDAI":
    case "AADHAAR":
      return {
        url: "https://appointments.uidai.gov.in/easearch.aspx",
        portalName: "myAadhaar Official Center Locator",
      };
    case "PASSPORT_SEVA":
    case "PASSPORT":
      return {
        url: "https://www.passportindia.gov.in/AppOnlineProject/online/locatePSK",
        portalName: "Passport Seva Official Kendra Locator",
      };
    case "REVENUE_DEPARTMENT":
    case "NADAKACHERI":
    case "TAHSILDAR":
      return {
        url: "https://nadakacheri.karnataka.gov.in",
        portalName: "Nadakacheri / Seva Sindhu Citizen Services",
      };
    case "TRANSPORT_DEPARTMENT":
    case "RTO":
    case "PARIVAHAN":
      return {
        url: "https://parivahan.gov.in/parivahan/",
        portalName: "Parivahan Sarathi Official RTO Directory",
      };
    case "INCOME_TAX_DEPARTMENT":
    case "PAN":
    case "NSDL":
      return {
        url: "https://www.tin-nsdl.com/tin-facilities.html",
        portalName: "Protean TIN-Facilitation Center Locator",
      };
    case "ELECTION_COMMISSION":
    case "VOTER_ID":
      return {
        url: "https://voters.eci.gov.in",
        portalName: "ECI Voters' Service Portal",
      };
    case "STATE_EDUCATION_BOARD":
    case "EDUCATION_BOARD":
      return {
        url: "https://kseab.karnataka.gov.in",
        portalName: "Karnataka School Examination & Assessment Board (KSEAB)",
      };
    default:
      return {
        url: "https://india.gov.in",
        portalName: "National Portal of India",
      };
  }
}

/**
 * Resolves verified official government correction centres for an authority in a specified city.
 */
export function resolveCentres(authorityId: string, city: string): CorrectionCentreResult {
  const normalizedCity = normalizeCityName(city);
  const authKey = (authorityId || "UIDAI").toUpperCase();
  const locator = getOfficialAuthorityLocator(authKey);

  const authRecord = GOVERNMENT_AUTHORITIES[authKey] || {
    name: authKey,
  };

  const matchedCentres = VERIFIED_CORRECTION_CENTRES.filter((centre) => {
    const cityMatches =
      centre.city.toLowerCase() === normalizedCity.toLowerCase() ||
      normalizeCityName(centre.city).toLowerCase() === normalizedCity.toLowerCase();
    const authMatches =
      centre.authorityId.toUpperCase() === authKey ||
      (authKey === "AADHAAR" && centre.authorityId === "UIDAI") ||
      (authKey === "PAN" && centre.authorityId === "INCOME_TAX_DEPARTMENT") ||
      (authKey === "RTO" && centre.authorityId === "TRANSPORT_DEPARTMENT");

    return cityMatches && authMatches;
  });

  const isVerifiedAvailable = matchedCentres.length > 0;

  return {
    queryCity: city,
    normalizedCity,
    authorityId: authKey,
    authorityName: authRecord.name,
    verifiedCentres: matchedCentres,
    isVerifiedAvailable,
    officialLocatorUrl: locator.url,
    officialPortalName: locator.portalName,
    safeFallbackMessage: isVerifiedAvailable
      ? ""
      : `Official centre information could not be verified for ${normalizedCity || "your city"}. For safety, DigiReady won't guess or recommend an unverified centre.`,
    privacyNote: "We only need your city to help find relevant correction centres. DigiReady does not need your GPS location or exact address.",
  };
}

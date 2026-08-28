/**
 * DigiReady - Official Correction Centres Service
 * Phase 9.3: Public service interface for centre lookups and city recommendations.
 */

import { CorrectionCentreResult } from "./types";
import { resolveCentres, normalizeCityName } from "./resolver";
import { VERIFIED_CORRECTION_CENTRES } from "./registry";

export function getCorrectionCentres(authorityId: string, city: string): CorrectionCentreResult {
  return resolveCentres(authorityId, city);
}

export function getNearestCorrectionCentres(authorityId: string, city: string): CorrectionCentreResult {
  return resolveCentres(authorityId, city);
}

export function getAllSupportedCities(): string[] {
  const cities = new Set<string>();
  VERIFIED_CORRECTION_CENTRES.forEach((centre) => {
    cities.add(centre.city);
  });
  return Array.from(cities).sort();
}

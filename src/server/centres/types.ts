/**
 * DigiReady - Official Location-Aware Government Correction Centre Types
 * Phase 9.3: Deterministic contracts for official government correction centres and city lookup.
 */

export type CentreVerificationStatus = "VERIFIED_OFFICIAL" | "UNVERIFIED";

export interface CorrectionCentre {
  id: string;
  centreName: string;
  authorityId: string;
  authorityName: string;
  city: string;
  state: string;
  address: string;
  pincode?: string;
  serviceTypesSupported: string[];
  verificationStatus: CentreVerificationStatus;
  officialSource: string;
  sourceTitle: string;
  sourceUrl: string;
  officialContact?: string;
  officialWebsite?: string;
  appointmentUrl?: string;
  workingHours?: string;
  lastVerifiedAt: string;
}

export interface CityLocation {
  cityName: string;
  stateName: string;
  aliases: string[];
}

export interface LocationQuery {
  city: string;
  state?: string;
}

export interface CorrectionCentreResult {
  queryCity: string;
  normalizedCity: string;
  authorityId: string;
  authorityName: string;
  verifiedCentres: CorrectionCentre[];
  isVerifiedAvailable: boolean;
  officialLocatorUrl: string;
  officialPortalName: string;
  safeFallbackMessage: string;
  privacyNote: string;
}

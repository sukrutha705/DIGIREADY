/**
 * DigiReady - Document Sharing & Consent Policy
 * Phase 7.5: Centralized Security, Expiry, and Permission Policies
 */

import { SharePermissions } from "./types";

export const SHARING_POLICY = {
  /**
   * Default prototype permission grants.
   * Downloads and raw binary exports are strictly disabled.
   */
  defaultPermissions: {
    canView: true,
    canDownload: false,
  } as SharePermissions,

  /**
   * Default expiration duration in hours (7 days = 168 hours).
   */
  defaultExpiryHours: 168,

  /**
   * Minimum and maximum allowable share lifetimes.
   */
  minExpiryHours: 1,
  maxExpiryHours: 720, // 30 days

  /**
   * Prototype share token prefix.
   */
  tokenPrefix: "dr_share_",

  /**
   * Token byte length for cryptographic randomness.
   */
  tokenRandomBytes: 20,

  /**
   * Standard citizen consent notice presented before share creation.
   */
  consentNotice:
    "You are about to create a controlled sharing permission for the selected document attributes. The recipient will only receive the fields you explicitly choose.",

  /**
   * Standard limitation notice attached to all share grants and token views.
   */
  limitationNote:
    "This share record is a controlled prototype permission grant for metadata review. It does not provide raw file downloads or government-certified transmission.",
};

/**
 * Calculates a valid expiration date given an optional lifetime in hours.
 */
export function calculateExpiryDate(hours?: number): Date {
  const effectiveHours =
    typeof hours === "number" && hours >= SHARING_POLICY.minExpiryHours && hours <= SHARING_POLICY.maxExpiryHours
      ? hours
      : SHARING_POLICY.defaultExpiryHours;

  return new Date(Date.now() + effectiveHours * 60 * 60 * 1000);
}

/**
 * Determines whether a given expiration date is in the past.
 */
export function isShareExpired(expiresAt: Date | string): boolean {
  const expiryTime = typeof expiresAt === "string" ? new Date(expiresAt).getTime() : expiresAt.getTime();
  return expiryTime <= Date.now();
}

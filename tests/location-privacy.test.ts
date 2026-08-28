import { describe, it, expect } from "vitest";
import { getCorrectionCentres } from "@/server/centres/service";

describe("Phase 9.3: Location Privacy & Minimization Standards", () => {
  it("enforces city-only location input without requiring exact GPS coordinates", () => {
    const result = getCorrectionCentres("UIDAI", "Bengaluru");

    expect(result.privacyNote).toContain("DigiReady does not need your GPS location or exact address");
    expect(result.normalizedCity).toBe("Bengaluru");
    // Ensure no GPS / lat / lng coordinates are demanded or computed
    expect((result as any).latitude).toBeUndefined();
    expect((result as any).longitude).toBeUndefined();
    expect((result as any).gpsCoords).toBeUndefined();
  });

  it("handles city queries with whitespace or casing gracefully without requiring street addresses", () => {
    const result = getCorrectionCentres("UIDAI", "  bengaluru  ");
    expect(result.normalizedCity).toBe("Bengaluru");
    expect(result.isVerifiedAvailable).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import manifest from "@/app/manifest";

describe("Phase 10: Progressive Web App (PWA) Manifest", () => {
  it("generates a valid PWA manifest compliant with W3C web app manifest specification", () => {
    const data = manifest();

    expect(data.name).toBe("DigiReady — Indian Citizen Application Readiness Platform");
    expect(data.short_name).toBe("DigiReady");
    expect(data.description).toContain("Know what you need");
    expect(data.start_url).toBe("/dashboard");
    expect(data.display).toBe("standalone");
    expect(data.theme_color).toBe("#2563eb");
    expect(data.background_color).toBe("#0f172a");
    expect(data.icons?.length).toBeGreaterThanOrEqual(1);
    expect(data.icons?.[0].src).toBe("/favicon.ico");
  });
});

import { describe, it, expect } from "vitest";
import { evaluateApplicationWindow } from "@/server/application-window/engine";
import { ApplicationWindowStatuses } from "@/server/application-window/types";

describe("Phase 9.2: Application Window & Deadline Intelligence", () => {
  it("evaluates continuous citizen services as year-round open", () => {
    const passportWindow = evaluateApplicationWindow("passport");
    expect(passportWindow.status).toBe(ApplicationWindowStatuses.OPEN);
    expect(passportWindow.statusLabel).toContain("Applications Open");
    expect(passportWindow.sourceUrl).toContain("passportindia.gov.in");

    const panWindow = evaluateApplicationWindow("pan-card");
    expect(panWindow.status).toBe(ApplicationWindowStatuses.OPEN);

    const epfoWindow = evaluateApplicationWindow("epfo");
    expect(epfoWindow.status).toBe(ApplicationWindowStatuses.OPEN);
  });

  it("evaluates periodic examination window accurately based on date", () => {
    // Current date during KCET window
    const duringWindow = new Date("2026-03-15");
    const kcetActive = evaluateApplicationWindow("kcet", duringWindow);
    expect(kcetActive.status).toBe(ApplicationWindowStatuses.OPEN);
    expect(kcetActive.daysRemaining).toBeGreaterThan(0);

    // After window closed
    const afterWindow = new Date("2026-11-15");
    const kcetClosed = evaluateApplicationWindow("kcet", afterWindow);
    expect(kcetClosed.status).toBe(ApplicationWindowStatuses.CLOSED);
    expect(kcetClosed.statusLabel).toContain("Closed");

    // Before window opens
    const beforeWindow = new Date("2025-12-01");
    const kcetUpcoming = evaluateApplicationWindow("kcet", beforeWindow);
    expect(kcetUpcoming.status).toBe(ApplicationWindowStatuses.UPCOMING);
  });

  it("handles unregistered / pending schedule services deterministically with UNKNOWN status", () => {
    const unknownWindow = evaluateApplicationWindow("unregistered-random-service");
    expect(unknownWindow.status).toBe(ApplicationWindowStatuses.UNKNOWN);
    expect(unknownWindow.statusLabel).toContain("Schedule Pending");
    expect(unknownWindow.disclaimer).toBeDefined();
  });
});

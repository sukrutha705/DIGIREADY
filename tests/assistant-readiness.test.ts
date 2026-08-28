import { describe, it, expect } from "vitest";
import { classifyIntent } from "@/server/assistant/classifier";
import { POST } from "@/app/api/assistant/classify/route";
import { NextRequest } from "next/server";

describe("Phase 9.2: Assistant Readiness & Natural Language Subsystem", () => {
  it("classifies eligibility question for NEET UG", async () => {
    const result = classifyIntent("Am I eligible for NEET UG?");
    expect(result.intent).toBe("APPLY_FOR_SERVICE");
    expect(result.service).toBe("NEET UG");
  });

  it("classifies application deadline inquiry for KCET", async () => {
    const result = classifyIntent("When does registration close for KCET?");
    expect(result.intent).toBe("APPLY_FOR_SERVICE");
    expect(result.service).toBe("KCET");
  });

  it("handles assistant API requests for eligibility and returns eligibility details", async () => {
    const req = new NextRequest("http://localhost:3000/api/assistant/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Am I eligible for KCET?" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.friendlyResponse).toContain("KCET");
    expect(data.friendlyResponse.toLowerCase()).toContain("eligible");
  });

  it("handles assistant API requests for deadlines and returns official window dates", async () => {
    const req = new NextRequest("http://localhost:3000/api/assistant/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "When is the last date to apply for KCET?" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.friendlyResponse).toContain("KCET");
    expect(data.friendlyResponse.toLowerCase()).toContain("status");
  });
});

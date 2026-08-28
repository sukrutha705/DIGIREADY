import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/assistant/classify/route";
import { NextRequest } from "next/server";

describe("Phase 9.3: Assistant Conflict & Location Centre Interaction", () => {
  it("explains identity conflicts clearly and states DigiReady cannot alter official records", async () => {
    const req = new NextRequest("http://localhost:3000/api/assistant/classify", {
      method: "POST",
      body: JSON.stringify({
        message: "My Aadhaar name is different from my marks card",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    const text = json.friendlyResponse || json.response || "";
    expect(text).toContain("DigiReady cannot");
    expect(text.toLowerCase()).toContain("authority");
  });

  it("handles city inquiries and returns verified official correction centres for Bengaluru", async () => {
    const req = new NextRequest("http://localhost:3000/api/assistant/classify", {
      method: "POST",
      body: JSON.stringify({
        message: "Find correction centres in Bengaluru",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    const text = json.friendlyResponse || json.response || "";
    expect(text).toContain("Bengaluru");
    expect(text).toContain("Officially Verified");
    expect(text).toContain("Privacy Note");
  });

  it("routes specific correction questions to the correct statutory authority", async () => {
    const req = new NextRequest("http://localhost:3000/api/assistant/classify", {
      method: "POST",
      body: JSON.stringify({
        message: "Where can I fix my income certificate?",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    const text = json.friendlyResponse || json.response || "";
    expect(text).toContain("Revenue");
    expect(text).toContain("Nadakacheri");
  });
});

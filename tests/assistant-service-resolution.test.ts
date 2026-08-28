import { describe, it, expect } from "vitest";
import { classifyIntent, extractService } from "../src/server/assistant/classifier";
import { getServiceByName, getServiceBySlug } from "../src/server/services/registry";
import { IntentTypes } from "../src/server/assistant/types";

describe("Phase 9.1 — Assistant NLP & Expanded Service Entity Resolution", () => {
  it("resolves UPSC Civil Services queries and entities", async () => {
    const extracted = extractService("i want to prepare for upsc civil services");
    expect(extracted).toBe("UPSC Civil Services");

    const classification = classifyIntent("Am I ready for UPSC Civil Services?");
    expect(classification.intent).toBe(IntentTypes.APPLY_FOR_SERVICE);
    expect(classification.service).toBe("UPSC Civil Services");

    const svc = await getServiceByName(extracted!);
    expect(svc).toBeDefined();
    expect(svc?.slug).toBe("upsc-civil-services");
  });

  it("resolves SSC CGL recruitment queries", async () => {
    const extracted = extractService("what documents do i need for ssc cgl");
    expect(extracted).toBe("SSC CGL");

    const classification = classifyIntent("What documents are required for SSC CGL?");
    expect(classification.intent).toBe(IntentTypes.APPLY_FOR_SERVICE);
    expect(classification.service).toBe("SSC CGL");
  });

  it("resolves NEET UG medical entrance queries", async () => {
    const extracted = extractService("am i ready for neet ug");
    expect(extracted).toBe("NEET UG");

    const classification = classifyIntent("Check my readiness for NEET UG");
    expect(classification.intent).toBe(IntentTypes.APPLY_FOR_SERVICE);
    expect(classification.service).toBe("NEET UG");
  });

  it("resolves JEE Advanced examination queries", async () => {
    const extracted = extractService("i need help applying for jee advanced");
    expect(extracted).toBe("JEE Advanced");

    const svc = await getServiceByName(extracted!);
    expect(svc?.slug).toBe("jee-advanced");
  });

  it("resolves PM-KISAN government scheme queries", async () => {
    const extracted = extractService("how do i apply for pm kisan");
    expect(extracted).toBe("PM Kisan Samman Nidhi");

    const classification = classifyIntent("How to apply for PM-KISAN?");
    expect(classification.intent).toBe(IntentTypes.APPLY_FOR_SERVICE);
  });

  it("resolves Ayushman Bharat PM-JAY queries", async () => {
    const extracted = extractService("what is required for ayushman bharat");
    expect(extracted).toBe("Ayushman Bharat PM-JAY");
  });

  it("resolves Sukanya Samriddhi Yojana queries", async () => {
    const extracted = extractService("how to open sukanya samriddhi account");
    expect(extracted).toBe("Sukanya Samriddhi Yojana");
  });

  it("resolves EWS Certificate queries", async () => {
    const extracted = extractService("how to get ews certificate");
    expect(extracted).toBe("EWS Certificate");
  });

  it("resolves Atal Pension Yojana queries", async () => {
    const extracted = extractService("what documents do i need for atal pension");
    expect(extracted).toBe("Atal Pension Yojana");
  });

  it("resolves Passport application queries", async () => {
    const extracted = extractService("i want to apply for passport");
    expect(extracted).toBe("Passport");

    const classification = classifyIntent("What documents do I need for passport?");
    expect(classification.intent).toBe(IntentTypes.APPLY_FOR_SERVICE);
    expect(classification.service).toBe("Passport");
  });
});

import { describe, it, expect } from "vitest";
import { env } from "../src/config/env";

describe("Phase 1: Environment Configuration", () => {
  it("should have valid environment defaults", () => {
    expect(env).toBeDefined();
    expect(["development", "test", "production"]).toContain(env.NODE_ENV);
    expect(env.DATABASE_URL).toBeDefined();
    expect(typeof env.DATABASE_URL).toBe("string");
  });
});

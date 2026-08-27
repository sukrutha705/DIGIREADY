import { describe, it, expect, vi } from "vitest";
import { GET } from "../src/app/api/health/route";
import { prisma } from "../src/lib/prisma";

describe("Phase 1: Health Endpoint (/api/health)", () => {
  it("should return ok and connected when database is accessible", async () => {
    // Mock prisma count to ensure isolated unit test behavior
    const countSpy = vi.spyOn(prisma.systemHealth, "count").mockResolvedValue(1);

    const response = await GET();
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.status).toBe("ok");
    expect(json.dbStatus).toBe("connected");
    expect(json.timestamp).toBeDefined();
    expect(json).not.toHaveProperty("NODE_ENV");
    expect(json).not.toHaveProperty("environment");

    countSpy.mockRestore();
  });

  it("should return 500 and disconnected on database failure", async () => {
    const countSpy = vi.spyOn(prisma.systemHealth, "count").mockRejectedValue(new Error("Connection error"));

    const response = await GET();
    expect(response.status).toBe(500);

    const json = await response.json();
    expect(json.status).toBe("error");
    expect(json.dbStatus).toBe("disconnected");
    expect(json.timestamp).toBeDefined();
    expect(json.error).toBe("Connection error");
    expect(json).not.toHaveProperty("NODE_ENV");

    countSpy.mockRestore();
  });
});

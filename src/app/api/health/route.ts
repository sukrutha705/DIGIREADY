import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { HealthCheckResponse } from "@/types";

export async function GET(): Promise<NextResponse<HealthCheckResponse>> {
  try {
    // Verify database connectivity
    await prisma.systemHealth.count();

    const responseData: HealthCheckResponse = {
      status: "ok",
      dbStatus: "connected",
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    const errorData: HealthCheckResponse = {
      status: "error",
      dbStatus: "disconnected",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Database connection failure",
    };

    return NextResponse.json(errorData, { status: 500 });
  }
}

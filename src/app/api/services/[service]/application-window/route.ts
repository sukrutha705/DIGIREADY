/**
 * GET /api/services/[service]/application-window
 * Retrieves application schedule, deadlines, and window status.
 */

import { NextRequest, NextResponse } from "next/server";
import { getApplicationWindowInfo } from "@/server/application-window/service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ service: string }> }
) {
  try {
    const params = await context.params;
    const serviceQuery = params.service;

    if (!serviceQuery) {
      return NextResponse.json(
        { error: "Service identifier is required." },
        { status: 400 }
      );
    }

    const windowInfo = await getApplicationWindowInfo(serviceQuery, prisma);

    return NextResponse.json(windowInfo, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to retrieve application window schedule." },
      { status: 500 }
    );
  }
}

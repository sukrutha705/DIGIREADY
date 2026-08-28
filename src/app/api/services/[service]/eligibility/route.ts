/**
 * GET /api/services/[service]/eligibility
 * Evaluates citizen eligibility against service requirements.
 */

import { NextRequest, NextResponse } from "next/server";
import { evaluateServiceEligibility } from "@/server/eligibility/service";
import { prisma } from "@/lib/prisma";

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

    const demoUser = await prisma.user.findFirst({
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });

    if (!demoUser) {
      return NextResponse.json(
        { error: "Demo user baseline not initialized." },
        { status: 404 }
      );
    }

    const eligibility = await evaluateServiceEligibility(demoUser.id, serviceQuery, prisma);

    return NextResponse.json(eligibility, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to evaluate service eligibility." },
      { status: 500 }
    );
  }
}

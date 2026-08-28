import { NextRequest, NextResponse } from "next/server";
import { getDemoUser } from "@/server/vault";
import { getServiceReadiness } from "@/server/services/readiness";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ service: string }> }
) {
  try {
    const { service } = await context.params;
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");

    let userId = userIdParam;
    if (!userId) {
      const demoUser = await getDemoUser();
      userId = demoUser.id;
    }

    const decodedServiceName = decodeURIComponent(service);
    const readiness = await getServiceReadiness(userId, decodedServiceName);

    if (!readiness) {
      return NextResponse.json(
        {
          error: `Requirements are not configured for service '${decodedServiceName}'.`,
          message: `Service "${decodedServiceName}" not found or not supported yet.`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(readiness);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to evaluate service readiness" },
      { status: 500 }
    );
  }
}


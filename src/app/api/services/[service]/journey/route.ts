import { NextRequest, NextResponse } from "next/server";
import { getDemoUser } from "@/server/vault";
import { getApplicationJourney } from "@/server/journey/service";

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

    const journey = await getApplicationJourney(userId, service);

    if (!journey) {
      return NextResponse.json(
        { error: `Service "${service}" not found or requirements not configured` },
        { status: 404 }
      );
    }

    return NextResponse.json(journey);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to compute application journey" },
      { status: 500 }
    );
  }
}

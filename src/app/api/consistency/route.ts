import { NextRequest, NextResponse } from "next/server";
import { getDemoUser } from "@/server/vault";
import { getVaultConsistencyAssessment } from "@/server/consistency";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");

    let userId = userIdParam;
    if (!userId) {
      const demoUser = await getDemoUser();
      userId = demoUser.id;
    }

    const assessment = await getVaultConsistencyAssessment(userId);
    return NextResponse.json(assessment);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to evaluate vault consistency" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getDemoUser } from "@/server/vault";
import { getConflictIssues } from "@/server/conflicts/service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");
    const cityParam = searchParams.get("city");

    let userId = userIdParam;
    if (!userId) {
      const demoUser = await getDemoUser();
      userId = demoUser.id;
    }

    const issues = await getConflictIssues(userId, cityParam);
    return NextResponse.json({ issues, totalCount: issues.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retrieve conflict issues" },
      { status: 500 }
    );
  }
}

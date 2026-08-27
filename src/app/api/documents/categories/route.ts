import { NextRequest, NextResponse } from "next/server";
import { getDemoUser, getUserVaultSummary } from "@/server/vault";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");

    let userId = userIdParam;
    if (!userId) {
      const demoUser = await getDemoUser();
      userId = demoUser.id;
    }

    const summary = await getUserVaultSummary(userId);

    return NextResponse.json({
      categories: summary.categories,
      totalCount: summary.totalDocuments,
      categoriesCount: summary.categoriesCount,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retrieve document categories" },
      { status: 500 }
    );
  }
}

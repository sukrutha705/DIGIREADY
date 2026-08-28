import { NextRequest, NextResponse } from "next/server";
import { getDemoUser } from "@/server/vault";
import { getUserShares } from "@/server/sharing/service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");
    const documentId = searchParams.get("documentId") || undefined;

    let userId = userIdParam;
    if (!userId) {
      const demoUser = await getDemoUser();
      userId = demoUser.id;
    }

    const shares = await getUserShares(userId, documentId);
    return NextResponse.json({ shares });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retrieve user document shares" },
      { status: 500 }
    );
  }
}

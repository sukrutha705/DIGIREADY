import { NextRequest, NextResponse } from "next/server";
import { getDemoUser } from "@/server/vault";
import { getSharePreview } from "@/server/sharing/service";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");
    const recipient = searchParams.get("recipient") || undefined;
    const purpose = searchParams.get("purpose") || undefined;

    let userId = userIdParam;
    if (!userId) {
      const demoUser = await getDemoUser();
      userId = demoUser.id;
    }

    const preview = await getSharePreview(userId, id, recipient, purpose);

    if (!preview) {
      return NextResponse.json(
        { error: "Document not found in vault or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json(preview);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate share preview" },
      { status: 500 }
    );
  }
}

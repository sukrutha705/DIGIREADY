import { NextRequest, NextResponse } from "next/server";
import { getDemoUser } from "@/server/vault";
import { revokeDocumentShare, ShareNotFoundError } from "@/server/sharing/service";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token?: string; id?: string }> }
) {
  try {
    const params = await context.params;
    const id = params.token || params.id;
    if (!id) {
      return NextResponse.json({ error: "Share ID is required" }, { status: 400 });
    }
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");

    let userId = userIdParam;
    if (!userId) {
      const demoUser = await getDemoUser();
      userId = demoUser.id;
    }

    const revoked = await revokeDocumentShare(userId, id);
    return NextResponse.json(revoked);
  } catch (error) {
    if (error instanceof ShareNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to revoke share grant" },
      { status: 500 }
    );
  }
}

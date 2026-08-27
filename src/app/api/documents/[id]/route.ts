import { NextRequest, NextResponse } from "next/server";
import { getDemoUser, getUserDocumentById } from "@/server/vault";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");

    let userId = userIdParam;
    if (!userId) {
      const demoUser = await getDemoUser();
      userId = demoUser.id;
    }

    const document = await getUserDocumentById(userId, id);

    if (!document) {
      return NextResponse.json(
        { error: `Document with ID '${id}' was not found in your vault.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ document });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retrieve document details" },
      { status: 500 }
    );
  }
}

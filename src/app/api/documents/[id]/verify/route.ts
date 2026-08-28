import { NextRequest, NextResponse } from "next/server";
import { getDemoUser } from "@/server/vault";
import { verifyDocument } from "@/server/verification/verifier";

export const dynamic = "force-dynamic";

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

    const verification = await verifyDocument(userId, id);

    if (verification.status === "DOCUMENT_NOT_FOUND") {
      return NextResponse.json(
        {
          error: verification.summary,
          status: verification.status,
          limitationNote: verification.limitationNote,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(verification);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to verify document metadata" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getDocumentShareByToken } from "@/server/sharing/service";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const share = await getDocumentShareByToken(token);

    if (!share) {
      return NextResponse.json(
        { error: "Share token not found, invalid, or expired" },
        { status: 404 }
      );
    }

    return NextResponse.json(share);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to resolve share token" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getDemoUser } from "@/server/vault";
import { removeUserActivePreparation } from "@/server/services/active";

export async function DELETE(
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

    const removed = await removeUserActivePreparation(userId, id);

    if (!removed) {
      return NextResponse.json(
        {
          error: "Preparation not found",
          message: `Active preparation "${id}" could not be found or removed for current user.`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Application preparation "${id}" has been removed.`,
    });
  } catch (error) {
    console.error("Failed to remove active preparation:", error);
    return NextResponse.json(
      {
        error: "Failed to remove active preparation",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

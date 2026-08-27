import { NextResponse } from "next/server";
import { getDemoUser, getUserVaultSummary } from "@/server/vault";

export async function GET() {
  try {
    const demoUser = await getDemoUser();
    const summary = await getUserVaultSummary(demoUser.id);

    return NextResponse.json({
      user: {
        id: demoUser.id,
        displayName: demoUser.displayName,
        createdAt: demoUser.createdAt.toISOString(),
      },
      summary,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load demo user session" },
      { status: 500 }
    );
  }
}

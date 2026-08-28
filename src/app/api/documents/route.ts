import { NextRequest, NextResponse } from "next/server";
import { getDemoUser, getUserDocuments } from "@/server/vault";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");
    const category = searchParams.get("category") || undefined;
    const source = searchParams.get("source") || undefined;
    const search = searchParams.get("search") || undefined;

    let userId = userIdParam;
    if (!userId) {
      const demoUser = await getDemoUser();
      userId = demoUser.id;
    }

    const documents = await getUserDocuments(userId, {
      category,
      source,
      search,
    });

    return NextResponse.json({
      documents,
      count: documents.length,
      filters: {
        category: category ?? "ALL",
        source: source ?? "ALL",
        search: search ?? "",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retrieve documents" },
      { status: 500 }
    );
  }
}

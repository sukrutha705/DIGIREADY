import { NextRequest, NextResponse } from "next/server";
import { searchServices } from "@/server/services/registry";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || searchParams.get("query") || "";
    const category = searchParams.get("category") || undefined;
    const status = searchParams.get("status") || undefined;
    const jurisdiction = searchParams.get("jurisdiction") || undefined;
    const authority = searchParams.get("authority") || undefined;

    const services = await searchServices(query, { category, status, jurisdiction, authority });

    return NextResponse.json({
      services,
      total: services.length,
      query: query || null,
      category: category || "ALL",
      jurisdiction: jurisdiction || "ALL",
      status: status || "ALL",
    });
  } catch (error) {
    console.error("Failed to list services:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve public service registry",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCorrectionCentres } from "@/server/centres/service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authority = searchParams.get("authority") || "UIDAI";
    const city = searchParams.get("city") || "";

    const result = getCorrectionCentres(authority, city);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to resolve correction centres" },
      { status: 500 }
    );
  }
}

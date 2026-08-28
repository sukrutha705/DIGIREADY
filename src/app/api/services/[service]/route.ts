import { NextRequest, NextResponse } from "next/server";
import { getServiceBySlug, getServiceRequirement } from "@/server/services/registry";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ service: string }> }
) {
  try {
    const { service } = await context.params;
    const decoded = decodeURIComponent(service);

    let serviceReq = await getServiceBySlug(decoded);
    if (!serviceReq) {
      serviceReq = getServiceRequirement(decoded);
    }

    if (!serviceReq) {
      return NextResponse.json(
        {
          error: "Service not found",
          message: `Service "${decoded}" is not registered in DigiReady.`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      service: serviceReq,
    });
  } catch (error) {
    console.error("Failed to retrieve service specification:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve service specification",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

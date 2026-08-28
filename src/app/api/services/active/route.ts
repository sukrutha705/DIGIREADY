import { NextRequest, NextResponse } from "next/server";
import { getDemoUser } from "@/server/vault";
import {
  getUserActivePreparations,
  addUserActivePreparation,
} from "@/server/services/active";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");

    let userId = userIdParam;
    if (!userId) {
      const demoUser = await getDemoUser();
      userId = demoUser.id;
    }

    const preparations = await getUserActivePreparations(userId);

    return NextResponse.json({
      preparations,
      total: preparations.length,
    });
  } catch (error) {
    console.error("Failed to list active preparations:", error);
    return NextResponse.json(
      {
        error: "Failed to list active preparations",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const serviceIdentifier = body?.service || body?.slug || body?.serviceId;
    let userId = body?.userId;

    if (!userId) {
      const demoUser = await getDemoUser();
      userId = demoUser.id;
    }

    if (!serviceIdentifier || typeof serviceIdentifier !== "string") {
      return NextResponse.json(
        { error: "Missing required 'service' or 'slug' parameter in request body" },
        { status: 400 }
      );
    }

    const preparation = await addUserActivePreparation(userId, serviceIdentifier);

    if (!preparation) {
      return NextResponse.json(
        {
          error: "Service not found",
          message: `Could not find service "${serviceIdentifier}" to activate.`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: `Successfully added ${preparation.serviceName} to active preparations.`,
        preparation,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to add active preparation:", error);
    return NextResponse.json(
      {
        error: "Failed to add active preparation",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

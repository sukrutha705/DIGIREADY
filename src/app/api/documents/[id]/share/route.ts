import { NextRequest, NextResponse } from "next/server";
import { getDemoUser } from "@/server/vault";
import {
  createDocumentShare,
  ConsentRequiredError,
  ShareValidationError,
  ShareNotFoundError,
} from "@/server/sharing/service";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");

    let userId = userIdParam;
    if (!userId) {
      const demoUser = await getDemoUser();
      userId = demoUser.id;
    }

    if (body.consent !== true) {
      return NextResponse.json(
        { error: "Affirmative citizen consent is required to create a document share grant." },
        { status: 400 }
      );
    }

    const shareRecord = await createDocumentShare(userId, {
      documentId: id,
      recipientName: body.recipientName,
      purpose: body.purpose,
      expiresInHours: body.expiresInHours,
      includedFieldIds: body.includedFieldIds || [],
      consent: body.consent,
    });

    return NextResponse.json(shareRecord, { status: 201 });
  } catch (error) {
    if (error instanceof ConsentRequiredError || error instanceof ShareValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof ShareNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create document share grant" },
      { status: 500 }
    );
  }
}

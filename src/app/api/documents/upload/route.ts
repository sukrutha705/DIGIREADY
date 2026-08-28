import { NextRequest, NextResponse } from "next/server";
import { getDemoUser } from "@/server/vault";
import { processDocumentUpload } from "@/server/documents/extraction/service";
import { UserNotFoundError } from "@/server/readiness";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const documentTypeOverride = (formData.get("documentTypeOverride") as string) || undefined;
    const duplicateResolution = (formData.get("duplicateResolution") as any) || undefined;
    const existingDocumentIdToReplace = (formData.get("existingDocumentIdToReplace") as string) || undefined;

    let userId = (formData.get("userId") as string) || undefined;
    if (!userId) {
      const demoUser = await getDemoUser();
      userId = demoUser.id;
    }

    if (!file) {
      return NextResponse.json(
        { error: "No file provided. Please upload an image file (JPEG, PNG, or WEBP)." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await processDocumentUpload(
      buffer,
      file.name,
      file.type,
      userId,
      {
        documentTypeOverride,
        duplicateResolution,
        existingDocumentIdToReplace,
      }
    );

    if (!result.success) {
      if (result.duplicateDetected) {
        return NextResponse.json(result, { status: 200 });
      }
      return NextResponse.json({ error: result.error || "Upload failed." }, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Document upload API error:", error);
    return NextResponse.json(
      {
        error: "Failed to process document upload",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

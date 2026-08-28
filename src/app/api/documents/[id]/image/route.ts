import { NextRequest, NextResponse } from "next/server";
import { getDemoUser } from "@/server/vault";
import { getDocumentImageStream } from "@/server/documents/extraction/service";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params;
    if (!documentId) {
      return NextResponse.json({ error: "Document ID is required." }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    let userId = searchParams.get("userId");
    if (!userId) {
      const demoUser = await getDemoUser();
      userId = demoUser.id;
    }

    const imageStream = await getDocumentImageStream(userId, documentId);
    if (!imageStream) {
      return NextResponse.json(
        { error: "Image not found or unauthorized access." },
        { status: 404 }
      );
    }

    const response = new NextResponse(imageStream.buffer as any, {
      status: 200,
      headers: {
        "Content-Type": imageStream.mimeType,
        "Content-Length": imageStream.buffer.length.toString(),
        "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `inline; filename="${imageStream.fileName}"`,
      },
    });

    return response;
  } catch (error) {
    console.error("Image streaming error:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve document image",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getDemoUser, getUserDocumentById } from "@/server/vault";
import { updateDocumentMetadata } from "@/server/documents/extraction/service";
import { getVaultConsistencyAssessment } from "@/server/consistency/service";
import { getApplicationJourney } from "@/server/journey/service";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params;
    if (!documentId) {
      return NextResponse.json({ error: "Document ID is required." }, { status: 400 });
    }

    const body = await request.json();
    const corrections = body?.corrections;

    if (!corrections || !Array.isArray(corrections) || corrections.length === 0) {
      return NextResponse.json(
        { error: "No corrections provided. Expected array of field corrections." },
        { status: 400 }
      );
    }

    let userId = body?.userId;
    if (!userId) {
      const demoUser = await getDemoUser();
      userId = demoUser.id;
    }

    const result = await updateDocumentMetadata(userId, documentId, corrections);
    const updatedDoc = await getUserDocumentById(userId, documentId);
    const consistency = await getVaultConsistencyAssessment(userId);
    const journey = await getApplicationJourney(userId, "KCET");

    return NextResponse.json({
      success: true,
      result,
      document: updatedDoc,
      consistency,
      journey,
    });
  } catch (error) {
    console.error("Metadata correction error:", error);
    return NextResponse.json(
      {
        error: "Failed to update document metadata",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

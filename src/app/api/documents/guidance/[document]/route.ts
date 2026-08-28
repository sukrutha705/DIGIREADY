import { NextRequest, NextResponse } from "next/server";
import { getDocumentGuidance } from "@/server/guidance/registry";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ document: string }> }
) {
  try {
    const { document } = await context.params;
    const decodedDoc = decodeURIComponent(document);

    const guidance = getDocumentGuidance(decodedDoc);

    if (!guidance) {
      return NextResponse.json(
        {
          error: `Guidance is not configured for document type '${decodedDoc}'.`,
          supportedDocuments: [
            "Income Certificate",
            "Caste / Category Certificate",
            "Government Identity Proof",
            "10th / Secondary Marks Card",
            "12th / Higher Secondary Marks Card",
            "Study Certificate",
            "Address Proof",
            "Passport",
          ],
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      documentType: guidance.documentType,
      guidance,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retrieve document guidance" },
      { status: 500 }
    );
  }
}

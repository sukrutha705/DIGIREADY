import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDemoUser } from "@/server/vault";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const demoUser = await getDemoUser(prisma);
    if (!demoUser) {
      return NextResponse.json(
        { error: "Demo user not initialized" },
        { status: 500 }
      );
    }

    // Reset demo citizen's sharing grants and dynamically uploaded documents
    const deleteResult = await prisma.documentShare.deleteMany({
      where: {
        userId: demoUser.id,
      },
    });

    await prisma.documentField.deleteMany({
      where: { document: { userId: demoUser.id, imageStorageKey: { not: null } } },
    });
    await prisma.identityEvidence.deleteMany({
      where: { document: { userId: demoUser.id, imageStorageKey: { not: null } } },
    });
    await prisma.document.deleteMany({
      where: {
        userId: demoUser.id,
        imageStorageKey: { not: null },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Demo state successfully reset to initial baseline.",
      sharesCleared: deleteResult.count,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to reset demo state safely." },
      { status: 500 }
    );
  }
}

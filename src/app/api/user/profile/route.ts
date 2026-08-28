/**
 * GET /api/user/profile
 * POST /api/user/profile
 * Manages citizen eligibility profile attributes with explicit source labeling.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserEligibilityProfile } from "@/server/eligibility/service";

export async function GET() {
  try {
    const demoUser = await prisma.user.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!demoUser) {
      return NextResponse.json(
        { error: "Demo user not found." },
        { status: 404 }
      );
    }

    const profile = await getUserEligibilityProfile(demoUser.id, prisma);

    return NextResponse.json({
      user: {
        id: demoUser.id,
        displayName: demoUser.displayName,
        dateOfBirth: demoUser.dateOfBirth,
        gender: demoUser.gender,
        nationality: demoUser.nationality,
        state: demoUser.state,
        domicileState: demoUser.domicileState,
        category: demoUser.category,
        educationQualification: demoUser.educationQualification,
        annualFamilyIncome: demoUser.annualFamilyIncome,
        disabilityStatus: demoUser.disabilityStatus,
      },
      profile,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to retrieve citizen profile." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const demoUser = await prisma.user.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!demoUser) {
      return NextResponse.json(
        { error: "Demo user not found." },
        { status: 404 }
      );
    }

    const updateData: Record<string, any> = {};

    if (body.dateOfBirth) {
      updateData.dateOfBirth = new Date(body.dateOfBirth);
    }
    if (body.gender !== undefined) {
      updateData.gender = body.gender;
    }
    if (body.nationality !== undefined) {
      updateData.nationality = body.nationality;
    }
    if (body.state !== undefined) {
      updateData.state = body.state;
    }
    if (body.domicileState !== undefined) {
      updateData.domicileState = body.domicileState;
    }
    if (body.category !== undefined) {
      updateData.category = body.category;
    }
    if (body.educationQualification !== undefined) {
      updateData.educationQualification = body.educationQualification;
    }
    if (body.annualFamilyIncome !== undefined) {
      updateData.annualFamilyIncome = body.annualFamilyIncome ? parseFloat(body.annualFamilyIncome) : null;
    }
    if (body.disabilityStatus !== undefined) {
      updateData.disabilityStatus = Boolean(body.disabilityStatus);
    }

    const updatedUser = await prisma.user.update({
      where: { id: demoUser.id },
      data: updateData,
    });

    const profile = await getUserEligibilityProfile(updatedUser.id, prisma);

    return NextResponse.json({
      message: "Citizen profile updated successfully.",
      user: updatedUser,
      profile,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to update citizen profile." },
      { status: 500 }
    );
  }
}

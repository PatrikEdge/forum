export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/getUser";

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const result = await prisma.notification.deleteMany({
      where: { userId: user.id },
    });

    return NextResponse.json({
      success: true,
      deleted: result.count,
    });
  } catch (err) {
    console.error("Notification clear error:", err);
    return NextResponse.json(
      { error: "Nem sikerült törölni az értesítéseket" },
      { status: 500 }
    );
  }
}